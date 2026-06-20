const asyncHandler = require('express-async-handler');
const RackInventory = require('../models/rackInventoryModel');

/**
 * @desc    Get all rack inventory for Digital Twin Phase 1.1 warehouse floor
 * @route   GET /api/rack-inventory
 * @access  Private
 */
const getAllRackInventory = asyncHandler(async (req, res) => {
  // Ensure default 12 racks exist
  await RackInventory.ensureDefaultRacks();

  const racks = await RackInventory.getAll();

  // Transform and compute color status
  const transformed = racks.map(rack => {
    const occ = parseFloat(rack.occupancy_percentage) || 0;
    let color_status;
    if (occ === 0)        color_status = 'GRAY';
    else if (occ <= 40)   color_status = 'GREEN';
    else if (occ <= 80)   color_status = 'YELLOW';
    else                  color_status = 'RED';

    return {
      id: rack.id,
      rack_code: rack.rack_code,
      zone_name: rack.zone_name,
      current_capacity: parseFloat(rack.current_capacity) || 0,
      max_capacity: parseFloat(rack.max_capacity) || 100,
      occupancy_percentage: occ,
      color_status,
      last_scan: rack.last_scan || null,
      last_updated: rack.updated_at || null,
      materials: (rack.materials || []).map(m => ({
        id: m.id,
        material_name: m.material_name,
        bucket_count: m.bucket_count || 0,
        weight_kg: parseFloat(m.weight_kg) || 0,
        last_scan: m.last_scan || null
      }))
    };
  });


  res.status(200).json({
    success: true,
    data: transformed
  });
});

/**
 * @desc    Get single rack by rack_code
 * @route   GET /api/rack-inventory/:rackCode
 * @access  Private
 */
const getRackByCode = asyncHandler(async (req, res) => {
  const rack = await RackInventory.getByCode(req.params.rackCode);
  if (!rack) {
    res.status(404);
    throw new Error(`Rack ${req.params.rackCode} not found`);
  }

  const occ = parseFloat(rack.occupancy_percentage) || 0;
  let color_status;
  if (occ === 0)        color_status = 'GRAY';
  else if (occ <= 40)   color_status = 'GREEN';
  else if (occ <= 80)   color_status = 'YELLOW';
  else                  color_status = 'RED';

  res.status(200).json({
    success: true,
    data: {
      ...rack,
      current_capacity: parseFloat(rack.current_capacity) || 0,
      max_capacity: parseFloat(rack.max_capacity) || 100,
      occupancy_percentage: occ,
      color_status
    }
  });
});

/**
 * @desc    Update rack capacity (current_capacity and/or max_capacity)
 * @route   PUT /api/rack-inventory/:rackCode
 * @access  Private
 */
const updateRackCapacity = asyncHandler(async (req, res) => {
  const { current_capacity, max_capacity } = req.body;
  const { rackCode } = req.params;

  const rack = await RackInventory.getByCode(rackCode);
  if (!rack) {
    res.status(404);
    throw new Error(`Rack ${rackCode} not found`);
  }

  const newCurrent = current_capacity !== undefined
    ? parseFloat(current_capacity)
    : parseFloat(rack.current_capacity);

  const newMax = max_capacity !== undefined
    ? parseFloat(max_capacity)
    : parseFloat(rack.max_capacity);

  if (isNaN(newCurrent) || newCurrent < 0 || newCurrent > newMax) {
    res.status(400);
    throw new Error('current_capacity must be a number between 0 and max_capacity');
  }

  await RackInventory.upsert(rackCode, rack.zone_name, newCurrent, newMax);

  const updated = await RackInventory.getByCode(rackCode);
  const occ = parseFloat(updated.occupancy_percentage) || 0;
  let color_status;
  if (occ === 0)        color_status = 'GRAY';
  else if (occ <= 40)   color_status = 'GREEN';
  else if (occ <= 80)   color_status = 'YELLOW';
  else                  color_status = 'RED';

  res.status(200).json({
    success: true,
    data: { ...updated, color_status }
  });
});

module.exports = {
  getAllRackInventory,
  getRackByCode,
  updateRackCapacity
};
