// controllers/customerController.js
// PHASE 8: standard CRUD for Customers. `totalPurchases`/`lastPurchase`
// are read-only here - they're maintained by saleController.js.

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const toCsv = require('../utils/toCsv');
const Customer = require('../models/Customer');

// @desc   Get all customers (optional ?search= by name/phone/email)
// @route  GET /api/customers?search=&page=&limit=
// @access Private (Admin + Manager + Staff, per CUSTOMERS_VIEW)
const getCustomers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum),
    Customer.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: customers.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    customers,
  });
});

// @desc   Get a single customer by id
// @route  GET /api/customers/:id
// @access Private (Admin + Manager + Staff, per CUSTOMERS_VIEW)
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  res.status(200).json({ success: true, customer });
});

// @desc   Create a customer
// @route  POST /api/customers
// @access Private (Admin + Manager + Staff, per CUSTOMERS_CREATE)
const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, address, city } = req.body;

  const customer = await Customer.create({
    name,
    phone,
    email,
    address,
    city,
    createdBy: req.user._id,
  });

  await logActivity(req.user._id, `Created customer "${customer.name}"`, 'customer');

  res.status(201).json({ success: true, message: 'Customer created', customer });
});

// @desc   Update a customer
// @route  PUT /api/customers/:id
// @access Private (Admin + Manager, per CUSTOMERS_UPDATE)
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  const { name, phone, email, address, city } = req.body;

  if (name !== undefined) customer.name = name;
  if (phone !== undefined) customer.phone = phone;
  if (email !== undefined) customer.email = email;
  if (address !== undefined) customer.address = address;
  if (city !== undefined) customer.city = city;

  const updated = await customer.save();

  await logActivity(req.user._id, `Updated customer "${updated.name}"`, 'customer');

  res.status(200).json({ success: true, message: 'Customer updated', customer: updated });
});

// @desc   Delete a customer
// @route  DELETE /api/customers/:id
// @access Private (Admin + Manager, per CUSTOMERS_DELETE)
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  await customer.deleteOne();

  await logActivity(req.user._id, `Deleted customer "${customer.name}"`, 'customer');

  res.status(200).json({ success: true, message: 'Customer deleted' });
});

// @desc   Export all customers as a CSV file
// @route  GET /api/customers/export
// @access Private (Admin + Manager + Staff, per CUSTOMERS_VIEW)
const exportCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find().sort({ name: 1 }).lean();

  const csv = toCsv(customers, [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'totalPurchases', label: 'Total Purchases' },
    { key: 'lastPurchase', label: 'Last Purchase' },
  ]);

  await logActivity(req.user._id, `Exported ${customers.length} customer(s) to CSV`, 'customer');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
  res.status(200).send(csv);
});

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomers,
};
