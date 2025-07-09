// backend-api/models/Lookbook.js
const mongoose = require('mongoose');

// Re-using the translation schema for consistency
const translationSchema = new mongoose.Schema({
  lang: { type: String, required: true, trim: true, lowercase: true },
  value: { type: String, required: true, trim: true }
}, { _id: false });

const lookbookSchema = new mongoose.Schema({
  title: {
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
  bannerImage: {
    type: String,
    required: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: { // To control the order they appear on the site
    type: Number,
    default: 0,
    index: true
  }
}, { timestamps: true });

// Auto-generate slug from English title
lookbookSchema.pre('validate', function (next) {
  if ((this.isModified('title') || this.isNew) && !this.slug) {
    const englishTitle = this.title.find(t => t.lang === 'en');
    if (englishTitle && englishTitle.value) {
      this.slug = englishTitle.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    }
  }
  next();
});

module.exports = mongoose.model('Lookbook', lookbookSchema);
