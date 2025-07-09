// backend-api/routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const BaseColor = require('../models/BaseColor');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const Lookbook = require('../models/Lookbook');
const mongoose = require('mongoose');

router.get('/', async (req, res, next) => {
  try {
    const {
      q, category, brand, sizes, colors,
      minPrice, maxPrice, sortBy = 'priority', sortOrder = 'desc',
      page = 1, limit = 12,
      // lang = 'en', // Not directly used for translating fields here
      collectionType, // for "sale" etc.
      collection // alias for lookbook, common in some systems
    } = req.query;

    const { ObjectId } = mongoose.Types;

    const allowedSortBy = ['priority', 'createdAt', 'price'];
    const finalSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'priority';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const pipeline = [];

    // --- Combined initial match stage ---
    const initialMatch = { isActive: true };

    const lookbookSlug = req.query.lookbook || collection;
    if (lookbookSlug) {
      const lookbook = await Lookbook.findOne({ slug: lookbookSlug, isActive: true }, { products: 1 }).lean();
      if (!lookbook || !lookbook.products || lookbook.products.length === 0) {
        return res.json({ data: [], facets: {}, pagination: { totalItems: 0, totalPages: 0, currentPage: 1 } });
      }
      initialMatch._id = { $in: lookbook.products.map(id => new ObjectId(id)) }; // Ensure ObjectIds
    }

    const rootOrConditions = [];
    let brandIdsForQuery = [], categoryIdsForQuery = [], colorIdsForQuery = [];

    if (q) {
      [brandIdsForQuery, categoryIdsForQuery, colorIdsForQuery] = await Promise.all([
        Brand.find({ name: new RegExp(q, 'i') }).select('_id').lean(),
        Category.find({ 'name.value': new RegExp(q, 'i') }).select('_id').lean(), // Search in translation values
        BaseColor.find({ name: new RegExp(q, 'i') }).select('_id').lean()
      ]);

      rootOrConditions.push({ $text: { $search: q } }); // Uses the text index defined in Product model
      rootOrConditions.push({ tags: q.toLowerCase() });
      if (brandIdsForQuery.length) rootOrConditions.push({ brand: { $in: brandIdsForQuery.map(d => d._id) } });
      if (categoryIdsForQuery.length) rootOrConditions.push({ category: { $in: categoryIdsForQuery.map(d => d._id) } });
      // Color search based on 'q' will be handled at variant level if colorIdsForQuery has items
    }

    if (brand) initialMatch.brand = { $in: brand.split(',').filter(ObjectId.isValid).map(id => new ObjectId(id)) };
    if (category) {
      const categorySlugs = category.split(',');
      // If category is passed as ID strings from frontend (e.g. from CategoryService.getCategoryWithDescendants)
      if (ObjectId.isValid(categorySlugs[0])) {
        initialMatch.category = { $in: categorySlugs.filter(ObjectId.isValid).map(id => new ObjectId(id)) };
      } else {
        // If category is passed as slugs (less likely for direct filter, more for URL routing)
        // This part might need adjustment based on how category filter is actually implemented on frontend
        const categoriesFromSlugs = await Category.find({ slug: { $in: categorySlugs } }).select('_id').lean();
        if (categoriesFromSlugs.length > 0) {
          initialMatch.category = { $in: categoriesFromSlugs.map(c => c._id) };
        } else {
          // No categories found for given slugs, effectively no results for this filter
          initialMatch.category = { $in: [new ObjectId()] }; // Match no documents
        }
      }
    }


    if (rootOrConditions.length > 0) {
      initialMatch.$or = rootOrConditions;
    }
    pipeline.push({ $match: initialMatch });
    // --- End of combined initial match ---

    pipeline.push({ $unwind: '$variants' });

    const variantMatch = { 'variants.isActive': true };

    if (colors) {
      const colorDocs = await BaseColor.find({
        name: { $in: colors.split(',').map(c => c.trim().toLowerCase()) }
      }).select('_id').lean();
      if (colorDocs.length) {
        variantMatch['variants.color.baseColor'] = { $in: colorDocs.map(c => c._id) };
      } else {
        // If color names are provided but none match, effectively filter out all products
        variantMatch['variants.color.baseColor'] = { $in: [new ObjectId()] }; // Match no documents
      }
    } else if (q && colorIdsForQuery.length > 0) { // If 'q' matched some base colors
      variantMatch['variants.color.baseColor'] = { $in: colorIdsForQuery.map(c => c._id) };
    }


    if (minPrice || maxPrice) {
      variantMatch['variants.price'] = {};
      if (minPrice) variantMatch['variants.price'].$gte = parseFloat(minPrice);
      if (maxPrice) variantMatch['variants.price'].$lte = parseFloat(maxPrice);
    }

    if (collectionType === 'sale') {
      variantMatch['variants.priceOriginal'] = { $exists: true, $ne: null }; // Ensure priceOriginal exists
      variantMatch.$expr = { $gt: ['$variants.priceOriginal', '$variants.price'] };
    }

    if (sizes) {
      variantMatch['variants.sizes'] = {
        $elemMatch: {
          size: { $in: sizes.split(',').map(s => s.trim().toUpperCase()) },
          stock: { $gt: 0 } // Also ensure size is in stock
        }
      };
    } else {
      // Default: ensure at least one size in the variant has stock > 0
      variantMatch['variants.sizes'] = { $elemMatch: { stock: { $gt: 0 } } };
    }


    pipeline.push({ $match: variantMatch });

    if (finalSortBy === 'price') {
      pipeline.push({ $sort: { 'variants.price': sortDirection } });
    }

    pipeline.push({
      $facet: {
        paginatedResults: [
          {
            $group: {
              _id: '$_id', // Group by product ID
              doc: { $first: '$$ROOT' }, // Keep the first encountered product document (root)
              // Collect all matching variants for this product
              variants: { $push: '$variants' },
              // For sorting by price, take the price of the first variant encountered for this product
              // (after $unwind and $match, this could be any of its matching variants)
              // If sorting by price, $sort stage earlier handles true variant price sort.
              // This sortPrice here is more for the product-level sort after grouping.
              sortPrice: { $first: '$variants.price' }
            }
          },
          { // Restore the product structure with its collected variants
            $replaceRoot: {
              newRoot: { $mergeObjects: ['$doc', { variants: '$variants', sortPrice: '$sortPrice' }] }
            }
          },
          // Sort the products themselves
          { $sort: { [finalSortBy === 'price' ? 'sortPrice' : finalSortBy]: sortDirection, _id: 1 } },
          { $skip: (parseInt(page, 10) - 1) * parseInt(limit, 10) },
          { $limit: parseInt(limit, 10) },
          { // Project the final shape for product list items
            $project: {
              _id: 1,
              slug: 1,
              name: '$name', // Send full Translation[] array
              // description: '$description', // Usually not needed for product cards
              // category: '$category', // Send full category object if needed for card
              // brand: '$brand', // Send full brand object if needed for card
              variants: { // Shape the variants for the product card
                $map: {
                  input: '$variants', // Use the variants collected in the $group stage
                  as: 'v',
                  in: { // This structure should match frontend ProductCardComponent's expectation
                    _id: '$$v._id',
                    price: '$$v.price',
                    priceOriginal: '$$v.priceOriginal',
                    mainImage: { $ifNull: [{ $first: '$$v.images' }, null] },
                    color: { // Nest color details
                      name: '$$v.color.name', // Send full Translation[] array for color name
                      hexCode: '$$v.color.hexCode'
                    }
                    // sizes: '$$v.sizes' // Only if sizes are needed on the card
                  }
                }
              }
            }
          }
        ],
        totalCount: [
          // To count distinct products after variant filtering
          { $group: { _id: '$_id' } },
          { $count: 'count' }
        ],
        brands: [
          // Facet for Brands: Count distinct products per brand
          { $group: { _id: '$brand', productIds: { $addToSet: '$_id' } } }, // Group by brand, collect unique product IDs
          { $project: { _id: 1, count: { $size: '$productIds' } } }, // Count products
          { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'info' } },
          { $match: { info: { $ne: [] } } },
          { $replaceRoot: { newRoot: { $mergeObjects: [{ _id: '$_id', count: '$count' }, { $first: '$info' }] } } },
          { $project: { _id: 1, name: 1, count: 1 } }, // name is single string here
          { $sort: { name: 1 } }
        ],
        categories: [
          // Facet for Categories: Count distinct products per category
          { $group: { _id: '$category', productIds: { $addToSet: '$_id' } } }, // Group by category, collect unique product IDs
          { $project: { _id: 1, count: { $size: '$productIds' } } }, // Count products
          { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'info' } },
          { $match: { info: { $ne: [] } } },
          { $replaceRoot: { newRoot: { $mergeObjects: [{ _id: '$_id', count: '$count' }, { $first: '$info' }] } } },
          {
            $project: {
              _id: 1,
              count: 1,
              name: '$name', // Send full Translation[] array for category name
              slug: '$slug'
            }
          },
          // Sorting by an array field needs to be handled carefully, or sort by slug/default lang
          { $sort: { 'slug': 1 } } // Sort by slug for consistency
        ],
        colors: [
          // Facet for Colors: Count distinct products per baseColor
          { $group: { _id: '$variants.color.baseColor', productIds: { $addToSet: '$_id' } } },
          { $project: { _id: 1, count: { $size: '$productIds' } } },
          { $lookup: { from: 'basecolors', localField: '_id', foreignField: '_id', as: 'info' } },
          { $match: { info: { $ne: [] } } },
          { $replaceRoot: { newRoot: { $mergeObjects: [{ _id: '$_id', count: '$count' }, { $first: '$info' }] } } },
          { $project: { _id: 1, name: 1, count: 1, hexCode: 1 } }, // name is single string here
          { $sort: { name: 1 } }
        ],
        sizes: [
          // Facet for Sizes: Count distinct products per available size
          { $unwind: '$variants.sizes' },
          { $match: { 'variants.sizes.stock': { $gt: 0 } } }, // Only count sizes that are in stock
          { $group: { _id: '$variants.sizes.size', productIds: { $addToSet: '$_id' } } },
          { $project: { _id: 0, name: '$_id', count: { $size: '$productIds' } } },
          { $sort: { name: 1 } }
        ],
        priceRange: [
          { $group: { _id: null, min: { $min: '$variants.price' }, max: { $max: '$variants.price' } } }
        ],
      }
    });

    const results = await Product.aggregate(pipeline).exec();
    const result = results[0] || {};

    const data = result.paginatedResults || [];
    // The totalCount facet now correctly counts distinct products
    const totalItems = result.totalCount && result.totalCount[0] ? result.totalCount[0].count : 0;

    const facets = {
      brands: result.brands || [],
      categories: result.categories || [], // Will contain full Translation[] for name
      colors: result.colors || [],
      sizes: result.sizes || [],
      priceRange: result.priceRange?.[0] || { min: 0, max: 0 }
    };

    res.json({
      data,
      facets,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / parseInt(limit, 10)),
        currentPage: parseInt(page, 10)
      }
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
