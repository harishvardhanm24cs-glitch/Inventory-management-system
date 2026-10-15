const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const Material = require('../models/materialModel');

const getMaterials = asyncHandler(async (req, res) => {
  const materials = await Material.findAll();
  
  
  const lowStock = materials.filter(m => m.quantity <= m.threshold_limit);

  res.status(200).json({
    success: true,
    count: materials.length,
    alerts: lowStock.length > 0 ? `${lowStock.length} items are low on stock!` : null,
    data: materials
  });
});

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

const addMaterial = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  
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
