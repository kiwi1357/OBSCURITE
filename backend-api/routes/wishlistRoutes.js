// backend-api/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Protect all routes in this file
router.use(authMiddleware);

// GET /api/wishlist - Get the user's full wishlist with populated product details
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'wishlist',
        // Select only the fields needed for a product card view
        select: 'name slug variants',
        // Optionally filter out inactive products from the wishlist view
        match: { isActive: true },
        // Populate the baseColor within the variants
        populate: {
          path: 'variants.color.baseColor',
          model: 'BaseColor'
        }
      })
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // The backend now shapes the product data into the `ProductCard` format the frontend expects,
    // making the frontend's job much simpler.
    const shapedWishlist = (user.wishlist || [])
      .filter(product => product && product.variants && product.variants.length > 0) // Filter out null products if match fails
      .map(product => {
        // Find the first active variant to display on the card
        const activeVariant = product.variants.find(v => v.isActive);
        if (!activeVariant) return null; // Exclude product if no active variant is found

        return {
          _id: product._id,
          slug: product.slug,
          name: product.name, // Send full Translation[] array
          // Shape the variant to match the `ProductCardVariant` interface on the frontend
          variants: [{
            _id: activeVariant._id,
            price: activeVariant.price,
            priceOriginal: activeVariant.priceOriginal,
            mainImage: activeVariant.images[0] || null,
            color: {
              name: activeVariant.color.name,
              hexCode: activeVariant.color.hexCode
            }
          }]
        };
      }).filter(p => p !== null); // Clean up any nulls from the previous step

    res.json(shapedWishlist);
  } catch (error) {
    next(error);
  }
});

// GET /api/wishlist/ids - Get only the product IDs in the user's wishlist
router.get('/ids', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('wishlist').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user.wishlist || []);
  } catch (error) {
    next(error);
  }
});


// POST /api/wishlist - Add a product to the wishlist
router.post('/', async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid Product ID is required.' });
    }

    // Use $addToSet to prevent duplicates automatically
    const updatedUser = await User.findByIdAndUpdate(req.user.id,
      { $addToSet: { wishlist: productId } },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Product added to wishlist.', wishlist: updatedUser.wishlist });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/wishlist/:productId - Remove a product from the wishlist
router.delete('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid Product ID is required.' });
    }

    // Use $pull to remove the item from the array
    const updatedUser = await User.findByIdAndUpdate(req.user.id,
      { $pull: { wishlist: productId } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Product removed from wishlist.', wishlist: updatedUser.wishlist });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
