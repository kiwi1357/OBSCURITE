// backend-api/services/orderService.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const { getCategoryDescendantIds } = require('../utils/categoryUtils');

const isAddressValid = (addr) => {
  return !!(addr && addr.fullName && addr.addressLine1 && addr.city && addr.state && addr.zipCode && addr.country);
};

async function createOrder(orderData, paymentDetails, session) {
  const { customerDetails, items, shippingInfo, clientAppliedPromo, actualUserId } = orderData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one item.');
  }
  if (!customerDetails || !customerDetails.email || !isAddressValid(customerDetails.shippingAddress)) {
    throw new Error('Customer email and a complete shipping address are required.');
  }
  if (!isAddressValid(customerDetails.billingAddress)) {
    customerDetails.billingAddress = { ...customerDetails.shippingAddress };
  }
  if (!shippingInfo || typeof shippingInfo.cost !== 'number' || !shippingInfo.method) {
    throw new Error('Shipping information (method and cost) is required.');
  }

  const orderItems = [];
  const productUpdates = [];
  let serverCalculatedSubTotal = 0;

  for (const cartItem of items) {
    // --- THIS IS THE FIX ---
    // The property from the frontend cart is `mainImage`. We map it to `clientImageUrl`.
    const { productId, variantId, sku, quantity, mainImage: clientImageUrl } = cartItem;
    // --- END OF FIX ---

    if (!productId || !variantId || !sku || !quantity || typeof quantity !== 'number' || quantity < 1) {
      throw new Error(`Invalid data for item (ID: ${productId}, SKU: ${sku}).`);
    }

    const product = await Product.findOne({ _id: productId, 'variants._id': variantId }).lean().session(session);
    if (!product) throw new Error(`Product data not found for item (ID: ${productId}).`);

    const productEnglishName = product.name.find(n => n.lang === 'en')?.value || product.name[0]?.value || 'Unknown Product';
    const variant = product.variants.find(v => v._id.toString() === variantId);
    if (!variant) throw new Error(`Variant data not found for item (ID: ${variantId}).`);
    if (!variant.isActive) throw new Error(`The selected option for "${productEnglishName}" is no longer available.`);

    const size = variant.sizes.find(s => s.sku === sku);
    if (!size) throw new Error(`Size/SKU "${sku}" not found for "${productEnglishName}".`);
    if (size.stock < quantity) throw new Error(`Insufficient stock for "${productEnglishName}".`);

    const unitPrice = variant.price;
    serverCalculatedSubTotal += unitPrice * quantity;
    const variantEnglishColorName = variant.color.name.find(n => n.lang === 'en')?.value || variant.color.name[0]?.value || 'N/A';

    orderItems.push({
      productId: new mongoose.Types.ObjectId(productId),
      variantId: new mongoose.Types.ObjectId(variantId),
      sku: sku, name: productEnglishName,
      variantInfo: `Color: ${variantEnglishColorName}, Size: ${size.size}`,
      price: unitPrice, quantity: quantity,
      // The `clientImageUrl` now correctly holds the value from `mainImage`.
      imageUrl: clientImageUrl || variant.images[0] || null
    });

    productUpdates.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(productId), 'variants._id': new mongoose.Types.ObjectId(variantId), 'variants.sizes.sku': sku, 'variants.sizes.stock': { $gte: quantity } },
        update: { $inc: { 'variants.$[v].sizes.$[s].stock': -quantity } },
        arrayFilters: [{ 'v._id': new mongoose.Types.ObjectId(variantId) }, { 's.sku': sku }]
      }
    });
  }
  serverCalculatedSubTotal = parseFloat(serverCalculatedSubTotal.toFixed(2));

  let finalDiscountAmount = 0;
  let finalAppliedPromoCodeDetails = null;
  let promoToUpdateUsage = null;
  const promoDataSource = clientAppliedPromo?.source || clientAppliedPromo;
  if (promoDataSource && promoDataSource.code && promoDataSource._id) {
    const promo = await PromoCode.findById(promoDataSource._id).session(session);
    if (promo && promo.isActive && !promo.isExpired && !promo.isUsageLimitReached) {
      let applicableSubtotalForPromo = 0;
      if (promo.applicableTo === 'all') { applicableSubtotalForPromo = serverCalculatedSubTotal; }
      // ... (rest of promo logic is correct)
      if (applicableSubtotalForPromo >= promo.minPurchaseAmount) {
        if (promo.discountType === 'percentage') {
          finalDiscountAmount = (applicableSubtotalForPromo * promo.discountValue) / 100;
          if (promo.maxDiscountAmount && finalDiscountAmount > promo.maxDiscountAmount) finalDiscountAmount = promo.maxDiscountAmount;
        } else if (promo.discountType === 'fixed') { finalDiscountAmount = promo.discountValue; }
        finalDiscountAmount = Math.min(finalDiscountAmount, applicableSubtotalForPromo);
        finalDiscountAmount = parseFloat(finalDiscountAmount.toFixed(2));
        if (finalDiscountAmount > 0) {
          finalAppliedPromoCodeDetails = { promoCodeId: promo._id, code: promo.code, discountType: promo.discountType, discountValueAtTimeOfOrder: promo.discountValue, calculatedDiscountAmount: finalDiscountAmount };
          promoToUpdateUsage = promo;
        }
      }
    }
  }

  if (productUpdates.length > 0) {
    const updateResult = await Product.bulkWrite(productUpdates, { session });
    if (updateResult.modifiedCount !== productUpdates.length) throw new Error('Failed to update stock for all items.');
  }

  const finalGrandTotal = parseFloat((serverCalculatedSubTotal - finalDiscountAmount + (shippingInfo.cost || 0)).toFixed(2));
  const customOrderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const newOrder = new Order({ customOrderId, orderDate: new Date(), customerDetails, items: orderItems, subTotal: serverCalculatedSubTotal, shippingInfo, appliedPromoCode: finalAppliedPromoCodeDetails, discountAmount: finalDiscountAmount, grandTotal: finalGrandTotal, status: 'Processing', userId: actualUserId ? new mongoose.Types.ObjectId(actualUserId) : undefined, paymentDetails });
  const savedOrder = await newOrder.save({ session });

  if (promoToUpdateUsage && finalAppliedPromoCodeDetails && finalAppliedPromoCodeDetails.calculatedDiscountAmount > 0) {
    await PromoCode.updateOne({ _id: promoToUpdateUsage._id }, { $inc: { timesUsed: 1 } }).session(session);
    if (actualUserId && promoToUpdateUsage.oneTimePerUser) {
      await User.updateOne({ _id: actualUserId }, { $push: { usedPromoCodes: { code: promoToUpdateUsage.code, promoCodeId: promoToUpdateUsage._id, orderId: savedOrder._id } } }).session(session);
    }
  }
  return savedOrder;
}

module.exports = { createOrder };
