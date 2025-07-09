// backend-api/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');
const { createOrder } = require('../services/orderService');

// POST /api/orders - Create a new order (Standard Checkout Flow)
router.post('/', authMiddleware, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const orderData = {
      customerDetails: req.body.customerDetails,
      items: req.body.items,
      shippingInfo: req.body.shippingInfo,
      clientAppliedPromo: req.body.clientAppliedPromo,
      actualUserId: req.user?._id
    };
    const paymentDetails = { paymentMethod: 'Standard Checkout', status: 'Pending Payment' };
    const savedOrder = await createOrder(orderData, paymentDetails, session);
    await session.commitTransaction();
    res.status(201).json({
      message: 'Order created successfully!',
      orderId: savedOrder.customOrderId,
      grandTotal: savedOrder.grandTotal,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('Error creating standard order:', error);
    next(error);
  } finally {
    session.endSession();
  }
});

// --- THE FIX: Specific string routes are now defined BEFORE the parameterized route ---

// GET /api/orders/lookup - For guest users to look up their order. Public.
router.get('/lookup', async (req, res, next) => {
  const { orderId, email } = req.query;
  if (!orderId) return res.status(400).json({ message: 'Order ID is required for lookup.' });
  if (!email) return res.status(400).json({ message: 'Email address is required for lookup verification.' });
  try {
    const queryCriteria = {
      customOrderId: String(orderId).trim(),
      'customerDetails.email': String(email).toLowerCase().trim()
    };
    const order = await Order.findOne(queryCriteria).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found or your identifying information does not match.' });
    }
    res.json(order);
  } catch (error) { next(error); }
});

// GET /api/orders/my-orders - For logged-in users to get their history. Protected.
router.get('/my-orders', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required to view your orders.' });
    }
    const orders = await Order.find({ userId: req.user._id }).sort({ orderDate: -1 }).lean();
    res.json(orders);
  } catch (error) { next(error); }
});

// --- END OF FIX ---

// GET /api/orders/:customOrderIdParam - For logged-in user to get a specific order they own.
// This parameterized route now correctly comes AFTER the specific string routes.
router.get('/:customOrderIdParam', authMiddleware, async (req, res, next) => {
  try {
    const { customOrderIdParam } = req.params;
    const order = await Order.findOne({
      customOrderId: customOrderIdParam,
      userId: req.user._id // Ensures user can only access their own orders
    }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found or you do not have permission to view it.' });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});


// --- ADMIN ORDER ROUTES (Their order does not conflict) ---
router.get('/admin/all', adminOnlyMiddleware, async (req, res, next) => {
  try {
    const orders = await Order.find({}).sort({ orderDate: -1 }).lean();
    res.json(orders);
  } catch (error) { next(error); }
});

router.put('/admin/:customOrderIdParam/status', adminOnlyMiddleware, async (req, res, next) => {
  const { status } = req.body;
  const { customOrderIdParam } = req.params;
  const allowedStatuses = ['Pending Payment', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded', 'Failed'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status value. Allowed: ${allowedStatuses.join(', ')}.` });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ customOrderId: customOrderIdParam }).session(session);
    if (!order) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: 'Order not found for status update.' });
    }

    const oldStatus = order.status;
    const isNowCancelledOrRefunded = status === 'Cancelled' || status === 'Refunded';
    const wasPreviouslyCancelledOrRefunded = oldStatus === 'Cancelled' || oldStatus === 'Refunded';

    if (isNowCancelledOrRefunded && !wasPreviouslyCancelledOrRefunded) {
      const Product = mongoose.model('Product');
      const stockRefundUpdates = order.items.map(item => ({
        updateOne: {
          filter: { _id: item.productId, 'variants._id': item.variantId, 'variants.sizes.sku': item.sku },
          update: { $inc: { 'variants.$[v].sizes.$[s].stock': item.quantity } },
          arrayFilters: [{ 'v._id': item.variantId }, { 's.sku': item.sku }]
        }
      }));
      if (stockRefundUpdates.length > 0) {
        await Product.bulkWrite(stockRefundUpdates, { session });
      }
    }

    order.status = status;
    const updatedOrder = await order.save({ session });
    await session.commitTransaction();
    res.json(updatedOrder);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});


module.exports = router;
