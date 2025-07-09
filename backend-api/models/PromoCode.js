// backend-api/models/PromoCode.js
const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Promo code string is required.'],
    // unique: true, // We will define uniqueness using schema.index() for clarity
    uppercase: true, // Store codes consistently
    trim: true
  },
  description: { // For admin reference and potential display
    type: String,
    trim: true
  },
  discountType: {
    type: String,
    required: [true, 'Discount type (percentage or fixed) is required.'],
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required.'],
    min: [0, 'Discount value cannot be negative.']
  },
  minPurchaseAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum purchase amount cannot be negative.']
  },
  maxDiscountAmount: { // Optional: Cap for percentage discounts
    type: Number,
    min: [0.01, 'Maximum discount amount must be positive if set.'], // Must be positive if set
    validate: {
      validator: function (v) {
        // Only relevant if discountType is 'percentage'. If set, must be a positive number.
        return this.discountType !== 'percentage' || (v === undefined || v === null || (typeof v === 'number' && v > 0));
      },
      message: 'Max discount amount must be a positive number if specified for percentage type discounts.'
    }
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date // Optional: If the code expires
  },
  usageLimitTotal: { // Optional: How many times this code can be used in total across all users
    type: Number,
    min: [1, 'Usage limit must be at least 1 if specified.'] // If there's a limit, it must be at least 1
  },
  timesUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  oneTimePerUser: { // Can each user use this code only once?
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // --- Applicability ---
  applicableTo: {
    type: String,
    enum: ['all', 'specificProducts', 'specificCategories'],
    default: 'all'
  },
  applicableProductIds: [{ // Only relevant if applicableTo is 'specificProducts'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategoryIds: [{ // Only relevant if applicableTo is 'specificCategories'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
  toObject: { virtuals: true } // Ensure virtuals are included when converting to Object
});

// --- Index Definitions ---
// Explicitly define the unique index on 'code'. This is the single source of truth for this index.
promoCodeSchema.index({ code: 1 }, { unique: true });

// Compound index for common validation queries
promoCodeSchema.index({ isActive: 1, startDate: 1, endDate: 1, timesUsed: 1, usageLimitTotal: 1 });

// Index for applicability searches (less critical, but can help)
promoCodeSchema.index({ applicableTo: 1 });


// --- Virtual Properties ---
promoCodeSchema.virtual('isExpired').get(function () {
  return this.endDate && this.endDate < new Date();
});

promoCodeSchema.virtual('isUsageLimitReached').get(function () {
  // Check if usageLimitTotal is defined and timesUsed has met or exceeded it
  return typeof this.usageLimitTotal === 'number' && this.timesUsed >= this.usageLimitTotal;
});


// --- Pre-save Hook ---
promoCodeSchema.pre('save', function (next) {
  // Ensure code is uppercase
  if (this.isModified('code') && this.code) {
    this.code = this.code.toUpperCase();
  }

  // Clear inapplicable fields based on 'applicableTo'
  if (this.applicableTo !== 'specificProducts') {
    this.applicableProductIds = [];
  }
  if (this.applicableTo !== 'specificCategories') {
    this.applicableCategoryIds = [];
  }

  // Clear maxDiscountAmount if not a percentage type, or ensure it's undefined if not set
  if (this.discountType !== 'percentage') {
    this.maxDiscountAmount = undefined;
  } else if (this.maxDiscountAmount !== undefined && this.maxDiscountAmount <= 0) {
    // If it's percentage and maxDiscount is set to 0 or less, it's effectively no cap, so undefined is better
    this.maxDiscountAmount = undefined;
  }

  next();
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);
