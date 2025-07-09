// backend-api/migrateVariantIds.js (Revised for Diagnostics)
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

async function diagnoseAndFixVariantIds() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is not defined in your .env file.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for diagnostic script.');

    // Find products where any variant's _id is null, doesn't exist, or is an empty string.
    // Mongoose might store null if an ObjectId couldn't be cast.
    // Empty string is less likely from Mongoose but possible from other data sources.
    const productsToInspect = await Product.find({
      $or: [
        { 'variants._id': { $exists: false } },
        { 'variants._id': null },
        // Note: Querying for empty string _id directly on ObjectId fields can be tricky.
        // We will inspect all variants of products matched by the above, or all products if few.
      ]
    });
    // If the above query doesn't catch problematic ones, you might need to fetch all products (if dataset is small)
    // or iterate and check programmatically.
    // const allProducts = await Product.find({}); // Use if the query above is too restrictive

    let productsToCheck;
    if (productsToInspect.length > 0) {
      console.log(`Found ${productsToInspect.length} products based on query for problematic variant _ids.`);
      productsToCheck = productsToInspect;
    } else {
      console.log('Initial query found no products with missing/null variant _ids. Will inspect ALL products if the count is manageable, or a sample.');
      // For safety, let's limit if you have too many products
      const totalProducts = await Product.countDocuments();
      if (totalProducts > 100) { // Adjust this limit
        console.log(`Total products (${totalProducts}) is large. Inspecting a sample of 20 products.`);
        productsToCheck = await Product.find().limit(20);
      } else {
        console.log(`Inspecting all ${totalProducts} products.`);
        productsToCheck = await Product.find({});
      }
    }


    if (productsToCheck.length === 0) {
      console.log('No products found to inspect.');
      return;
    }

    console.log(`Inspecting ${productsToCheck.length} products...`);
    let updatedCount = 0;
    let problematicVariantsFound = 0;

    for (const product of productsToCheck) {
      let productModified = false;
      console.log(`\nInspecting Product: ${product.slug} (ID: ${product._id})`);
      if (!product.variants || product.variants.length === 0) {
        console.log('  Product has no variants.');
        continue;
      }

      product.variants.forEach((variant, index) => {
        console.log(`  Variant index ${index}:`);
        console.log(`    _id field exists: ${variant.hasOwnProperty('_id')}`);
        console.log(`    _id value: ${JSON.stringify(variant._id)}`);
        console.log(`    Type of _id: ${typeof variant._id}`);
        if (variant._id && typeof variant._id.toString === 'function') {
          console.log(`    _id.toString(): "${variant._id.toString()}"`);
        }


        // Check for problematic _id conditions
        if (!variant.hasOwnProperty('_id') || variant._id === null || variant._id === undefined || (typeof variant._id === 'string' && variant._id.trim() === "")) {
          problematicVariantsFound++;
          const oldId = variant._id;
          variant._id = new mongoose.Types.ObjectId(); // Assign a new ObjectId
          productModified = true;
          console.log(`    FIXED: Assigned new _id ${variant._id} (was: ${JSON.stringify(oldId)})`);
        } else if (!(variant._id instanceof mongoose.Types.ObjectId)) {
          // If _id exists but is not an ObjectId (e.g., it's just a string that's not a valid ObjectId hex string)
          // This can happen if data was imported and _id was a simple string.
          // Mongoose usually casts valid hex strings to ObjectIds, but if it's "some-random-string", it won't.
          if (typeof variant._id === 'string' && mongoose.Types.ObjectId.isValid(variant._id)) {
            // It's a valid hex string, ensure it's an actual ObjectId type
            console.log(`    INFO: Variant _id "${variant._id}" is a string but valid ObjectId. Converting to ObjectId type.`);
            variant._id = new mongoose.Types.ObjectId(variant._id);
            productModified = true; // Mark as modified to save the type cast
          } else {
            problematicVariantsFound++;
            const oldId = variant._id;
            console.warn(`    WARNING: Variant _id "${JSON.stringify(oldId)}" is not a valid ObjectId type nor a convertible string.`);
            // Optionally, you could force a new _id here too if these are causing issues:
            // variant._id = new mongoose.Types.ObjectId();
            // productModified = true;
            // console.log(`    FORCED FIX: Assigned new _id ${variant._id} (was: ${JSON.stringify(oldId)})`);
          }
        }
      });

      if (productModified) {
        try {
          await product.save();
          updatedCount++;
          console.log(`  Saved product: ${product.slug}`);
        } catch (saveError) {
          console.error(`  ERROR saving product ${product.slug}:`, saveError);
        }
      }
    }

    console.log(`\n--- Script Summary ---`);
    console.log(`Processed ${productsToCheck.length} products.`);
    console.log(`Found ${problematicVariantsFound} variants that were problematic (missing, null, empty, or invalid ObjectId type).`);
    console.log(`Successfully updated and saved ${updatedCount} products.`);

  } catch (error) {
    console.error('Error during diagnostic/migration script:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected from diagnostic script.');
    }
  }
}

diagnoseAndFixVariantIds();
