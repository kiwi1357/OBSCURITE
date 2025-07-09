// backend-api/routes/lookbookRoutes.js
const express = require('express');
const router = express.Router();
const Lookbook = require('../models/Lookbook');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

// --- Public Routes ---

// GET /api/lookbooks - Get all active lookbooks (e.g., for a "Collections" page)
router.get('/', async (req, res, next) => {
  try {
    // const lang = req.query.lang || 'en'; // No longer needed for direct translation here
    const lookbooks = await Lookbook.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .lean(); // .lean() is good for performance when not modifying

    // The frontend will now handle translation from the full arrays
    const preparedLookbooks = lookbooks.map(lb => ({
      _id: lb._id,
      title: lb.title, // Send full array
      description: lb.description, // Send full array
      slug: lb.slug,
      bannerImage: lb.bannerImage
      // products are not typically sent in the list view for performance
    }));

    res.json(preparedLookbooks);
  } catch (error) {
    next(error);
  }
});

// GET /api/lookbooks/:slug - Get a single lookbook with its populated products
router.get('/:slug', async (req, res, next) => {
  try {
    const lang = req.query.lang || 'en'; // Keep lang for legacy or non-data specific uses if any
    const lookbook = await Lookbook.findOne({ slug: req.params.slug, isActive: true })
      .populate({
        path: 'products',
        match: { isActive: true }, // Only populate active products
        // Select all necessary fields from products and their variants for shaping
        select: 'name slug variants category brand isActive',
      })
      .lean();

    if (!lookbook) {
      return res.status(404).json({ message: 'Lookbook not found.' });
    }

    // lookbook.title and lookbook.description are already Translation[] due to .lean() and model structure

    // Filter out any products that might have been nulled by the population match (if isActive was false)
    // And then correctly shape the remaining products for the carousel
    lookbook.products = (lookbook.products || [])
      .filter(p => p !== null && p.variants && p.variants.length > 0) // Ensure product and variants exist
      .map(p => {
        // Find the first active variant for the card/carousel display
        const activeVariant = p.variants.find(v => v.isActive);
        if (!activeVariant) return null; // If no active variant, exclude this product from this specific lookbook view

        return {
          _id: p._id,
          slug: p.slug,
          name: p.name, // Send full Translation[] array
          // For the lookbook carousel, we typically show one variant's details
          variants: [{ // We shape it to match the ProductCardComponent's expected simplified variant
            _id: activeVariant._id,
            price: activeVariant.price,
            priceOriginal: activeVariant.priceOriginal,
            mainImage: activeVariant.images[0] || null,
            // colorName becomes color: { name: Translation[], hexCode: string }
            color: {
              name: activeVariant.color.name, // Send full Translation[] array for color name
              hexCode: activeVariant.color.hexCode
            }
          }]
        };
      }).filter(p => p !== null); // Remove any products that ended up null

    res.json(lookbook); // Send the lookbook object with title/description and product names/color names as arrays
  } catch (error) {
    next(error);
  }
});

// --- Admin Routes ---
router.use('/admin', adminOnlyMiddleware); // Apply middleware only to admin routes

router.get('/admin', async (req, res, next) => {
  try {
    const lookbooks = await Lookbook.find({}).sort({ priority: -1 });
    res.json(lookbooks);
  } catch (error) {
    next(error);
  }
});

router.post('/admin', async (req, res, next) => {
  try {
    const newLookbook = new Lookbook(req.body);
    await newLookbook.save();
    res.status(201).json(newLookbook);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({ message: 'A lookbook with this slug already exists. Please choose a different title or manually adjust the slug.' });
    }
    next(error);
  }
});

router.put('/admin/:id', async (req, res, next) => {
  try {
    const updatedLookbook = await Lookbook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedLookbook) return res.status(404).json({ message: 'Lookbook not found.' });
    res.json(updatedLookbook);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({ message: 'A lookbook with this slug already exists. Please choose a different title or manually adjust the slug.' });
    }
    next(error);
  }
});

router.delete('/admin/:id', async (req, res, next) => {
  try {
    const deletedLookbook = await Lookbook.findByIdAndDelete(req.params.id);
    if (!deletedLookbook) return res.status(404).json({ message: 'Lookbook not found.' });
    res.json({ message: 'Lookbook deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
