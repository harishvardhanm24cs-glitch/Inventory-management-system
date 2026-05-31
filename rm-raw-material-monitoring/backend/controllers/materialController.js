const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Material = require('../models/materialModel');

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
const getMaterials = asyncHandler(async (req, res) => {
  const materials = await Material.findAll();
  
  // Check for thresholds
  const lowStock = materials.filter(m => m.quantity <= m.threshold_limit);

  res.status(200).json({
    success: true,
    count: materials.length,
    alerts: lowStock.length > 0 ? `${lowStock.length} items are low on stock!` : null,
    data: materials
  });
});

// @desc    Get single material by barcode
// @route   GET /api/materials/:barcode
// @access  Private
const getMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findByBarcode(req.params.barcode);
  
  if (!material) {
    res.status(404);
    throw new Error('Material not found with this barcode');
  }

  res.status(200).json({
    success: true,
    data: material
  });
});

// @desc    Add a new material
// @route   POST /api/materials
// @access  Private (Manager & Engineer)
const addMaterial = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  // Prevent duplicate barcodes
  const existing = await Material.findByBarcode(req.body.barcode);
  if (existing) {
    res.status(400);
    throw new Error('Material with this barcode already exists');
  }

  const insertId = await Material.create(req.body);
  const newMaterial = await Material.findById(insertId);

  res.status(201).json({
    success: true,
    data: newMaterial
  });
});

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private (Manager & Engineer)
const updateMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  const updatedData = {
    barcode: req.body.barcode || material.barcode,
    material_name: req.body.material_name || material.material_name,
    quantity: req.body.quantity !== undefined ? req.body.quantity : material.quantity,
    threshold_limit: req.body.threshold_limit !== undefined ? req.body.threshold_limit : material.threshold_limit,
    unit: req.body.unit || material.unit,
    batch_number: req.body.batch_number || material.batch_number
  };

  await Material.update(req.params.id, updatedData);
  const updatedMaterial = await Material.findById(req.params.id);

  res.status(200).json({
    success: true,
    data: updatedMaterial
  });
});

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private (Manager only)
const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  await Material.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Material removed'
  });
});

module.exports = {
  getMaterials,
  getMaterial,
  addMaterial,
  updateMaterial,
  deleteMaterial
};
