// backend-api/routes/publicCategoryRoutes.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// const getLanguageFromRequest = (req) => { // No longer needed for direct translation here
//   return req.query.lang || 'en';
// };

router.get('/', async (req, res, next) => {
  try {
    // const lang = getLanguageFromRequest(req); // Not used for translation now
    const categories = await Category.find({}).sort({ 'name.value': 1 }).lean(); // Sorting by 'name.value' might need to target a specific lang e.g. 'name.0.value' or rely on default sort if name is an array

    // The frontend will now handle translation from the full arrays
    const preparedCategories = categories.map(cat => ({
      _id: cat._id,
      name: cat.name, // Send full Translation[] array
      slug: cat.slug,
      parentCategory: cat.parentCategory,
      image: cat.image
      // Any other fields needed by the frontend that are not multilingual
    }));

    res.json(preparedCategories);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
