// backend-api/routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

router.use(adminOnlyMiddleware);

// GET /api/admin/brands
router.get('/', async (req, res, next) => {
  try {
    const brands = await Brand.find({}).sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/brands
router.post('/', async (req, res, next) => {
  try {
    const newBrand = new Brand(req.body);
    await newBrand.save();
    res.status(201).json(newBrand);
  } catch (error) {
    if (error.code === 11000) {
      // You can still handle specific errors before passing them on
      const specificError = new Error('A brand with this name already exists.');
      specificError.statusCode = 409;
      return next(specificError);
    }
    next(error);
  }
});

// You would add PUT /:id and DELETE /:id here as well, using next(error) in their catch blocks.

module.exports = router;
