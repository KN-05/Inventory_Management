// controllers/productController.js

const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const { generateUniqueSku, generateUniqueBarcode } = require('../utils/generateProductCodes');
const toCsv = require('../utils/toCsv');
const Product = require('../models/Product');
const StockAlert = require('../models/StockAlert');
const StockMovement = require('../models/StockMovement');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');

// @desc   Get all products, with optional search + filters
// @route  GET /api/products?search=&sku=&category=&supplier=&status=&page=&limit=
// @access Private (Admin + Manager + Staff)
//
// Query params (all optional):
//   search    - matches against product name, SKU, OR barcode (case-insensitive)
//   category  - category ObjectId
//   supplier  - supplier ObjectId
//   status    - 'In Stock' | 'Low Stock' | 'Out of Stock'
//   page/limit - simple pagination, defaults to page 1 / 20 per page
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, supplier, status, page = 1, limit = 20 } = req.query;

  const filter = {};

  if (search) {
    // PHASE 6: also match barcode, so the same search box used on the
    // Products page doubles as a quick "scan/type a barcode" lookup.
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) filter.category = category;
  if (supplier) filter.supplier = supplier;
  if (status) filter.status = status;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    products,
  });
});

// @desc   Get a single product by id
// @route  GET /api/products/:id
// @access Private (Admin + Staff)
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate('supplier', 'name');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.status(200).json({ success: true, product });
});

// @desc   Create a new product
// @route  POST /api/products
// @access Private (Admin + Manager + Staff)
//
// PHASE 6: `sku` and `barcode` are no longer accepted from the client at
// all - they're generated here so every product gets a guaranteed-unique
// identifier without relying on the person filling in the form correctly.
const createProduct = asyncHandler(async (req, res) => {
  const { name, category, quantity, price, supplier, lowStockThreshold } = req.body;

  const categoryDoc = await Category.findById(category);
  const sku = await generateUniqueSku(categoryDoc?.name, name);
  const barcode = await generateUniqueBarcode();

  const product = await Product.create({
    name,
    sku,
    barcode,
    category,
    quantity,
    price,
    supplier,
    lowStockThreshold,
  });

  await logActivity(req.user._id, `Created product "${product.name}" (SKU: ${product.sku})`, 'product');

  res.status(201).json({ success: true, message: 'Product created', product });
});

// @desc   Update an existing product
// @route  PUT /api/products/:id
// @access Private (Admin + Manager + Staff)
//
// PHASE 6: `sku` and `barcode` are identity fields, generated once at
// creation - they are intentionally NOT accepted here, even if a client
// sends them, so they can never drift from what's printed on stock
// labels/invoices elsewhere in the system.
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const { name, category, quantity, price, supplier, lowStockThreshold } = req.body;

  if (name !== undefined) product.name = name;
  if (category !== undefined) product.category = category;
  if (quantity !== undefined) product.quantity = quantity;
  if (price !== undefined) product.price = price;
  if (supplier !== undefined) product.supplier = supplier;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;

  const updated = await product.save(); // status recalculated automatically via pre('save')

  await logActivity(req.user._id, `Updated product "${updated.name}"`, 'product');

  res.status(200).json({ success: true, message: 'Product updated', product: updated });
});

// @desc   Upload/replace a product's photo
// @route  POST /api/products/:id/image
// @access Private (Admin + Manager + Staff - same as PRODUCTS_UPDATE)
//
// PHASE 6: same pattern as profileController.js's uploadPhoto - a
// separate endpoint (not bundled into createProduct/updateProduct) since
// a brand-new product doesn't have an id or existing file to replace yet.
// The file itself is handled by multer (see routes/productRoutes.js).
const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file was uploaded');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Clean up the previous image file, if one exists, before saving the new path.
  if (product.image) {
    const oldPath = path.join(__dirname, '..', product.image);
    fs.unlink(oldPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to delete old product image:', err.message);
      }
    });
  }

  product.image = `/uploads/product-photos/${req.file.filename}`;
  await product.save();

  await logActivity(req.user._id, `Updated photo for product "${product.name}"`, 'product');

  res.status(200).json({ success: true, message: 'Product image updated', product });
});

// @desc   Delete a product
// @route  DELETE /api/products/:id
// @access Private (Admin only)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  await product.deleteOne();

  // PHASE 11 FIX: without this, deleting a product left behind an orphaned
  // StockAlert document still pointing at that (now-nonexistent) product -
  // it would show up on the Stock Alerts page forever as "active" with no
  // way to auto-resolve it, since alert resolution normally happens via
  // the Product model's post('save') hook, which never runs for a deleted
  // product.
  await StockAlert.deleteMany({ product: product._id });

  await logActivity(req.user._id, `Deleted product "${product.name}"`, 'product');

  res.status(200).json({ success: true, message: 'Product deleted' });
});

