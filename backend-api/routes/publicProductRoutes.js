// backend-api/routes/publicProductRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Helper to get language, can still be useful for other potential non-data-translation logic
const getLanguageFromRequest = (req) => {
  if (req.query.lang && typeof req.query.lang === 'string') {
    return req.query.lang.substring(0, 2).toLowerCase();
  }
  const langHeader = req.headers['accept-language'];
  if (langHeader) {
    return langHeader.split(',')[0].substring(0, 2).toLowerCase();
  }
  return 'en'; // Default to English
};

// GET /api/public/products - Get all active products using aggregation pipeline
router.get('/', async (req, res, next) => {
  try {
    // const lang = getLanguageFromRequest(req); // Not directly used for translating fields here

    const products = await Product.aggregate([
      // Stage 1: Match only active parent products
      { $match: { isActive: true } },

      // Stage 2: Filter active variants
      {
        $addFields: {
          variants: {
            $filter: {
              input: '$variants',
              as: 'variant',
              cond: { $eq: ['$$variant.isActive', true] }
            }
          }
        }
      },

      // Stage 3: Exclude products with no active variants
      { $match: { 'variants.0': { $exists: true } } },

      // Stage 4: Project final fields - SEND FULL TRANSLATION ARRAYS
      {
        $project: {
          _id: 1,
          slug: 1,
          priority: 1,
          createdAt: 1,
          name: '$name', // Send full Translation[] array
          description: '$description', // Send full Translation[] array
          // category: 1, // If frontend needs category details for product cards (e.g. name)
          // brand: 1, // If frontend needs brand details for product cards
          variants: {
            $map: {
              input: '$variants',
              as: 'v',
              in: {
                _id: '$$v._id',
                price: '$$v.price',
                priceOriginal: '$$v.priceOriginal',
                mainImage: { $first: '$$v.images' },
                // colorName becomes color: { name: Translation[], hexCode: string }
                color: { // Nest color details
                  name: '$$v.color.name', // Send full Translation[] array for color name
                  hexCode: '$$v.color.hexCode'
                }
                // sizes: '$$v.sizes' // If needed for quick view or something on the card
              }
            }
          }
        }
      },

      // Stage 5: Sort by priority and creation time
      { $sort: { priority: -1, createdAt: -1 } }
    ]);

    res.json(products);
  } catch (error) {
    console.error('Error fetching public products:', error);
    // Pass to centralized error handler
    next(error);
  }
});

// GET /api/public/products/:slug - Get a single active product by slug
router.get('/:slug', async (req, res, next) => {
  try {
    // const lang = getLanguageFromRequest(req); // Not directly used for translating fields here
    const { slug } = req.params;

    const product = await Product.findOne({ slug, isActive: true })
      .populate('category', 'name slug') // Populate category with name and slug
      .populate('brand', 'name')        // Populate brand with name
      .lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found or is not available.' });
    }

    const activeVariants = (product.variants || []).filter(v => v.isActive);

    if (activeVariants.length === 0) {
      // This case might be redundant if the aggregation for GET / already filters this,
      // but good for direct slug access.
      return res.status(404).json({ message: 'Product has no available options.' });
    }

    // Frontend will handle translation. Send full arrays.
    const responseProduct = {
      ...product,
      // name: product.name, // Already full array due to .lean()
      // description: product.description, // Already full array
      // Category and Brand names will also be full Translation[] if models are structured so
      // Or if they are single string names, they are fine.
      // For category, if its name is Translation[], it will come as such.
      category: product.category ? {
        ...product.category,
        // name: product.category.name // This will be Translation[] if category model has it
      } : null,
      // brand: product.brand, // This will be string if brand model has it

      variants: activeVariants.map(v => ({
        ...v,
        color: {
          ...v.color,
          name: v.color?.name || [] // Send full Translation[] array for color name
        }
      }))
    };
    // No need for getTranslated helper here anymore for name, description, color.name

    res.json(responseProduct);
  } catch (error) {
    console.error(`Error fetching product with slug ${req.params.slug}:`, error);
    // Pass to centralized error handler
    next(error);
  }
});

module.exports = router;
