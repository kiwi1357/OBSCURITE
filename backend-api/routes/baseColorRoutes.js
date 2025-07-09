// backend-api/routes/baseColorRoutes.js
const express = require('express');
const router = express.Router();
const BaseColor = require('../models/BaseColor');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

// --- Public Route ---
// GET /api/public/colors - Get all base colors for filter sidebars
router.get('/public', async (req, res, next) => {
  try {
    const colors = await BaseColor.find({}).sort({ name: 1 });
    res.json(colors);
  } catch (error) {
    next(error);
  }
});

// --- Admin-only routes below ---
router.use(adminOnlyMiddleware); // Apply middleware to all subsequent routes in this file

// GET /api/admin/colors - Get all base colors for management
router.get('/admin', async (req, res, next) => {
  try {
    const colors = await BaseColor.find({}).sort({ name: 1 });
    res.json(colors);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/colors - Create a new base color
router.post('/admin', async (req, res, next) => {
  try {
    const { name, hexCode } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Color name is required.' });
    }
    const newColor = new BaseColor({ name, hexCode });
    await newColor.save();
    res.status(201).json(newColor);
  } catch (error) {
    if (error.code === 11000) {
      const specificError = new Error('A base color with this name already exists.');
      specificError.statusCode = 409;
      return next(specificError);
    }
    next(error);
  }
});

// PUT /api/admin/colors/:id - Update a base color
router.put('/admin/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, hexCode } = req.body;
    const updatedColor = await BaseColor.findByIdAndUpdate(
      id,
      { name, hexCode },
      { new: true, runValidators: true }
    );
    if (!updatedColor) {
      return res.status(404).json({ message: 'Color not found.' });
    }
    res.json(updatedColor);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/colors/:id - Delete a base color
router.delete('/admin/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Optional: Add a check to prevent deleting a color if it's in use by any product.
    // This is an advanced step, but good for data integrity.
    // const productsUsingColor = await Product.countDocuments({ 'variants.color.baseColor': id });
    // if (productsUsingColor > 0) {
    //   return res.status(400).json({ message: 'Cannot delete color as it is currently in use by products.' });
    // }

    const deletedColor = await BaseColor.findByIdAndDelete(id);
    if (!deletedColor) {
      return res.status(404).json({ message: 'Color not found.' });
    }
    res.json({ message: 'Base color deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