// @desc   Increase a product's stock quantity
// @route  PATCH /api/products/:id/increase-stock
// @access Private (Admin + Staff)
// @body   { amount: number }
//
// PHASE 7: now also writes a StockMovement record (type ADJUSTMENT), so
// this manual change shows up in the product's stock history alongside
// Purchase-driven increases - answering "why did stock change?" no
// matter how it changed.
const increaseStock = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Amount must be a positive number');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const previousStock = product.quantity;
  product.quantity += Number(amount);
  await product.save(); // status recalculated automatically

  await StockMovement.create({
    product: product._id,
    type: 'ADJUSTMENT',
    quantity: Number(amount),
    previousStock,
    newStock: product.quantity,
    reason: 'Manual stock increase',
    performedBy: req.user._id,
  });

  await logActivity(
    req.user._id,
    `Increased stock of "${product.name}" by ${amount}`,
    'stock'
  );

  res.status(200).json({ success: true, message: 'Stock increased', product });
});

// @desc   Decrease a product's stock quantity
// @route  PATCH /api/products/:id/decrease-stock
// @access Private (Admin + Staff)
// @body   { amount: number }
//
// PHASE 7: same StockMovement logging as increaseStock above.
const decreaseStock = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Amount must be a positive number');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (product.quantity - amount < 0) {
    res.status(400);
    throw new Error('Cannot decrease stock below 0');
  }

  const previousStock = product.quantity;
  product.quantity -= Number(amount);
  await product.save(); // status recalculated automatically

  await StockMovement.create({
    product: product._id,
    type: 'ADJUSTMENT',
    quantity: -Number(amount), // negative: stock going OUT
    previousStock,
    newStock: product.quantity,
    reason: 'Manual stock decrease',
    performedBy: req.user._id,
  });

  await logActivity(
    req.user._id,
    `Decreased stock of "${product.name}" by ${amount}`,
    'stock'
  );

  res.status(200).json({ success: true, message: 'Stock decreased', product });
});

