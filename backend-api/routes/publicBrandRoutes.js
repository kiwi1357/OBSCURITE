// backend-api/routes/publicBrandRoutes.js
const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');

// GET /api/public/brands - Get all brands for public view (e.g., filter sidebar)
router.get('/', async (req, res, next) => {
  try {
    const brands = await Brand.find({}).sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    // Pass error to the centralized error handler
    next(error);
  }
});

module.exports = router;
