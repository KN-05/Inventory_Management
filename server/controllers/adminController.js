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
const crypto = require('crypto');
const logActivity = require('../utils/logActivity');
const createNotification = require('../utils/createNotification');
const sendEmail = require('../utils/sendEmail');
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

// @desc   Admin directly sets a NEW password for any user - no OTP step,
//         since an Admin is already fully authenticated (this endpoint
//         itself is behind `protect` + authorize('admin')). Kept
//         separate from the Manager -> Staff OTP flow below, which is
//         specifically for a LESS-trusted role (Manager) resetting
//         someone else's password.
// @route  POST /api/admin/users/:id/reset-password
// @access Private (Admin only)
// @body   { newPassword }
const adminResetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (req.params.id === String(req.user._id)) {
    res.status(400);
    throw new Error("Use the Profile page's Change Password to update your own password");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.password = newPassword; // re-hashed automatically by the pre-save hook
  await user.save();

  await logActivity(req.user._id, `Reset the password for "${user.name}"`, 'user');

  res.status(200).json({ success: true, message: `Password reset for ${user.name}` });
});

// PHASE 26: Manager -> Staff password reset, gated by an OTP emailed to
// the STAFF MEMBER'S OWN registered email address (not the Manager's,
// not an Admin's) - so the account owner is always the one who actually
// sees the code, even though the Manager is the one initiating the reset
// and typing in the new password. A Manager can only target Staff
// accounts here, never another Manager or an Admin.

// @desc   Step 1: generate an OTP and email it to the target Staff
//         member's own registered email address.
// @route  POST /api/admin/users/:id/staff-password-reset/request-otp
// @access Private (Manager only)
const requestStaffPasswordResetOtp = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);

  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }
  if (targetUser.role !== 'staff') {
    res.status(403);
    throw new Error('You can only reset passwords for Staff accounts');
  }

  const otp = String(crypto.randomInt(100000, 1000000)); // 6-digit code
  targetUser.staffResetOtpHash = crypto.createHash('sha256').update(otp).digest('hex');
  targetUser.staffResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await targetUser.save();

  await sendEmail(
    targetUser.email,
    'Password Reset Verification Code',
    `Hi ${targetUser.name},\n\n${req.user.name} (Manager) has requested to reset your Inventory Manager account password.\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes. Share it with your Manager only if you approve this reset - if you did not expect this, please contact your Admin.`
  );

  await logActivity(
    req.user._id,
    `Requested a password reset OTP for staff member "${targetUser.name}"`,
    'user'
  );

  res.status(200).json({
    success: true,
    message: `A verification code was emailed to ${targetUser.email}`,
  });
});

// @desc   Step 2: verify the OTP (emailed to the Staff member) and set
//         their new password.
// @route  POST /api/admin/users/:id/staff-password-reset/confirm
// @access Private (Manager only)
// @body   { otp, newPassword }
const resetStaffPasswordWithOtp = asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body;

  const targetUser = await User.findById(req.params.id).select(
    '+staffResetOtpHash +staffResetOtpExpires'
  );

  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }
  if (targetUser.role !== 'staff') {
    res.status(403);
    throw new Error('You can only reset passwords for Staff accounts');
  }

  if (!targetUser.staffResetOtpHash || !targetUser.staffResetOtpExpires) {
    res.status(400);
    throw new Error('No password reset was requested for this user, or it already expired');
  }
  if (targetUser.staffResetOtpExpires < new Date()) {
    res.status(400);
    throw new Error('This verification code has expired - request a new one');
  }

  const providedHash = crypto.createHash('sha256').update(String(otp || '')).digest('hex');
  if (providedHash !== targetUser.staffResetOtpHash) {
    res.status(401);
    throw new Error('Incorrect verification code');
  }

  targetUser.password = newPassword; // re-hashed automatically by the pre-save hook
  targetUser.staffResetOtpHash = null;
  targetUser.staffResetOtpExpires = null;
  await targetUser.save();

  await logActivity(req.user._id, `Reset the password for staff member "${targetUser.name}"`, 'user');
  await createNotification(
    'admin',
    'password_reset',
    `${req.user.name} (Manager) reset the password for staff member "${targetUser.name}"`,
    '/admin/staff-passwords'
  );

  res.status(200).json({ success: true, message: `Password reset for ${targetUser.name}` });
});

// @desc   List Staff-only accounts (id/name/email) - a Manager needs
//         this to pick who to reset a password for, but must NOT get the
//         full Admin user list (which includes Admins/other Managers and
//         role/status management). Kept intentionally minimal.
// @route  GET /api/admin/staff-list
// @access Private (Admin + Manager)
const getStaffList = asyncHandler(async (req, res) => {
  const staff = await User.find({ role: 'staff' }).select('name email isActive').sort({ name: 1 });
  res.status(200).json({ success: true, staff });
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
  adminResetPassword,
  requestStaffPasswordResetOtp,
  resetStaffPasswordWithOtp,
  getStaffList,
  getStockReport,
  getSupplierReport,
};
