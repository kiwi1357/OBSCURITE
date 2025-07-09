// backend-api/routes/adminPromoCodeRoutes.js
const express = require('express');
const router = express.Router();
const PromoCode = require('../models/PromoCode');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

router.use(adminOnlyMiddleware);

// GET all promo codes
router.get('/', async (req, res, next) => {
  try {
    const codes = await PromoCode.find({}).sort({ createdAt: -1 });
    res.json(codes);
  } catch (error) {
    next(error);
  }
});

// POST create a new promo code
router.post('/', async (req, res, next) => {
  try {
    const { code, description, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, startDate, endDate, usageLimitTotal, oneTimePerUser, isActive, applicableTo, applicableProductIds, applicableCategoryIds } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'Code, discountType, and discountValue are required.' });
    }

    const newPromoCode = new PromoCode({
      code: code.toUpperCase(), description, discountType, discountValue, minPurchaseAmount, maxDiscountAmount, startDate, endDate, usageLimitTotal, oneTimePerUser, isActive, applicableTo, applicableProductIds, applicableCategoryIds
    });
    await newPromoCode.save();
    res.status(201).json(newPromoCode);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Promo code already exists.' });
    }
    next(error);
  }
});

// GET a single promo code
router.get('/:id', async (req, res, next) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promo code not found.' });
    res.json(promo);
  } catch (error) {
    next(error);
  }
});


// PUT update a promo code
router.put('/:id', async (req, res, next) => {
  try {
    const updatedPromoCode = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedPromoCode) {
      return res.status(404).json({ message: 'Promo code not found.' });
    }
    res.json(updatedPromoCode);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Promo code (if changed) already exists.' });
    }
    next(error);
  }
});

// DELETE a promo code
router.delete('/:id', async (req, res, next) => {
  try {
    // Consider if a promo code that has been used should be deletable or just deactivated
    const deletedPromoCode = await PromoCode.findByIdAndDelete(req.params.id);
    if (!deletedPromoCode) {
      return res.status(404).json({ message: 'Promo code not found.' });
    }
    res.json({ message: 'Promo code deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
