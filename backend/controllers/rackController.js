import db from '../config/db.js';

/**
 * Get all racks
 * GET /api/racks
 */
export const getAllRacks = async (req, res, next) => {
  try {
    const [racks] = await db.query('SELECT * FROM racks ORDER BY rack_code ASC');
    
    const mappedRacks = racks.map(rack => {
      const qty = parseFloat(rack.quantity) || 0;
      const maxCap = parseFloat(rack.max_capacity) || 1;
      const occPercent = maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00;
      return {
        ...rack,
        occupancy_percentage: occPercent,
        occupancyPercentage: occPercent
      };
    });

    console.log('Racks fetched. Count:', mappedRacks.length);

    res.status(200).json({
      status: 'success',
      results: mappedRacks.length,
      racks: mappedRacks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single rack by ID
 * GET /api/racks/:id
 */
export const getRackById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [racks] = await db.query('SELECT * FROM racks WHERE id = ?', [id]);

    if (racks.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Rack with ID '${id}' not found`
      });
    }

    const rack = racks[0];
    const qty = parseFloat(rack.quantity) || 0;
    const maxCap = parseFloat(rack.max_capacity) || 1;
    const occPercent = maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00;
    
    const mappedRack = {
      ...rack,
      occupancy_percentage: occPercent,
      occupancyPercentage: occPercent
    };

    console.log('Rack fetched. ID:', id);

    res.status(200).json({
      status: 'success',
      rack: mappedRack
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new rack
 * POST /api/racks
 */
export const createRack = async (req, res, next) => {
  try {
    const { rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit } = req.body;

    // Validate rack_code
    if (!rack_code) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide rack_code'
      });
    }

    const qty = quantity !== undefined ? parseFloat(quantity) : 0.00;
    const maxCap = max_capacity !== undefined ? parseFloat(max_capacity) : 100.00;
    const limit = threshold_limit !== undefined ? parseFloat(threshold_limit) : 10.00;

    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
      });
    }

    if (isNaN(maxCap) || maxCap < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Max capacity must be a positive number'
      });
    }

    if (isNaN(limit) || limit < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Threshold limit must be a positive number'
      });
    }

    // Check for duplicate rack_code
    const [existing] = await db.query('SELECT id FROM racks WHERE rack_code = ?', [rack_code]);
    if (existing.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Rack with code '${rack_code}' already exists`
      });
    }

    // Insert into MySQL (Trigger will auto-calculate status)
    const [result] = await db.query(
      'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, ?, ?, ?, ?, ?)',
      [rack_code, material_name || null, batch_number || null, qty, maxCap, limit]
    );

    const rackId = result.insertId;

    // Fetch the newly created rack to return updated status
    const [newRack] = await db.query('SELECT * FROM racks WHERE id = ?', [rackId]);

    const createdRack = newRack[0];
    const createdQty = parseFloat(createdRack.quantity) || 0;
    const createdMaxCap = parseFloat(createdRack.max_capacity) || 1;
    const createdOccPercent = createdMaxCap > 0 ? parseFloat(((createdQty / createdMaxCap) * 100).toFixed(2)) : 0.00;

    const mappedRack = {
      ...createdRack,
      occupancy_percentage: createdOccPercent,
      occupancyPercentage: createdOccPercent
    };

    res.status(201).json({
      status: 'success',
      message: 'Rack created successfully',
      rack: mappedRack
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update rack details
 * PUT /api/racks/:id
 */
export const updateRack = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit } = req.body;

    // Validate rack exists
    const [existing] = await db.query('SELECT * FROM racks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Rack not found'
      });
    }

    const currentRack = existing[0];

    // Validate fields if provided
    const qty = quantity !== undefined && quantity !== null ? parseFloat(quantity) : undefined;
    if (qty !== undefined && (isNaN(qty) || qty < 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
      });
    }

    const maxCap = max_capacity !== undefined && max_capacity !== null ? parseFloat(max_capacity) : undefined;
    if (maxCap !== undefined && (isNaN(maxCap) || maxCap < 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Max capacity must be a positive number'
      });
    }

    const limit = threshold_limit !== undefined && threshold_limit !== null ? parseFloat(threshold_limit) : undefined;
    if (limit !== undefined && (isNaN(limit) || limit < 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Threshold limit must be a positive number'
      });
    }

    // Check duplicate rack_code if it is being changed
    if (rack_code && rack_code !== currentRack.rack_code) {
      const [duplicate] = await db.query('SELECT id FROM racks WHERE rack_code = ?', [rack_code]);
      if (duplicate.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Rack with code '${rack_code}' already exists`
        });
      }
    }

    // Update fields dynamically (Trigger will auto-calculate status on update)
    await db.query(
      `UPDATE racks SET 
        rack_code = COALESCE(?, rack_code), 
        material_name = COALESCE(?, material_name), 
        batch_number = COALESCE(?, batch_number), 
        quantity = COALESCE(?, quantity), 
        max_capacity = COALESCE(?, max_capacity), 
        threshold_limit = COALESCE(?, threshold_limit) 
       WHERE id = ?`,
      [
        rack_code || null,
        material_name || null,
        batch_number || null,
        qty !== undefined ? qty : null,
        maxCap !== undefined ? maxCap : null,
        limit !== undefined ? limit : null,
        id
      ]
    );

    // Fetch updated record from MySQL
    const [updated] = await db.query('SELECT * FROM racks WHERE id = ?', [id]);

    const updatedRack = updated[0];
    const updatedQty = parseFloat(updatedRack.quantity) || 0;
    const updatedMaxCap = parseFloat(updatedRack.max_capacity) || 1;
    const updatedOccPercent = updatedMaxCap > 0 ? parseFloat(((updatedQty / updatedMaxCap) * 100).toFixed(2)) : 0.00;

    const mappedRack = {
      ...updatedRack,
      occupancy_percentage: updatedOccPercent,
      occupancyPercentage: updatedOccPercent
    };

    console.log('Rack updated:', mappedRack);

    res.status(200).json({
      status: 'success',
      message: 'Rack updated successfully',
      rack: mappedRack
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete rack
 * DELETE /api/racks/:id
 */
export const deleteRack = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT id FROM racks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Rack not found'
      });
    }

    await db.query('DELETE FROM racks WHERE id = ?', [id]);

    console.log('Rack deleted ID:', id);

    res.status(200).json({
      status: 'success',
      message: 'Rack deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
