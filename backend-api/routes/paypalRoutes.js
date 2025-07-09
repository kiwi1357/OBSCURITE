// backend-api/routes/paypalRoutes.js
const express = require('express');
const router = express.Router();
const { client, paypal } = require('../config/paypal');
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const { createOrder } = require('../services/orderService'); // << IMPORT THE CENTRALIZED SERVICE

// --- PayPal API Routes ---

// POST /api/paypal/create-order
router.post('/create-order', authMiddleware, async (req, res, next) => {
  try {
    const { cart } = req.body;
    if (!cart || !cart.items || cart.items.length === 0 || typeof cart.total !== 'number') {
      return res.status(400).json({ message: 'Valid cart with items and total is required.' });
    }
    const totalAmount = cart.total.toFixed(2);
    const currencyCode = 'EUR';

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currencyCode,
          value: totalAmount,
          breakdown: {
            item_total: { currency_code: currencyCode, value: cart.subtotal.toFixed(2) },
            shipping: { currency_code: currencyCode, value: cart.shippingCost.toFixed(2) },
            discount: { currency_code: currencyCode, value: cart.discountAmount.toFixed(2) }
          }
        },
        items: cart.items.map(item => {
          // Get the English name for PayPal receipt, fallback to first available name
          const itemName = item.name.find(n => n.lang === 'en')?.value || item.name[0]?.value || 'Product Item';
          return {
            name: itemName.substring(0, 127), // PayPal has a 127 char limit
            unit_amount: { currency_code: currencyCode, value: item.price.toFixed(2) },
            quantity: item.quantity.toString(),
            sku: item.sku.substring(0, 127),
          };
        })
      }]
    });
    const order = await client.execute(request);
    res.status(201).json({ orderID: order.result.id });
  } catch (err) {
    console.error("PayPal Create Order Error:", err);
    const statusCode = err.statusCode || 500;
    let errMsg = "Failed to create PayPal order";
    // Try to parse more specific error message from PayPal's response
    if (err.message) { try { const parsed = JSON.parse(err.message); errMsg = parsed.details?.[0]?.description || parsed.message || errMsg; } catch (e) { errMsg = err.message; } }
    res.status(statusCode).json({ message: errMsg, errorDetails: err.data || err });
  }
});

// POST /api/paypal/capture-order
router.post('/capture-order', authMiddleware, async (req, res, next) => {
  const { orderIDFromPayPal, cartForOrder } = req.body;

  if (!orderIDFromPayPal) {
    return res.status(400).json({ message: 'PayPal Order ID is required.' });
  }
  if (!cartForOrder || !cartForOrder.customerDetails || !cartForOrder.shippingInfo) {
    return res.status(400).json({ message: 'Cart details including customer, items, and shipping info are required.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const request = new paypal.orders.OrdersCaptureRequest(orderIDFromPayPal);
    request.requestBody({});
    const capture = await client.execute(request);

    if (capture.result.status !== 'COMPLETED') {
      throw new Error(`PayPal payment capture failed or is not complete. Status: ${capture.result.status}`);
    }

    const paypalTransactionId = capture.result.purchase_units[0].payments.captures[0].id;
    const paymentDetails = {
      paymentMethod: 'paypal',
      transactionId: paypalTransactionId,
      status: 'succeeded',
      paypalOrderId: orderIDFromPayPal,
    };

    // --- THIS IS THE FIX ---
    // Instead of using a spread operator, we explicitly map the properties
    // from the frontend cart to the object the `createOrder` service expects.
    // This correctly maps `cartForOrder.appliedPromo` to `clientAppliedPromo`.
    const internalOrderData = {
        customerDetails: cartForOrder.customerDetails,
        items: cartForOrder.items,
        shippingInfo: cartForOrder.shippingInfo,
        clientAppliedPromo: cartForOrder.appliedPromo, // Explicit mapping
        actualUserId: req.user?._id
    };
    // --- END OF FIX ---

    const savedInternalOrder = await createOrder(internalOrderData, paymentDetails, session);

    await session.commitTransaction();
    res.status(201).json({
      message: 'Payment successful and order created!',
      internalOrderId: savedInternalOrder.customOrderId,
      grandTotal: savedInternalOrder.grandTotal,
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("Capture Order Error:", err.stack || err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || "Failed to process payment after PayPal approval.", errorName: err.name });
  } finally {
    session.endSession();
  }
});

module.exports = router;
