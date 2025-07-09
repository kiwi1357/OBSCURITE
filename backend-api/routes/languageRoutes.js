const express = require('express');
const router = express.Router();
const Language = require('../models/Language');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

// A public endpoint to get the list of active languages for forms
router.get('/', async (req, res, next) => {
  try {
    const languages = await Language.find({ isActive: true }).select('name code isDefault').sort({ name: 1 });
    res.json(languages);
  } catch (error) {
    next(error);
  }
});

// --- Admin-only routes below ---

// GET /api/admin/languages - Get all languages for management
router.get('/all', adminOnlyMiddleware, async (req, res, next) => {
  try {
    const languages = await Language.find({}).sort({ name: 1 });
    res.json(languages);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/languages - Create a new language
router.post('/', adminOnlyMiddleware, async (req, res, next) => {
  try {
    const newLanguage = new Language(req.body);
    await newLanguage.save();
    res.status(201).json(newLanguage);
  } catch (error) {
    if (error.code === 11000) {
      const specificError = new Error('A language with this name or code already exists.');
      specificError.statusCode = 409;
      return next(specificError);
    }
    next(error);
  }
});

// PUT /api/admin/languages/:id - Update a language
router.put('/:id', adminOnlyMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, isDefault, isActive } = req.body;

    const updatedLanguage = await Language.findByIdAndUpdate(
      id,
      { name, code, isDefault, isActive },
      { new: true, runValidators: true }
    );

    if (!updatedLanguage) {
      return res.status(404).json({ message: 'Language not found' });
    }
    res.json(updatedLanguage);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/languages/:id - Delete a language
router.delete('/:id', adminOnlyMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const languageToDelete = await Language.findById(id);
    if (!languageToDelete) {
      return res.status(404).json({ message: 'Language not found' });
    }
    if (languageToDelete.isDefault) {
      return res.status(400).json({ message: 'Cannot delete the default language.' });
    }

    await Language.findByIdAndDelete(id);
    res.json({ message: 'Language deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