// @desc   Get recent stock movement history for one product
// @route  GET /api/products/:id/stock-movements
// @access Private (Admin + Manager + Staff, per PRODUCTS_VIEW)
//
// PHASE 7: powers the "Stock History" section of ProductDetailsModal -
// every purchase-received or manual adjustment shows up here, newest
// first, so anyone can see why a product's quantity is what it is.
const getProductStockMovements = asyncHandler(async (req, res) => {
  const movements = await StockMovement.find({ product: req.params.id })
    .populate('performedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(20);

  res.status(200).json({ success: true, count: movements.length, movements });
});

// @desc   Bulk-import products from an uploaded CSV file
// @route  POST /api/products/import?preview=true|false
// @access Private (Admin + Manager, per IMPORTS_CREATE)
//
// PHASE 13: expects a multipart/form-data request with a single file field
// named "file" (handled by multer in the route). Expected CSV columns:
//   name, sku (optional), category, supplier, quantity, price, lowStockThreshold
// `category` and `supplier` are matched by NAME (case-insensitive) against
// existing Categories/Suppliers - they are NOT auto-created, so a typo in
// the CSV shows up as a clear per-row error instead of silently creating
// a duplicate/misspelled category.
//
// PHASE 6: `sku` is now OPTIONAL in the CSV - if a row doesn't provide
// one, it's auto-generated the same way the "Add Product" form does.
// Every imported row also gets an auto-generated `barcode`, since there's
// no barcode column in the CSV template at all.
//
// PHASE 9: added a PREVIEW step, per the spec's "Upload -> Validate ->
// Preview -> Confirm -> Insert" flow. `?preview=true` runs every
// validation check below (missing fields, bad numbers, unknown
// category/supplier, duplicate SKUs - both within the file and against
// the database) and reports totals/row-level reasons WITHOUT writing
// anything to the database. The frontend re-sends the exact same file
// with `?preview=false` once the person confirms, which then actually
// creates the valid rows - so nothing is ever inserted without a person
// having seen what would happen first.
const importProducts = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No CSV file was uploaded');
  }

  const isPreview = req.query.preview === 'true';

  let rows;
  try {
    rows = parse(req.file.buffer, {
      columns: true, // use the first row as field names
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    res.status(400);
    throw new Error(`Could not read the CSV file: ${err.message}`);
  }

  if (rows.length === 0) {
    res.status(400);
    throw new Error('The CSV file has no data rows');
  }

  // Pre-load all categories/suppliers once, instead of querying the
  // database inside the loop for every single row.
  const [categories, suppliers] = await Promise.all([Category.find(), Supplier.find()]);
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const supplierByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s]));

  const results = { created: 0, failed: 0, duplicates: 0 };
  const errors = [];
  const preview = []; // only populated for ?preview=true - a few sample valid rows
  const skusSeenInThisFile = new Set(); // catch duplicate SKUs within the same CSV

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +2 because row 1 is the header and humans count from 1
    const row = rows[i];

    const name = row.name?.trim();
    const explicitSku = row.sku?.trim()?.toUpperCase() || '';
    const categoryName = row.category?.trim();
    const supplierName = row.supplier?.trim();
    const quantity = Number(row.quantity);
    const price = Number(row.price);
    const lowStockThreshold = row.lowStockThreshold ? Number(row.lowStockThreshold) : 10;

    // Validate required fields are present and sensible before touching the DB
    if (!name || !categoryName || !supplierName) {
      results.failed++;
      errors.push({ row: rowNum, type: 'invalid', reason: 'Missing name, category, or supplier' });
      continue;
    }
    if (Number.isNaN(quantity) || quantity < 0) {
      results.failed++;
      errors.push({ row: rowNum, type: 'invalid', reason: 'Quantity must be a number 0 or greater' });
      continue;
    }
    if (Number.isNaN(price) || price < 0) {
      results.failed++;
      errors.push({ row: rowNum, type: 'invalid', reason: 'Price must be a number 0 or greater' });
      continue;
    }

    const category = categoryByName.get(categoryName.toLowerCase());
    if (!category) {
      results.failed++;
      errors.push({ row: rowNum, type: 'invalid', reason: `Category "${categoryName}" does not exist` });
      continue;
    }

    const supplier = supplierByName.get(supplierName.toLowerCase());
    if (!supplier) {
      results.failed++;
      errors.push({ row: rowNum, type: 'invalid', reason: `Supplier "${supplierName}" does not exist` });
      continue;
    }

    let sku = explicitSku;
    if (sku) {
      if (skusSeenInThisFile.has(sku)) {
        results.failed++;
        results.duplicates++;
        errors.push({ row: rowNum, type: 'duplicate', reason: `Duplicate SKU "${sku}" within this file` });
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        results.failed++;
        results.duplicates++;
        errors.push({ row: rowNum, type: 'duplicate', reason: `SKU "${sku}" already exists in the database` });
        continue;
      }
    } else if (!isPreview) {
      // Only actually reserve a generated SKU when we're really about to
      // insert - during preview we just show "(auto-generated)" so two
      // back-to-back previews of the same file don't get different SKUs.
      // eslint-disable-next-line no-await-in-loop
      sku = await generateUniqueSku(category.name, name);
    }

    if (isPreview) {
      preview.push({
        row: rowNum,
        name,
        sku: sku || '(auto-generated)',
        category: category.name,
        supplier: supplier.name,
        quantity,
        price,
      });
      skusSeenInThisFile.add(sku || `__preview_${rowNum}`);
      results.created++; // "would be created"
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const barcode = await generateUniqueBarcode();
      // eslint-disable-next-line no-await-in-loop
      await Product.create({
        name,
        sku,
        barcode,
        category: category._id,
        supplier: supplier._id,
        quantity,
        price,
        lowStockThreshold,
      });
      skusSeenInThisFile.add(sku);
      results.created++;
    } catch (err) {
      results.failed++;
      errors.push({ row: rowNum, type: 'invalid', reason: err.message });
    }
  }

  if (isPreview) {
    // Nothing was written to the database - just report what WOULD happen.
    return res.status(200).json({
      success: true,
      preview: true,
      summary: {
        totalRows: rows.length,
        validRows: results.created,
        invalidRows: results.failed - results.duplicates,
        duplicateRows: results.duplicates,
      },
      sampleRows: preview.slice(0, 20), // enough to sanity-check without dumping huge files
      errors,
    });
  }

  // One summary activity log entry, not one per row - avoids flooding the
  // Recent Activity feed when someone imports 200 products at once.
  await logActivity(
    req.user._id,
    `Imported ${results.created} product(s) from CSV (${results.failed} failed)`,
    'product'
  );

  res.status(200).json({
    success: true,
    preview: false,
    message: `Import complete: ${results.created} created, ${results.failed} failed`,
    summary: {
      totalRows: rows.length,
      validRows: results.created,
      invalidRows: results.failed - results.duplicates,
      duplicateRows: results.duplicates,
    },
    errors,
  });
});

// @desc   Export all products (i.e. the full Inventory) as a CSV file
// @route  GET /api/products/export
// @access Private (Admin + Manager + Staff, per PRODUCTS_VIEW)
//
// PHASE 9: this doubles as the spec's "Inventory" export - a Product IS
// the inventory record (name, stock, threshold, status all live on it
// already), so a separate "Inventory" export would just be a duplicate
// of this one with a different filename. One export, two names.
const exportProducts = asyncHandler(async (req, res) => {
  const products = await Product.find()
    .populate('category', 'name')
    .populate('supplier', 'name')
    .sort({ name: 1 })
    .lean();

  const csv = toCsv(products, [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'category.name', label: 'Category' },
    { key: 'supplier.name', label: 'Supplier' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'lowStockThreshold', label: 'Low Stock Threshold' },
    { key: 'price', label: 'Price' },
    { key: 'status', label: 'Status' },
  ]);

  await logActivity(req.user._id, `Exported ${products.length} product(s) to CSV`, 'product');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products-export.csv"');
  res.status(200).send(csv);
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProduct,
  increaseStock,
  decreaseStock,
  getProductStockMovements,
  importProducts,
  exportProducts,
};
