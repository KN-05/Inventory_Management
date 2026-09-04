// controllers/supplierController.js
// Full CRUD for suppliers (Phase 5). Add/Edit allowed for Admin + Staff,
// Delete restricted to Admin only, matching the approved permissions matrix.
// "Link products to suppliers" is handled by Product.supplier (Phase 4) +
// the virtual `products` field on Supplier (Phase 2) - getSupplierById
// below populates that virtual so the frontend can show linked products.

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const toCsv = require('../utils/toCsv');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

// @desc   Get all suppliers (optional ?search=)
// @route  GET /api/suppliers
// @access Private (Admin + Staff)
const getSuppliers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const suppliers = await Supplier.find(filter).sort({ name: 1 });
  res.status(200).json({ success: true, count: suppliers.length, suppliers });
});

// @desc   Get a single supplier, including its linked products
// @route  GET /api/suppliers/:id
// @access Private (Admin + Staff)
const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id).populate('products', 'name sku quantity status');

  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  res.status(200).json({ success: true, supplier });
});

// @desc   Create a supplier
// @route  POST /api/suppliers
// @access Private (Admin + Manager, per SUPPLIERS_CREATE)
const createSupplier = asyncHandler(async (req, res) => {
  const { name, companyName, email, phone, address, city, state, country, taxNumber, status } =
    req.body;

  const supplier = await Supplier.create({
    name,
    companyName,
    email,
    phone,
    address,
    city,
    state,
    country,
    taxNumber,
    status,
  });

  await logActivity(req.user._id, `Created supplier "${supplier.name}"`, 'supplier');

  res.status(201).json({ success: true, message: 'Supplier created', supplier });
});

// @desc   Update a supplier
// @route  PUT /api/suppliers/:id
// @access Private (Admin + Manager, per SUPPLIERS_UPDATE)
const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  const { name, companyName, email, phone, address, city, state, country, taxNumber, status } =
    req.body;

  if (name !== undefined) supplier.name = name;
  if (companyName !== undefined) supplier.companyName = companyName;
  if (email !== undefined) supplier.email = email;
  if (phone !== undefined) supplier.phone = phone;
  if (address !== undefined) supplier.address = address;
  if (city !== undefined) supplier.city = city;
  if (state !== undefined) supplier.state = state;
  if (country !== undefined) supplier.country = country;
  if (taxNumber !== undefined) supplier.taxNumber = taxNumber;
  if (status !== undefined) supplier.status = status;

  const updated = await supplier.save();

  await logActivity(req.user._id, `Updated supplier "${updated.name}"`, 'supplier');

  res.status(200).json({ success: true, message: 'Supplier updated', supplier: updated });
});

// @desc   Delete a supplier
// @route  DELETE /api/suppliers/:id
// @access Private (Admin only)
const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  // Prevent deleting a supplier that's still linked to products.
  const productsUsingSupplier = await Product.countDocuments({ supplier: supplier._id });
  if (productsUsingSupplier > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete this supplier - ${productsUsingSupplier} product(s) are still linked to it`
    );
  }

  await supplier.deleteOne();

  await logActivity(req.user._id, `Deleted supplier "${supplier.name}"`, 'supplier');

  res.status(200).json({ success: true, message: 'Supplier deleted' });
});

// @desc   Export all suppliers as a CSV file
// @route  GET /api/suppliers/export
// @access Private (Admin + Manager + Staff, per SUPPLIERS_VIEW)
const exportSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 }).lean();

  const csv = toCsv(suppliers, [
    { key: 'name', label: 'Name' },
    { key: 'companyName', label: 'Company Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
    { key: 'taxNumber', label: 'Tax Number' },
    { key: 'status', label: 'Status' },
  ]);

  await logActivity(req.user._id, `Exported ${suppliers.length} supplier(s) to CSV`, 'supplier');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="suppliers-export.csv"');
  res.status(200).send(csv);
});

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  exportSuppliers,
};
