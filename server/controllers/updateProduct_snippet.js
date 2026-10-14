// @desc   Update a product
// @route  PUT /api/products/:id
// @access Private (Admin + Manager + Staff)
//
// PHASE 6: `sku` is an identity field, generated once at creation - it
// is intentionally NOT accepted here, so it can never drift from what's
// printed on stock labels/invoices elsewhere in the system.
//
// PHASE 30: `barcode` is auto-generated at creation like `sku`, but
// unlike `sku` it CAN be edited afterwards - only by Admin/Manager
// (matches PRODUCTS_UPDATE-level trust, not Staff) - to cover cases
// like re-labeling with a supplier's own barcode or correcting a
// scan/print mistake. Still enforced unique across all products.
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const { name, category, quantity, price, supplier, lowStockThreshold, barcode } = req.body;

  if (name !== undefined) product.name = name;
  if (category !== undefined) product.category = category;
  if (quantity !== undefined) product.quantity = quantity;
  if (price !== undefined) product.price = price;
  if (supplier !== undefined) product.supplier = supplier;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;

  // PHASE 30: barcode is editable, but only for Admin/Manager, and only
  // if it actually changed (avoids an unnecessary uniqueness query on
  // every save when the field is just being re-sent unchanged).
  if (barcode !== undefined && barcode !== product.barcode) {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      res.status(403);
      throw new Error('Only Admin or Manager can edit the barcode');
    }

    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) {
      res.status(400);
      throw new Error('Barcode cannot be empty');
    }

    const existing = await Product.findOne({
      barcode: trimmedBarcode,
      _id: { $ne: product._id },
    });
    if (existing) {
      res.status(400);
      throw new Error('This barcode is already used by another product');
    }

    product.barcode = trimmedBarcode;
  }

  const updated = await product.save(); // status recalculated automatically via pre('save')

  await logActivity(req.user._id, `Updated product "${updated.name}"`, 'product');

  res.status(200).json({ success: true, message: 'Product updated', product: updated });
});
