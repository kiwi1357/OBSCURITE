// backend-api/routes/publicPromoCodeRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const Product = require('../models/Product');
const { getCategoryDescendantIds } = require('../utils/categoryUtils'); // << IMPORT FROM CENTRALIZED UTIL
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/public/promocode/validate
router.post('/validate', authMiddleware, async (req, res, next) => {
  try {
    const { code, cartItems } = req.body;
    const userId = req.user?._id;

    if (!code || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ message: 'Promo code and cart items are required.' });
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() });

    if (!promo) return res.status(404).json({ message: 'Promo code not found.' });
    if (!promo.isActive) return res.status(400).json({ message: 'This promo code is not active.' });
    if (promo.isExpired) return res.status(400).json({ message: 'This promo code has expired.' }); // Using virtual
    if (promo.isUsageLimitReached) return res.status(400).json({ message: 'This promo code has reached its usage limit.' }); // Using virtual

    if (promo.oneTimePerUser && userId) {
      const user = await User.findById(userId).select('usedPromoCodes').lean();
      if (user && user.usedPromoCodes.some(pc => pc.promoCodeId.toString() === promo._id.toString())) {
        return res.status(400).json({ message: 'You have already used this promo code.' });
      }
    }

    let applicableSubtotal = 0;
    if (promo.applicableTo === 'all') {
      applicableSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    } else {
      if (promo.applicableTo === 'specificProducts') {
        if (!promo.applicableProductIds || promo.applicableProductIds.length === 0) {
          return res.status(400).json({ message: `Promo code "${promo.code}" is misconfigured.` });
        }
        const applicablePromoProductIds = promo.applicableProductIds.map(id => id.toString());
        cartItems.forEach(item => {
          if (item.productId && applicablePromoProductIds.includes(item.productId.toString())) {
            applicableSubtotal += item.price * item.quantity;
          }
        });
      } else if (promo.applicableTo === 'specificCategories') {
        if (!promo.applicableCategoryIds || promo.applicableCategoryIds.length === 0) {
          return res.status(400).json({ message: `Promo code "${promo.code}" is misconfigured.` });
        }
        const allApplicableCategoryIds = await getCategoryDescendantIds(promo.applicableCategoryIds.map(id => id.toString()));
        for (const item of cartItems) {
          if (item.productId) {
            const product = await Product.findById(item.productId.toString()).select('category').lean();
            if (product && product.category && allApplicableCategoryIds.includes(product.category.toString())) {
              applicableSubtotal += item.price * item.quantity;
            }
          }
        }
      }
      if (applicableSubtotal === 0) return res.status(400).json({ message: `Promo code "${promo.code}" is not applicable to any items in your cart.` });
    }

    if (applicableSubtotal < promo.minPurchaseAmount) {
      return res.status(400).json({ message: `A minimum purchase of ${promo.minPurchaseAmount.toFixed(2)} € on applicable items is required.` });
    }

    res.json({
      _id: promo._id.toString(),
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minPurchaseAmount: promo.minPurchaseAmount,
      maxDiscountAmount: promo.maxDiscountAmount,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
