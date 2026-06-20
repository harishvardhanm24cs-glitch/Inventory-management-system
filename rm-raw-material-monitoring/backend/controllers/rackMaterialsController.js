const asyncHandler = require('express-async-handler');
const RackMaterials = require('../models/rackMaterialsModel');

/**
 * @desc    Get materials stored inside a rack
 * @route   GET /api/racks/:rackCode/materials
 * @access  Private
 */
const getRackMaterials = asyncHandler(async (req, res) => {
  const rackCode = req.params.rackCode;
  const data = await RackMaterials.getByRackCode(rackCode);

  if (!data) {
    res.status(404);
    throw new Error(`Rack ${rackCode} not found`);
  }

  // Format output to match Phase 2 API specifications exactly
  res.status(200).json({
    rack_code: data.rack_code,
    occupancy_percentage: data.occupancy_percentage,
    materials: data.materials.map(m => ({
      material_name: m.material_name,
      quantity: m.quantity,
      weight: m.weight,
      threshold_limit: m.threshold_limit,
      unit: m.unit
    }))
  });
});

module.exports = {
  getRackMaterials
};
