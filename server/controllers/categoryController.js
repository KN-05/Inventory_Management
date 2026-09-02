// controllers/categoryController.js
// Full CRUD for categories (Phase 5). Add/Edit allowed for Admin + Manager,
// Delete restricted to Admin only, matching the approved permissions matrix.

const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc   Get all categories (optional ?search= by name)
// @route  GET /api/categories?search=
// @access Private (Admin + Manager + Staff)
const getCategories = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = {};

  // PHASE 6: search-by-name, matching the pattern already used on
  // Suppliers, so every lookup list in the app behaves consistently.
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  const categories = await Category.find(filter).sort({ name: 1 });
  res.status(200).json({ success: true, count: categories.length, categories });
});

// @desc   Get a single category by id
// @route  GET /api/categories/:id
// @access Private (Admin + Manager + Staff)
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.status(200).json({ success: true, category });
});

// @desc   Create a category
// @route  POST /api/categories
// @access Private (Admin + Manager, per CATEGORIES_CREATE)
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  const existing = await Category.findOne({ name });
  if (existing) {
    res.status(400);
    throw new Error('A category with this name already exists');
  }

  const category = await Category.create({ name, description, status });

  await logActivity(req.user._id, `Created category "${category.name}"`, 'category');

  res.status(201).json({ success: true, message: 'Category created', category });
});

// @desc   Update a category
// @route  PUT /api/categories/:id
// @access Private (Admin + Manager, per CATEGORIES_UPDATE)
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const { name, description, status } = req.body;

  if (name && name !== category.name) {
    const existing = await Category.findOne({ name });
    if (existing) {
      res.status(400);
      throw new Error('A category with this name already exists');
    }
    category.name = name;
  }

  if (description !== undefined) category.description = description;
  if (status !== undefined) category.status = status;

  const updated = await category.save();

  await logActivity(req.user._id, `Updated category "${updated.name}"`, 'category');

  res.status(200).json({ success: true, message: 'Category updated', category: updated });
});

// @desc   Upload/replace a category's photo
// @route  POST /api/categories/:id/image
// @access Private (Admin + Manager, per CATEGORIES_UPDATE)
//
// PHASE 6: same pattern as productController.js's uploadProductImage /
// profileController.js's uploadPhoto.
const uploadCategoryImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file was uploaded');
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (category.image) {
    const oldPath = path.join(__dirname, '..', category.image);
    fs.unlink(oldPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to delete old category image:', err.message);
      }
    });
  }

  category.image = `/uploads/category-photos/${req.file.filename}`;
  await category.save();

  await logActivity(req.user._id, `Updated photo for category "${category.name}"`, 'category');

  res.status(200).json({ success: true, message: 'Category image updated', category });
});

// @desc   Delete a category
// @route  DELETE /api/categories/:id
// @access Private (Admin only)
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  // Prevent deleting a category that's still in use by products -
  // avoids leaving products with a broken/dangling category reference.
  const productsUsingCategory = await Product.countDocuments({ category: category._id });
  if (productsUsingCategory > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete this category - ${productsUsingCategory} product(s) are still assigned to it`
    );
  }

  await category.deleteOne();

  await logActivity(req.user._id, `Deleted category "${category.name}"`, 'category');

  res.status(200).json({ success: true, message: 'Category deleted' });
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  uploadCategoryImage,
  deleteCategory,
};
