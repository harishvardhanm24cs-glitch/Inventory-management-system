import db from '../config/db.js';
import { processThresholdCheck, processRackOccupancyCheck } from '../services/alertService.js';
import { logQrHistory } from '../utils/qrHistory.js';
import { getRackMaterials as fetchRackMaterials } from '../services/rackService.js';
import { logAudit } from '../utils/auditLogger.js';
import { getNextRackCode } from '../utils/rackHelper.js';

/**
 * Get all racks
 * GET /api/racks
 */
export const getAllRacks = async (req, res, next) => {
  try {
    const [racks] = await db.query('SELECT r.*, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code ORDER BY r.rack_code ASC');
    
    const mappedRacks = racks.map(rack => {
      const qty = parseFloat(rack.quantity) || 0;
      const maxCap = parseFloat(rack.max_capacity) || 1;
      const occPercent = rack.occupancy_percentage !== undefined && rack.occupancy_percentage !== null
        ? parseFloat(rack.occupancy_percentage)
        : (maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00);
      const statusColor = occPercent > 80 ? 'RED' : occPercent > 40 ? 'YELLOW' : 'GREEN';
      return {
        ...rack,
        rack_name: rack.rack_code,
        capacity: maxCap,
        current_stock: qty,
        occupancy_percentage: occPercent,
        occupancyPercentage: occPercent,
        status_color: statusColor
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
    const [racks] = await db.query('SELECT r.*, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code WHERE r.id = ?', [id]);

    if (racks.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Rack with ID '${id}' not found`
      });
    }

    const rack = racks[0];
    const qty = parseFloat(rack.quantity) || 0;
    const maxCap = parseFloat(rack.max_capacity) || 1;
    const occPercent = rack.occupancy_percentage !== undefined && rack.occupancy_percentage !== null
      ? parseFloat(rack.occupancy_percentage)
      : (maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00);
    
    const statusColor = occPercent > 80 ? 'RED' : occPercent > 40 ? 'YELLOW' : 'GREEN';
    const mappedRack = {
      ...rack,
      rack_name: rack.rack_code,
      capacity: maxCap,
      current_stock: qty,
      occupancy_percentage: occPercent,
      occupancyPercentage: occPercent,
      status_color: statusColor
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
    const [newRack] = await db.query('SELECT r.*, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code WHERE r.id = ?', [rackId]);

    const createdRack = newRack[0];
    const createdQty = parseFloat(createdRack.quantity) || 0;
    const createdMaxCap = parseFloat(createdRack.max_capacity) || 1;
    const createdOccPercent = createdRack.occupancy_percentage !== undefined && createdRack.occupancy_percentage !== null
      ? parseFloat(createdRack.occupancy_percentage)
      : (createdMaxCap > 0 ? parseFloat(((createdQty / createdMaxCap) * 100).toFixed(2)) : 0.00);

    const statusColor = createdOccPercent > 80 ? 'RED' : createdOccPercent > 40 ? 'YELLOW' : 'GREEN';
    const mappedRack = {
      ...createdRack,
      rack_name: createdRack.rack_code,
      capacity: createdMaxCap,
      current_stock: createdQty,
      occupancy_percentage: createdOccPercent,
      occupancyPercentage: createdOccPercent,
      status_color: statusColor
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

    const finalQty = qty !== undefined ? qty : parseFloat(currentRack.quantity) || 0;
    const finalMaxCap = maxCap !== undefined ? maxCap : parseFloat(currentRack.max_capacity) || 100.00;

    if (finalQty === 0) {
      await db.query('DELETE FROM racks WHERE id = ?', [id]);
      console.log(`[updateRack] Deleted rack ID: ${id} because its quantity became 0.`);
      return res.status(200).json({
        status: 'success',
        message: 'Rack deleted successfully as quantity became 0',
        rack: {
          id: parseInt(id, 10),
          rack_code: currentRack.rack_code,
          rack_name: currentRack.rack_code,
          material_name: null,
          batch_number: null,
          quantity: 0.00,
          current_stock: 0.00,
          max_capacity: finalMaxCap,
          capacity: finalMaxCap,
          threshold_limit: limit !== undefined ? limit : parseFloat(currentRack.threshold_limit) || 10.00,
          status: 'empty',
          occupancy_percentage: 0.00,
          occupancyPercentage: 0.00,
          status_color: 'GREEN'
        }
      });
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
    const [updated] = await db.query('SELECT r.*, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code WHERE r.id = ?', [id]);

    const updatedRack = updated[0];
    const updatedQty = parseFloat(updatedRack.quantity) || 0;
    const updatedMaxCap = parseFloat(updatedRack.max_capacity) || 1;
    const updatedOccPercent = updatedRack.occupancy_percentage !== undefined && updatedRack.occupancy_percentage !== null
      ? parseFloat(updatedRack.occupancy_percentage)
      : (updatedMaxCap > 0 ? parseFloat(((updatedQty / updatedMaxCap) * 100).toFixed(2)) : 0.00);

    const statusColor = updatedOccPercent > 80 ? 'RED' : updatedOccPercent > 40 ? 'YELLOW' : 'GREEN';
    const mappedRack = {
      ...updatedRack,
      rack_name: updatedRack.rack_code,
      capacity: updatedMaxCap,
      current_stock: updatedQty,
      occupancy_percentage: updatedOccPercent,
      occupancyPercentage: updatedOccPercent,
      status_color: statusColor
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

/**
 * Get all empty racks
 * GET /api/racks/empty
 */
export const getEmptyRacks = async (req, res, next) => {
  try {
    const [racks] = await db.query('SELECT r.*, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code WHERE r.quantity = 0 ORDER BY r.rack_code ASC');
    
    const mappedRacks = racks.map(rack => {
      const qty = parseFloat(rack.quantity) || 0;
      const maxCap = parseFloat(rack.max_capacity) || 1;
      const occPercent = rack.occupancy_percentage !== undefined && rack.occupancy_percentage !== null
        ? parseFloat(rack.occupancy_percentage)
        : (maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00);
      const statusColor = occPercent > 80 ? 'RED' : occPercent > 40 ? 'YELLOW' : 'GREEN';
      return {
        ...rack,
        rack_name: rack.rack_code,
        capacity: maxCap,
        current_stock: qty,
        occupancy_percentage: occPercent,
        occupancyPercentage: occPercent,
        status_color: statusColor
      };
    });

    console.log('Empty racks fetched. Count:', mappedRacks.length);

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
 * Automatically or explicitly assign a rack to a material
 * POST /api/racks/assign
 */
export const assignRack = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { material_id, quantity, rack_code } = req.body;

    if (!material_id || quantity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide material_id and quantity'
      });
    }

    const scannedQty = parseFloat(quantity);
    if (isNaN(scannedQty) || scannedQty <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
      });
    }

    await connection.beginTransaction();

    // 1. Fetch material by ID
    const [materials] = await connection.query(
      'SELECT material_name, batch_number, quantity, threshold_limit, unit, barcode FROM materials WHERE id = ?',
      [material_id]
    );

    if (materials.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: 'error',
        message: `Material with ID ${material_id} not found`
      });
    }

    const materialName = materials[0].material_name;
    const batchNumber = materials[0].batch_number;
    const currentMaterialQty = parseFloat(materials[0].quantity) || 0;
    const thresholdLimit = parseFloat(materials[0].threshold_limit) || 0;
    const unit = materials[0].unit || 'KG';

    // 2. Prevent duplicate assignment within a 5-second window
    const [recentTx] = await connection.query(
      `SELECT id FROM transactions 
       WHERE material_id = ? AND transaction_type = 'inward' 
       AND quantity = ? AND created_at >= NOW() - INTERVAL 5 SECOND`,
      [material_id, scannedQty]
    );

    if (recentTx.length > 0) {
      console.warn(`[Rack Assign] Duplicate assignment blocked for material ID: ${material_id}`);
      
      // Query the rack where this material is assigned to return it to the client
      const [existingAssigned] = await connection.query(
        'SELECT rack_code FROM racks WHERE material_name = ? ORDER BY quantity DESC LIMIT 1',
        [materialName]
      );
      const targetRackCode = existingAssigned.length > 0 ? existingAssigned[0].rack_code : null;

      await connection.rollback();
      return res.status(200).json({
        success: true,
        rack_code: targetRackCode,
        message: 'Duplicate assignment ignored (already processed in the last 5 seconds)'
      });
    }

    // 3. Determine target rack
    let targetRackCode = rack_code;

    // RACK DEBUG logging
    const [dbRacks] = await connection.query('SELECT * FROM racks');
    const racks = dbRacks.map(r => ({
      ...r,
      current_capacity: r.quantity
    }));

    console.log("===== RACK DEBUG =====");
    console.log("Quantity:", quantity);
    console.log("Racks fetched:", racks);

    for (const rack of racks) {
      console.log({
        rack: rack.rack_code,
        max: rack.max_capacity,
        current: rack.current_capacity,
        available:
          Number(rack.max_capacity) -
          Number(rack.current_capacity)
      });
    }

    if (!targetRackCode) {
      // Find rack with lowest occupancy that is empty or has the same material
      const [racks] = await connection.query(
        `SELECT rack_code FROM racks 
         WHERE (quantity = 0 OR material_name IS NULL OR material_name = ?) 
         ORDER BY (quantity / max_capacity) ASC 
         LIMIT 1`,
        [materialName]
      );

      if (racks.length > 0) {
        targetRackCode = racks[0].rack_code;
      } else {
        // Automatically allocate the next available rack dynamically!
        const [existingRacksList] = await connection.query('SELECT rack_code FROM racks');
        const existingCodes = existingRacksList.map(r => r.rack_code);
        targetRackCode = getNextRackCode(existingCodes);
        console.log(`Auto-assigning rack: All occupied. Allocated next available rack: ${targetRackCode}`);
      }
    }

    // 4. Fetch/update target rack
    const [existingRacks] = await connection.query(
      'SELECT id, quantity, max_capacity, material_name FROM racks WHERE rack_code = ?',
      [targetRackCode]
    );

    if (existingRacks.length > 0) {
      const rack = existingRacks[0];
      const rackQty = parseFloat(rack.quantity) || 0;

      // Prevent duplicate assignment conflict: if rack has another material
      if (rackQty > 0 && rack.material_name && rack.material_name !== materialName) {
        await connection.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Rack ${targetRackCode} is already assigned to a different material: ${rack.material_name}`
        });
      }

      const maxCap = parseFloat(rack.max_capacity) || 999999999.00;
      const newRackQty = rackQty + scannedQty;

      await connection.query(
        'UPDATE racks SET material_name = ?, batch_number = ?, quantity = ? WHERE rack_code = ?',
        [materialName, batchNumber || null, newRackQty, targetRackCode]
      );
    } else {
      const maxCap = 999999999.00;
      
      // Create new rack if it doesn't exist
      await connection.query(
        'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, ?, ?, ?, ?, ?)',
        [targetRackCode, materialName, batchNumber || null, scannedQty, maxCap, 10.00]
      );
    }

    // 5. Update material quantity in materials table
    const newMaterialQty = currentMaterialQty + scannedQty;
    await connection.query(
      'UPDATE materials SET quantity = ? WHERE id = ?',
      [newMaterialQty, material_id]
    );

    // 6. Insert transaction
    await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity, user_id) VALUES (?, ?, ?, ?)',
      [material_id, 'inward', scannedQty, req.user ? req.user.id : null]
    );

    // 6.5. Log QR history lifecycle event (MOVED)
    await logQrHistory(connection, {
      barcode_id: materials[0].barcode,
      material_name: materialName,
      action: 'MOVED',
      rack_code: targetRackCode,
      user_id: req.user ? req.user.id : null,
      remarks: `Material assigned/moved to rack ${targetRackCode}`
    });

    await connection.commit();

    // 7. Check alerts and rack occupancy warnings
    await processThresholdCheck(null, material_id);
    await processRackOccupancyCheck(null, targetRackCode);
    console.log("Alerts and rack occupancy checked");

    res.status(200).json({
      success: true,
      rack_code: targetRackCode
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Get all materials assigned to a specific rack
 * GET /api/racks/:rackCode/materials
 *
 * Success (rack found, with or without materials):
 *   200 { success: true, rack_code, material_count, total_weight, materials[] }
 *
 * Rack not found:
 *   404 { success: false, message }
 */
export const getRackMaterials = async (req, res, next) => {
  try {
    const { rackCode } = req.params;

    // Validate rackCode is present
    if (!rackCode || !rackCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rack code is required'
      });
    }

    const code = rackCode.trim().toUpperCase();

    // Delegate to service layer
    const { exists, rack, materials } = await fetchRackMaterials(code);

    // Rack does not exist in DB
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Rack '${code}' not found`
      });
    }

    // Compute aggregates
    const materialCount = materials.length;
    const totalWeight   = materials.reduce(
      (sum, mat) => sum + (parseFloat(mat.weight) || 0),
      0
    );

    // Shape each material for the response
    const formattedMaterials = materials.map(mat => ({
      material_name:  mat.material_name,
      qr_code:        mat.qr_code        || null,
      quantity:       parseFloat(mat.quantity)  || 0,
      weight:         parseFloat(mat.weight)    || 0,
      unit:           mat.unit           || 'KG',
      batch_number:   mat.batch_number   || null,
      rack_code:      mat.rack_code,
      status:         mat.status         || 'ACTIVE',
      last_scan_time: mat.last_scan_time || null,
      created_at:     mat.created_at     || null,
    }));

    console.log(`[getRackMaterials] rack=${code}, found=${materialCount} material(s)`);

    // Always 200 — empty racks return an empty materials array, never 404
    return res.status(200).json({
      success:        true,
      rack_code:      code,
      material_count: materialCount,
      total_weight:   totalWeight,
      materials:      formattedMaterials
    });
  } catch (error) {
    console.error('[getRackMaterials] Error:', error.message);
    next(error);
  }
};
