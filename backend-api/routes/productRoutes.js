// backend-api/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

// All routes in this file are protected by the adminOnlyMiddleware
router.use(adminOnlyMiddleware);

// POST /api/admin/products - Create a new product with variants
router.post('/', async (req, res, next) => {
  try {
    const productData = req.body;

    // Correct validation for the dynamic language model
    if (!productData.name || !Array.isArray(productData.name) || productData.name.length === 0) {
      return res.status(400).json({ message: 'Product name data is missing or malformed.' });
    }
    const englishName = productData.name.find(n => n.lang === 'en');
    if (!englishName || !englishName.value || englishName.value.trim() === '') {
      return res.status(400).json({ message: 'Product name (English) is required.' });
    }
    if (!productData.category) {
      return res.status(400).json({ message: 'Category is required.' });
    }

    const newProduct = new Product(productData);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);

  } catch (error) {
    next(error);
  }
});

// GET /api/admin/products - Get all products (for admin list view) with pagination
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {}; // Can be expanded for filtering later

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select('name slug isActive priority variants createdAt')
      .sort({ priority: -1, createdAt: -1 })
      .populate('category', 'name')
      .populate('brand', 'name')
      .skip(skip)
      .limit(limit)
      .lean();

    const getEnglishValue = (translations) => {
      if (!translations || translations.length === 0) return 'Unnamed';
      const en = translations.find(t => t.lang === 'en');
      return en && en.value ? en.value : (translations[0]?.value || 'Unnamed');
    };

    const shapedProducts = products.map(p => ({
      ...p,
      name: getEnglishValue(p.name),
      categoryName: p.category ? getEnglishValue(p.category.name) : 'N/A',
      brandName: p.brand ? p.brand.name : 'N/A',
      variantsCount: p.variants.length,
    }));

    res.json({
      data: shapedProducts,
      pagination: {
        totalItems: totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: page,
        pageSize: limit
      }
    });
  } catch (error) {
    next(error);
  }
});


// GET /api/admin/products/:id - Get a single product by ID (for admin editing)
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/products/:id - Update a whole product (ideal for form submissions)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }

    const productData = req.body;

    if (!productData.name || !Array.isArray(productData.name) || productData.name.length === 0) {
      return res.status(400).json({ message: 'Product name data is missing or malformed.' });
    }
    const englishName = productData.name.find(n => n.lang === 'en');
    if (!englishName || !englishName.value || englishName.value.trim() === '') {
      return res.status(400).json({ message: 'Product name (English) is required.' });
    }
    if (!productData.category) {
      return res.status(400).json({ message: 'Category is required.' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, productData, {
      new: true,
      runValidators: true,
      overwrite: true // Be careful: this replaces the whole document
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found for update' });
    }

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
});


// --- GRANULAR UPDATE AND DELETE ENDPOINTS ---

// POST /api/admin/products/:id/variants - Add a new variant to a product
router.post('/:id/variants', async (req, res, next) => {
  try {
    const { id } = req.params;
    const variantData = req.body;
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $push: { variants: variantData } },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    res.status(201).json(updatedProduct.variants[updatedProduct.variants.length - 1]); // Return just the new variant
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/products/:id/variants/:variantId - Update a specific variant's info
router.put('/:id/variants/:variantId', async (req, res, next) => {
  try {
    const { id, variantId } = req.params;
    const variantData = req.body;
    const updatePayload = {};
    for (const key in variantData) {
      updatePayload[`variants.$.${key}`] = variantData[key];
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, 'variants._id': variantId },
      { $set: updatePayload },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: 'Product or variant not found' });
    const updatedVariant = updatedProduct.variants.find(v => v._id.toString() === variantId);
    res.json(updatedVariant);
  } catch (error) {
    next(error);
  }
});


// PATCH /api/admin/products/:productId/variants/:variantId/stock - Update stock for a specific SKU
router.patch('/:productId/variants/:variantId/stock', async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    const { sku, change } = req.body; // e.g., { sku: "TS-BLK-M", change: 10 } or { sku: "TS-BLK-M", change: -5 }

    if (!sku || typeof change !== 'number') {
      return res.status(400).json({ message: 'SKU and a numeric stock change are required.' });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        'variants._id': variantId,
        'variants.sizes.sku': sku
      },
      { $inc: { 'variants.$[v].sizes.$[s].stock': change } },
      {
        arrayFilters: [{ 'v._id': variantId }, { 's.sku': sku }],
        new: true,
        runValidators: true
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Could not find product, variant, or SKU to update.' });
    }

    res.json({ message: 'Stock updated successfully.', product: updatedProduct });

  } catch (error) {
    next(error);
  }
});


// DELETE /api/admin/products/:id/variants/:variantId - Delete a specific variant
router.delete('/:id/variants/:variantId', async (req, res, next) => {
  try {
    const { id, variantId } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $pull: { variants: { _id: variantId } } },
      { new: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/products/:id - Delete a whole product
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found for deletion' });
    }
    res.json({ message: 'Product deleted successfully', productId: product._id });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
