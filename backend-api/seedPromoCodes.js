// backend-api/seedPromoCodes.js
require('dotenv').config();
const mongoose = require('mongoose');
const PromoCode = require('./models/PromoCode'); // Adjust path if needed

// --- IMPORTANT: REPLACE THESE WITH ACTUAL ObjectIds FROM YOUR DATABASE ---
const SAMPLE_PRODUCT_ID_1 = '66633a01c45d8a9b3c4f9a01'; // e.g., "66633a01c45d8a9b3c4f9a01"
const SAMPLE_PRODUCT_ID_2 = '66633a01c45d8a9b3c4f9a05';
const MEN_CATEGORY_ID = '66632a4d5e9b3d1f4a9b1c01'; // e.g., "66632a4d5e9b3d1f4a9b1c01"
// --- END IMPORTANT ---


const samplePromoCodes = [
  {
    "code": "WELCOME10",
    "description": "10% off first order for new customers.", // Quotes added
    "discountType": "percentage",
    "discountValue": 10,
    "minPurchaseAmount": 0,
    // "maxDiscountAmount": 20, // Optional
    "startDate": new Date("2024-01-01T00:00:00.000Z"),
    // "endDate": new Date("2025-12-31T23:59:59.000Z"),
    "usageLimitTotal": 1000,
    "oneTimePerUser": true,
    "isActive": true,
    "applicableTo": "all",
    "applicableProductIds": [], // Ensure these are empty if applicableTo is 'all'
    "applicableCategoryIds": []
  },
  {
    "code": "SUMMER20",
    "description": "20% off entire order for summer sale.",
    "discountType": "percentage",
    "discountValue": 20,
    "minPurchaseAmount": 50,
    "maxDiscountAmount": 100,
    "startDate": new Date("2024-06-01T00:00:00.000Z"),
    "endDate": new Date("2024-08-31T23:59:59.000Z"),
    // "usageLimitTotal": 500,
    "oneTimePerUser": false,
    "isActive": true,
    "applicableTo": "all",
    "applicableProductIds": [],
    "applicableCategoryIds": []
  },
  {
    "code": "SAVE5",
    "description": "Fixed 5 EUR off orders over 30 EUR.",
    "discountType": "fixed",
    "discountValue": 5,
    "minPurchaseAmount": 30,
    "startDate": new Date("2024-01-01T00:00:00.000Z"),
    "oneTimePerUser": false,
    "isActive": true,
    "applicableTo": "all",
    "applicableProductIds": [],
    "applicableCategoryIds": []
  },
  {
    "code": "TSHIRTDEAL",
    "description": "15% off specific T-Shirts.",
    "discountType": "percentage",
    "discountValue": 15,
    "isActive": true,
    "applicableTo": "specificProducts",
    "applicableProductIds": (SAMPLE_PRODUCT_ID_1 !== 'YOUR_ACTUAL_PRODUCT_ID_1_STRING' && SAMPLE_PRODUCT_ID_2 !== 'YOUR_ACTUAL_PRODUCT_ID_2_STRING' && mongoose.Types.ObjectId.isValid(SAMPLE_PRODUCT_ID_1) && mongoose.Types.ObjectId.isValid(SAMPLE_PRODUCT_ID_2))
      ? [new mongoose.Types.ObjectId(SAMPLE_PRODUCT_ID_1), new mongoose.Types.ObjectId(SAMPLE_PRODUCT_ID_2)]
      : [],
    "applicableCategoryIds": []
  },
  {
    "code": "MENSCAT10",
    "description": "10% off all items in Men's categories.",
    "discountType": "percentage",
    "discountValue": 10,
    "minPurchaseAmount": 40,
    "maxDiscountAmount": 50,
    "isActive": true,
    "applicableTo": "specificCategories",
    "applicableProductIds": [],
    "applicableCategoryIds": (MEN_CATEGORY_ID !== 'YOUR_ACTUAL_MEN_CATEGORY_ID_STRING' && mongoose.Types.ObjectId.isValid(MEN_CATEGORY_ID))
      ? [new mongoose.Types.ObjectId(MEN_CATEGORY_ID)]
      : []
  },
  {
    "code": "EXPIREDCODE",
    "description": "An expired promo code for testing.",
    "discountType": "percentage",
    "discountValue": 50,
    "startDate": new Date("2023-01-01T00:00:00.000Z"),
    "endDate": new Date("2023-12-31T23:59:59.000Z"),
    "isActive": true,
    "applicableTo": "all",
    "applicableProductIds": [],
    "applicableCategoryIds": []
  },
  {
    "code": "INACTIVECODE",
    "description": "An inactive promo code for testing.",
    "discountType": "fixed",
    "discountValue": 10,
    "isActive": false,
    "applicableTo": "all",
    "applicableProductIds": [],
    "applicableCategoryIds": []
  },
  {
    "code": "LIMITREACHED",
    "description": "Promo code with usage limit reached for testing.",
    "discountType": "percentage",
    "discountValue": 10,
    "usageLimitTotal": 1,
    "timesUsed": 1,
    "isActive": true,
    "applicableTo": "all",
    "applicableProductIds": [],
    "applicableCategoryIds": []
  }
];

async function seedDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is not defined in your .env file.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding promo codes.');

    // Optional: Clear existing promo codes before seeding
    const clearExisting = false; // Set to true to clear before seeding
    if (clearExisting) {
      console.log('Clearing existing promo codes...');
      await PromoCode.deleteMany({});
      console.log('Existing promo codes cleared.');
    }

    console.log('Seeding promo codes...');
    // Using insertMany and Mongoose will handle schema validation and defaults
    const createdPromoCodes = await PromoCode.insertMany(samplePromoCodes, { ordered: false, lean: true }); // lean might speed it up slightly for just inserting
    console.log(`${createdPromoCodes.length} promo codes successfully seeded!`);

    if (samplePromoCodes.find(p => p.code === "TSHIRTDEAL")?.applicableProductIds?.length === 0 &&
      (SAMPLE_PRODUCT_ID_1 === 'YOUR_ACTUAL_PRODUCT_ID_1_STRING' || SAMPLE_PRODUCT_ID_2 === 'YOUR_ACTUAL_PRODUCT_ID_2_STRING')) {
      console.warn("\nWARNING: 'TSHIRTDEAL' promo code was seeded without specific product IDs because placeholder constants were not updated or were invalid. Please update SAMPLE_PRODUCT_ID constants in seedPromoCodes.js with valid ObjectId strings and re-run, or update the document manually in MongoDB.");
    }
    if (samplePromoCodes.find(p => p.code === "MENSCAT10")?.applicableCategoryIds?.length === 0 &&
      MEN_CATEGORY_ID === 'YOUR_ACTUAL_MEN_CATEGORY_ID_STRING') {
      console.warn("WARNING: 'MENSCAT10' promo code was seeded without a specific category ID because the placeholder constant was not updated or was invalid. Please update MEN_CATEGORY_ID constant in seedPromoCodes.js with a valid ObjectId string and re-run, or update the document manually in MongoDB.");
    }


  } catch (error) {
    console.error('Error seeding database:');
    if (error.writeErrors) { // Handle bulk write errors
      error.writeErrors.forEach(err => {
        console.error(`  - Write Error for document at index ${err.index}: ${err.errmsg}`);
        // console.error('    Problematic document:', samplePromoCodes[err.index]); // Log the problematic document
      });
    } else {
      console.error(error.message); // General error
    }
  } finally {
    if (mongoose.connection.readyState === 1) { // Check if connection is open
      await mongoose.disconnect();
      console.log('MongoDB disconnected.');
    }
  }
}

seedDatabase();
