// backend-api/models/Product.js
const mongoose = require('mongoose');
const BaseColor = require('./BaseColor'); // Import the new model

// --- Reusable Translation Schema ---
const translationSchema = new mongoose.Schema({
  lang: { type: String, required: true, trim: true, lowercase: true },
  value: { type: String, required: true, trim: true }
}, { _id: false });

// --- Size Schema ---
const sizeSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true, uppercase: true },
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative.'],
    default: 0
  },
  sku: {
    type: String,
    required: [true, 'SKU is required for each size variant.'],
    trim: true,
    unique: true,
    sparse: true
  }
}, { _id: false });

// --- Variant Schema ---
const variantSchema = new mongoose.Schema({
  color: {
    name: [translationSchema],
    hexCode: { type: String, trim: true },
    // --- UPDATED FIELD ---
    baseColor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseColor', // Reference the new model
      required: [true, 'A base color family is required for filtering.']
    }
  },
  price: {
    type: Number,
    required: [true, 'Variant price is required.'],
    min: [0, 'Price cannot be negative.']
  },
  priceOriginal: {
    type: Number,
    min: [0, 'Original price cannot be negative.']
  },
  images: [{
    type: String,
    trim: true,
    required: true
  }],
  sizes: [sizeSchema],
  isActive: {
    type: Boolean,
    default: true
  }
});

// --- Main Product Schema ---
const productSchema = new mongoose.Schema({
  name: {
    type: [translationSchema],
    required: true
  },
  description: {
    type: [translationSchema],
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  variants: [variantSchema]
}, { timestamps: true });

// --- Indexes ---
productSchema.index({
  'name.value': 'text',
  'description.value': 'text',
  'tags': 'text',
  'variants.color.name.value': 'text', // <-- Search by specific color names too
  'variants.sizes.sku': 'text'        // <-- Search by SKU
}, {
  weights: {
    'name.value': 10,           // Matches in the name are most important
    'variants.sizes.sku': 8,    // SKU matches are very important
    'tags': 5,                  // Tags are next
    'variants.color.name.value': 3, // Color names are useful
    'description.value': 1      // Description is least important
  },
  name: "ProductTextIndex" // Give the index a clear name
});

productSchema.index({ tags: 1 });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ 'variants.isActive': 1 });
productSchema.index({ createdAt: -1 });

// --- Auto-slug generation from English name ---
productSchema.pre('validate', function (next) {
  if (this.isModified('name') || this.isNew) {
    const englishName = this.name.find(n => n.lang === 'en');
    if (englishName && englishName.value) {
      this.slug = englishName.value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
