// controllers/adminController.js
// Everything here is mounted behind protect + authorize('admin') in
// routes/adminRoutes.js, so only Admins can ever reach these functions.
//
// NOTE: "Manage categories" and "Manage stock thresholds" (from the
// project spec) are already covered by the existing Category CRUD
// (Phase 5) and the Product edit form's lowStockThreshold field
// (Phase 4) - both Admin and Staff can already use those screens per
// the approved permissions matrix, so there's no separate admin-only
// UI needed for them. This controller focuses on what's genuinely
// Admin-only: user management and reports.

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const createNotification = require('../utils/createNotification');
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

// @desc   Get all users
// @route  GET /api/admin/users
// @access Private (Admin only)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: users.length, users });
});

// @desc   Create a new user (Manager/Accountant or Staff) - PHASE 2
// @route  POST /api/admin/users
// @access Private (Admin only)
// @body   { name, email, password, role: 'manager' | 'staff' }
//
// Public self-registration only ever creates the bootstrap Admin (see
// authController.js). Every account after that - Manager/Accountant or
// Staff - must be created here by an existing Admin, per the spec:
// "Only Admin can create Accountant/Manager and Staff accounts."
// Note: this endpoint deliberately does NOT allow role: 'admin' - an
// Admin can only be created via the one-time bootstrap registration, or
// by promoting an existing user's role afterwards (updateUserRole below).
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!['manager', 'staff'].includes(role)) {
    res.status(400);
    throw new Error("Role must be 'manager' or 'staff' when creating a user here");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password, // hashed automatically by the User model's pre-save hook
    role,
    createdBy: req.user._id,
  });

  await logActivity(req.user._id, `Created ${role} account for "${user.name}"`, 'user');
  await createNotification(
    'admin',
    'user_created',
    `${req.user.name} created a new ${role} account for "${user.name}"`,
    '/admin/users'
  );

  res.status(201).json({
    success: true,
    message: 'User created',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// @desc   Activate or deactivate a user
// @route  PATCH /api/admin/users/:id/status
// @access Private (Admin only)
// @body   { isActive: boolean }
const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  if (req.params.id === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot change your own active status');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isActive = !!isActive;
  await user.save();

  await logActivity(
    req.user._id,
    `${isActive ? 'Activated' : 'Deactivated'} user "${user.name}"`,
    'user'
  );

  res.status(200).json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'}`,
    user,
  });
});

// @desc   Change a user's role
// @route  PATCH /api/admin/users/:id/role
// @access Private (Admin only)
// @body   { role: 'admin' | 'manager' | 'staff' }
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!['admin', 'manager', 'staff'].includes(role)) {
    res.status(400);
    throw new Error("Role must be 'admin', 'manager', or 'staff'");
  }

  if (req.params.id === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot change your own role');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = role;
  await user.save();

  await logActivity(req.user._id, `Changed "${user.name}"'s role to ${role}`, 'user');

  res.status(200).json({ success: true, message: 'User role updated', user });
});

// @desc   Stock report - breakdown by category, plus low/out-of-stock lists
// @route  GET /api/admin/reports/stock
// @access Private (Admin only)
const getStockReport = asyncHandler(async (req, res) => {
  const [categoryBreakdown, lowStockProducts, outOfStockProducts, totals] = await Promise.all([
    Product.aggregate([
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          category: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
          productCount: 1,
          totalQuantity: 1,
          totalValue: 1,
        },
      },
      { $sort: { totalValue: -1 } },
    ]),

    Product.find({ status: 'Low Stock' })
      .populate('category', 'name')
      .select('name sku quantity lowStockThreshold status'),

    Product.find({ status: 'Out of Stock' })
      .populate('category', 'name')
      .select('name sku quantity lowStockThreshold status'),

    Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    report: {
      totals: totals[0] || { totalProducts: 0, totalQuantity: 0, totalValue: 0 },
      categoryBreakdown,
      lowStockProducts,
      outOfStockProducts,
    },
  });
});

// @desc   Supplier-wise report - product count and stock value per supplier
// @route  GET /api/admin/reports/suppliers
// @access Private (Admin only)
const getSupplierReport = asyncHandler(async (req, res) => {
  const report = await Product.aggregate([
    {
      $group: {
        _id: '$supplier',
        productCount: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
      },
    },
    {
      $lookup: {
        from: 'suppliers',
        localField: '_id',
        foreignField: '_id',
        as: 'supplierInfo',
      },
    },
    { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        supplierId: '$_id',
        _id: 0,
        supplier: { $ifNull: ['$supplierInfo.name', 'Unknown Supplier'] },
        email: '$supplierInfo.email',
        productCount: 1,
        totalQuantity: 1,
        totalValue: 1,
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  // Include suppliers with zero products too, so the report isn't misleading.
  //
  // PHASE 11 FIX: this used to match suppliers by NAME, which breaks if two
  // different suppliers happen to share the same name (allowed - Supplier
  // names aren't unique in the schema). Matching by ID is correct
  // regardless of naming collisions.
  const supplierIdsWithProducts = new Set(
    report.map((r) => r.supplierId?.toString()).filter(Boolean)
  );
  const allSuppliers = await Supplier.find();
  const zeroProductSuppliers = allSuppliers
    .filter((s) => !supplierIdsWithProducts.has(s._id.toString()))
    .map((s) => ({
      supplier: s.name,
      email: s.email,
      productCount: 0,
      totalQuantity: 0,
      totalValue: 0,
    }));

  // Drop the internal supplierId field before sending the response - it
  // was only needed for the dedup matching above.
  const cleanedReport = report.map(({ supplierId, ...rest }) => rest);

  res.status(200).json({
    success: true,
    report: [...cleanedReport, ...zeroProductSuppliers],
  });
});

module.exports = {
  getUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
  getStockReport,
  getSupplierReport,
};
