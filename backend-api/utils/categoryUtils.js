// backend-api/utils/categoryUtils.js
const mongoose = require('mongoose');

/**
 * Traverses the category tree to find all descendant IDs for a given set of parent category IDs.
 * @param {Array<string>} categoryIds - An array of starting category IDs (as strings).
 * @returns {Promise<Array<string>>} A flat array of unique category IDs including the parents and all their children.
 */
const getCategoryDescendantIds = async (categoryIds) => {
  if (!categoryIds || categoryIds.length === 0) return [];
  const CategoryModel = mongoose.model('Category');

  // Fetch all categories once to build the tree in memory, which is efficient for smaller to medium sets.
  const allCategories = await CategoryModel.find({}).lean();
  const idSet = new Set();

  function findDescendantsRecursive(parentIdStr) {
    if (idSet.has(parentIdStr)) return; // Avoid reprocessing and infinite loops
    idSet.add(parentIdStr);
    const children = allCategories.filter(c => c.parentCategory?.toString() === parentIdStr);
    children.forEach(child => findDescendantsRecursive(child._id.toString()));
  }

  for (const catId of categoryIds) {
    if (catId) {
      findDescendantsRecursive(catId.toString());
    }
  }
  return Array.from(idSet);
};

module.exports = { getCategoryDescendantIds };
