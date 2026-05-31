const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Material = require('../models/materialModel');
const Transaction = require('../models/transactionModel');

// @desc    Process inward stock scan
// @route   POST /api/scan/inward
// @access  Private
const scanInward = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { barcode, quantity } = req.body;
  const parsedQty = parseFloat(quantity);

  const material = await Material.findByBarcode(barcode);
  if (!material) {
    res.status(404);
    throw new Error('Material not found for this barcode');
  }

  const previousStock = parseFloat(material.quantity);
  const newStock = previousStock + parsedQty;

  // Update Material
  await Material.update(material.id, { ...material, quantity: newStock });

  // Log Transaction
  await Transaction.logTransaction(material.id, req.user.id, 'inward', parsedQty, previousStock, newStock);

  const updatedMaterial = await Material.findById(material.id);

  res.status(200).json({
    success: true,
    message: 'Inward scan successful',
    transaction_type: 'inward',
    added_quantity: parsedQty,
    data: updatedMaterial
  });
});

// @desc    Process outward stock scan
// @route   POST /api/scan/outward
// @access  Private
const scanOutward = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { barcode, quantity } = req.body;
  const parsedQty = parseFloat(quantity);

  const material = await Material.findByBarcode(barcode);
  if (!material) {
    res.status(404);
    throw new Error('Material not found for this barcode');
  }

  const previousStock = parseFloat(material.quantity);
  
  if (parsedQty > previousStock) {
    res.status(400);
    throw new Error(`Insufficient stock! Current stock is ${previousStock} ${material.unit}.`);
  }

  const newStock = previousStock - parsedQty;

  // Update Material
  await Material.update(material.id, { ...material, quantity: newStock });

  // Log Transaction
  await Transaction.logTransaction(material.id, req.user.id, 'outward', parsedQty, previousStock, newStock);

  const updatedMaterial = await Material.findById(material.id);

  res.status(200).json({
    success: true,
    message: 'Outward scan successful',
    transaction_type: 'outward',
    deducted_quantity: parsedQty,
    data: updatedMaterial
  });
});

module.exports = {
  scanInward,
  scanOutward
};
