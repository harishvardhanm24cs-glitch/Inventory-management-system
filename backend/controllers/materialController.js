import db from '../config/db.js';
import { processThresholdCheck, processRackOccupancyCheck } from '../services/alertService.js';
import { logQrHistory } from '../utils/qrHistory.js';
import { logAudit } from '../utils/auditLogger.js';
import { getNextRackCode } from '../utils/rackHelper.js';

/**
 * Reusable helper to check low-stock threshold limit,
 * output console warnings, and trigger asynchronous Gmail alerts.
 * 
 * @param {object} material - The material record
 * @returns {string|null} The warning message if stock is low, otherwise null
 */



/**
 * Synchronizes material stock changes with the racks table.
 * Finds the rack containing the material (or grabs/creates one if needed)
 * and updates its quantity.
 * 
 * @param {object} connection - The database connection/pool
 * @param {string} materialName - The name of the material
 * @param {number} quantityChange - The quantity diff (positive or negative)
 * @param {string} batchNumber - Optional batch number
 */
const syncMaterialToRack = async (connection, materialName, quantityChange, batchNumber = null) => {
  if (!materialName || quantityChange === 0) return;

  console.log(`[Rack Sync] Syncing material '${materialName}' with qty change: ${quantityChange}`);

  // 1. Look for a rack containing this material
  const [existingRacks] = await connection.query(
    'SELECT id, rack_code, quantity, max_capacity, material_name FROM racks WHERE material_name = ? LIMIT 1',
    [materialName]
  );

  if (existingRacks.length > 0) {
    const rack = existingRacks[0];
    const newQty = Math.max(0, (parseFloat(rack.quantity) || 0) + quantityChange);
    
    if (newQty === 0) {
      // Delete empty racks to store only used racks in database
      await connection.query(
        'DELETE FROM racks WHERE id = ?',
        [rack.id]
      );
      console.log(`[Rack Sync] Rack ${rack.rack_code} deleted because its quantity became 0.`);
    } else {
      await connection.query(
        'UPDATE racks SET quantity = ?, batch_number = COALESCE(?, batch_number) WHERE id = ?',
        [newQty, batchNumber, rack.id]
      );
      console.log(`[Rack Sync] Updated rack ${rack.rack_code} quantity to ${newQty}`);
    }
  } else if (quantityChange > 0) {
    // 2. If no rack exists for this material, find an empty rack to assign it to
    const [emptyRacks] = await connection.query(
      'SELECT id, rack_code, max_capacity FROM racks WHERE quantity = 0 OR material_name IS NULL ORDER BY rack_code ASC LIMIT 1'
    );

    if (emptyRacks.length > 0) {
      const rack = emptyRacks[0];
      await connection.query(
        'UPDATE racks SET material_name = ?, batch_number = ?, quantity = ? WHERE id = ?',
        [materialName, batchNumber, quantityChange, rack.id]
      );
      console.log(`[Rack Sync] Assigned material '${materialName}' to empty rack ${rack.rack_code} with quantity ${quantityChange}`);
    } else {
      // 3. If no empty rack is found, create a new one automatically using Excel-style naming
      const [existingRacksList] = await connection.query('SELECT rack_code FROM racks');
      const existingCodes = existingRacksList.map(r => r.rack_code);
      const generatedRackCode = getNextRackCode(existingCodes);
      const maxCap = 999999999.00;

      await connection.query(
        'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, ?, ?, ?, ?, ?)',
        [generatedRackCode, materialName, batchNumber, quantityChange, maxCap, 10.00]
      );
      console.log(`[Rack Sync] Created new dynamic rack ${generatedRackCode} for material '${materialName}' with quantity ${quantityChange}`);
    }
  }
};


/**
 * Get all materials
 * GET /api/materials
 */
export const getAllMaterials = async (req, res, next) => {
  try {
    const [materials] = await db.query(
      `SELECT m.*, (SELECT r.rack_code FROM racks r WHERE r.material_name = m.material_name LIMIT 1) AS location 
       FROM materials m 
       ORDER BY m.created_at DESC`
    );
    res.status(200).json({
      status: 'success',
      results: materials.length,
      materials
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single material by barcode
 * GET /api/materials/:barcode
 */
export const getMaterialByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const [materials] = await db.query(
      `SELECT m.*, (SELECT r.rack_code FROM racks r WHERE r.material_name = m.material_name LIMIT 1) AS location 
       FROM materials m 
       WHERE m.barcode = ?`,
      [barcode]
    );

    if (materials.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Material with barcode '${barcode}' not found`
      });
    }

    res.status(200).json({
      status: 'success',
      material: materials[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new material
 * POST /api/materials
 */
export const createMaterial = async (req, res, next) => {
  try {
    const { barcode, material_name, quantity, threshold_limit, unit, batch_number } = req.body;

    // Validate fields
    if (!barcode || !material_name || !unit) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide barcode, material_name, and unit'
      });
    }

    const qty = quantity !== undefined ? parseFloat(quantity) : 0.00;
    const limit = threshold_limit !== undefined ? parseFloat(threshold_limit) : 0.00;

    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
      });
    }

    if (isNaN(limit) || limit < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Threshold limit must be a positive number'
      });
    }

    // Check for duplicate barcode
    const [existing] = await db.query('SELECT id FROM materials WHERE barcode = ?', [barcode]);
    if (existing.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Barcode already exists in the inventory'
      });
    }

    // Insert into MySQL
    const [result] = await db.query(
      'INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number) VALUES (?, ?, ?, ?, ?, ?)',
      [barcode, material_name, qty, limit, unit, batch_number || null]
    );

    const materialId = result.insertId;

    // Sync with rack if initial quantity > 0
    if (qty > 0) {
      await syncMaterialToRack(db, material_name, qty, batch_number || null);
    }

    // Process alerts check
    const alertResult = await processThresholdCheck(null, materialId);

    // Find assigned rack and check its occupancy
    const [assigned] = await db.query('SELECT rack_code FROM racks WHERE material_name = ?', [material_name]);
    if (assigned.length > 0) {
      await processRackOccupancyCheck(null, assigned[0].rack_code);
    }

    await logQrHistory(db, {
      barcode_id: barcode,
      material_name,
      action: 'INWARD',
      rack_code: assigned.length > 0 ? assigned[0].rack_code : null,
      user_id: req.user ? req.user.id : null,
      remarks: `Material added with initial stock of ${qty} ${unit}`
    });

    // Fetch the newly created material
    const [newMaterial] = await db.query(
      `SELECT m.*, (SELECT r.rack_code FROM racks r WHERE r.material_name = m.material_name LIMIT 1) AS location 
       FROM materials m 
       WHERE m.id = ?`,
      [materialId]
    );
    const createdMaterial = newMaterial[0];

    // Log Material Created
    let userName = 'System';
    if (req.user && req.user.id) {
      const [users] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) userName = users[0].name;
    }
    await logAudit({
      action_type: 'Material Created',
      material_name,
      qr_code: barcode,
      user_name: userName,
      action_details: `Registered new raw material: ${material_name} (Barcode: ${barcode})`
    });

    res.status(201).json({
      status: 'success',
      message: 'Material created successfully',
      material: createdMaterial,
      warning: alertResult?.alertGenerated ? alertResult.message : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update material metadata
 * PUT /api/materials/:id
 */
export const updateMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { material_name, quantity, threshold_limit, unit, batch_number, barcode, location } = req.body;

    // Validate material exists
    const [existing] = await db.query('SELECT id, material_name, quantity, batch_number, barcode FROM materials WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

    const oldMaterial = existing[0];
    const oldQty = parseFloat(oldMaterial.quantity) || 0;
    const oldName = oldMaterial.material_name;
    const oldBatch = oldMaterial.batch_number;

    // Validate quantity if provided
    const qty = quantity !== undefined && quantity !== null ? parseFloat(quantity) : undefined;
    if (qty !== undefined && (isNaN(qty) || qty < 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
      });
    }

    // Validate threshold_limit if provided
    const limit = threshold_limit !== undefined && threshold_limit !== null ? parseFloat(threshold_limit) : undefined;
    if (limit !== undefined && (isNaN(limit) || limit < 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Threshold limit must be a positive number'
      });
    }

    // Update material fields dynamically in MySQL
    await db.query(
      'UPDATE materials SET material_name = COALESCE(?, material_name), quantity = COALESCE(?, quantity), threshold_limit = COALESCE(?, threshold_limit), unit = COALESCE(?, unit), batch_number = COALESCE(?, batch_number), barcode = COALESCE(?, barcode) WHERE id = ?',
      [
        material_name || null,
        qty !== undefined ? qty : null,
        limit !== undefined ? limit : null,
        unit || null,
        batch_number || null,
        barcode || null,
        id
      ]
    );

    // Sync renaming
    if (material_name && material_name !== oldName) {
      await db.query(
        'UPDATE racks SET material_name = ? WHERE material_name = ?',
        [material_name, oldName]
      );
    }

    // Sync batch number
    if (batch_number && batch_number !== oldBatch) {
      await db.query(
        'UPDATE racks SET batch_number = ? WHERE material_name = ?',
        [batch_number, material_name || oldName]
      );
    }

    let locationMoved = false;
    if (location !== undefined) {
      const [oldRacks] = await db.query('SELECT rack_code, quantity FROM racks WHERE material_name = ?', [oldName]);
      const oldRackCode = oldRacks.length > 0 ? oldRacks[0].rack_code : null;
      const targetLocation = location ? location.trim().toUpperCase() : 'UNASSIGNED';

      if (targetLocation !== oldRackCode) {
        locationMoved = true;
        const finalQty = qty !== undefined ? qty : oldQty;
        const currentMaterialName = material_name || oldName;
        const currentBatchNumber = batch_number || oldBatch;

        // 1. Delete/clear old rack association
        if (oldRackCode) {
          await db.query('DELETE FROM racks WHERE rack_code = ? AND material_name = ?', [oldRackCode, oldName]);
          console.log(`[Location Update] Removed material '${oldName}' from old rack ${oldRackCode}`);
        }

        // 2. Assign to new rack if not UNASSIGNED
        if (targetLocation !== 'UNASSIGNED') {
          // Check if target rack is occupied by a different material
          const [occupied] = await db.query(
            'SELECT material_name FROM racks WHERE rack_code = ? AND material_name != ? AND quantity > 0',
            [targetLocation, currentMaterialName]
          );
          if (occupied.length > 0) {
            return res.status(400).json({
              status: 'error',
              message: `Rack ${targetLocation} is already occupied by a different material: ${occupied[0].material_name}`
            });
          }

          // Check if destination rack already exists in DB
          const [existingDest] = await db.query('SELECT id, quantity FROM racks WHERE rack_code = ?', [targetLocation]);
          if (existingDest.length > 0) {
            await db.query(
              'UPDATE racks SET material_name = ?, batch_number = ?, quantity = ? WHERE rack_code = ?',
              [currentMaterialName, currentBatchNumber, finalQty, targetLocation]
            );
          } else {
            await db.query(
              'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, ?, ?, ?, ?, ?)',
              [targetLocation, currentMaterialName, currentBatchNumber, finalQty, 999999999.00, 10.00]
            );
          }
          console.log(`[Location Update] Assigned material '${currentMaterialName}' to rack ${targetLocation} with quantity ${finalQty}`);
        }

        // Log movement in qr_history and audit log
        let userName = 'System';
        if (req.user && req.user.id) {
          const [users] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
          if (users.length > 0) userName = users[0].name;
        }

        const remarks = `Moved from ${oldRackCode || 'UNASSIGNED'} to ${targetLocation}`;
        await db.query(
          `INSERT INTO qr_history (barcode_id, material_name, action, rack_code, user_name, remarks)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            oldMaterial.barcode || 'N/A',
            currentMaterialName,
            'MOVED',
            targetLocation,
            userName,
            remarks
          ]
        );

        await logAudit({
          action_type: 'Rack Transfer',
          material_name: currentMaterialName,
          qr_code: oldMaterial.barcode || null,
          rack_code: targetLocation !== 'UNASSIGNED' ? targetLocation : null,
          user_name: userName,
          action_details: `Transferred material ${currentMaterialName} from ${oldRackCode || 'UNASSIGNED'} to ${targetLocation}`
        });

        // Trigger rack checks
        if (oldRackCode) {
          await processRackOccupancyCheck(null, oldRackCode);
        }
        if (targetLocation !== 'UNASSIGNED') {
          await processRackOccupancyCheck(null, targetLocation);
        }
      }
    }

    // Sync quantity changes if location didn't move (if moved, it was handled with finalQty)
    if (qty !== undefined && !locationMoved) {
      const diff = qty - oldQty;
      await syncMaterialToRack(db, material_name || oldName, diff, batch_number || oldBatch);
    }

    // Process alerts check in DB
    const alertResult = await processThresholdCheck(null, id);

    // FETCH FULL UPDATED RECORD FROM MYSQL (Double-fetching state as required)
    const [updated] = await db.query(
      `SELECT m.*, (SELECT r.rack_code FROM racks r WHERE r.material_name = m.material_name LIMIT 1) AS location 
       FROM materials m 
       WHERE m.id = ?`,
      [id]
    );
    const updatedMaterial = updated[0];

    // Check rack occupancy alerts for this material's assigned rack
    const [assigned] = await db.query('SELECT rack_code FROM racks WHERE material_name = ?', [updatedMaterial.material_name]);
    if (assigned.length > 0) {
      await processRackOccupancyCheck(null, assigned[0].rack_code);
    }

    // Console Log: material updated
    console.log(`[Inventory] Material updated: '${updatedMaterial.material_name}' (ID: ${id})`);

    // Log Material Updated
    let userName = 'System';
    if (req.user && req.user.id) {
      const [users] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) userName = users[0].name;
    }
    await logAudit({
      action_type: 'Material Updated',
      material_name: updatedMaterial.material_name,
      qr_code: updatedMaterial.barcode,
      user_name: userName,
      action_details: `Updated metadata for material: ${updatedMaterial.material_name}`
    });

    res.status(200).json({
      status: 'success',
      message: 'Material updated successfully',
      material: updatedMaterial,
      warning: alertResult?.alertGenerated ? alertResult.message : "No warning message generated"
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete material
 * DELETE /api/materials/:id
 */
export const deleteMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT id, material_name, barcode FROM materials WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

    const materialName = existing[0].material_name;
    const barcode = existing[0].barcode;

    // Fetch assigned racks before resetting them
    const [assignedRacks] = await db.query('SELECT rack_code FROM racks WHERE material_name = ?', [materialName]);

    await logQrHistory(db, {
      barcode_id: barcode,
      material_name: materialName,
      action: 'OUTWARD',
      rack_code: assignedRacks.length > 0 ? assignedRacks[0].rack_code : null,
      user_id: req.user ? req.user.id : null,
      remarks: `Material deleted from inventory`
    });

    await db.query('DELETE FROM materials WHERE id = ?', [id]);

    // Sync with rack: reset any rack assigned to this material
    await db.query(
      'UPDATE racks SET material_name = NULL, batch_number = NULL, quantity = 0.00 WHERE material_name = ?',
      [materialName]
    );

    // Call processRackOccupancyCheck for each rack to clear its alerts
    for (const rack of assignedRacks) {
      await processRackOccupancyCheck(null, rack.rack_code);
    }

    // Log Material Deleted
    let userName = 'System';
    if (req.user && req.user.id) {
      const [users] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) userName = users[0].name;
    }
    await logAudit({
      action_type: 'Material Deleted',
      material_name: materialName,
      qr_code: barcode,
      user_name: userName,
      action_details: `Deleted material from inventory: ${materialName} (Barcode: ${barcode})`
    });

    res.status(200).json({
      status: 'success',
      message: 'Material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust stock (Inward / Outward Transaction)
 * POST /api/materials/:id/stock
 */
export const adjustStock = async (req, res, next) => {
  const { id } = req.params;
  const { transaction_type, quantity } = req.body;

  // Validation checks
  if (!transaction_type || quantity === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide transaction_type and quantity'
    });
  }

  const adjustQty = parseFloat(quantity);
  if (isNaN(adjustQty) || adjustQty <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Quantity must be a positive number greater than 0'
    });
  }

  if (transaction_type !== 'inward' && transaction_type !== 'outward') {
    return res.status(400).json({
      status: 'error',
      message: "transaction_type must be either 'inward' or 'outward'"
    });
  }

  // Database transaction for stock adjustment safety
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 0. Fetch material first (no lock) to get its barcode
    const [prelimMaterials] = await connection.query(
      'SELECT barcode, quantity, material_name, batch_number, unit FROM materials WHERE id = ?',
      [id]
    );

    if (prelimMaterials.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

    const material = prelimMaterials[0];
    const currentQty = parseFloat(material.quantity);
    let newQty = currentQty;

    // 1. Lock qr_codes registry first
    const [existingQr] = await connection.query(
      'SELECT id, barcode_id, status FROM qr_codes WHERE barcode_id = ? FOR UPDATE',
      [material.barcode]
    );

    // 2. Lock material row second to match locking order of other files
    const [materials] = await connection.query(
      'SELECT * FROM materials WHERE id = ? FOR UPDATE',
      [id]
    );

    console.log(`[AUDIT] barcode_id received: "${material.barcode}"`);
    if (existingQr.length > 0) {
      console.log(`[AUDIT] barcode found: "${existingQr[0].barcode_id}"`);
      console.log(`[AUDIT] status before: "${existingQr[0].status}"`);
    } else {
      console.log(`[AUDIT] barcode NOT found in qr_codes registry: "${material.barcode}"`);
    }



    if (transaction_type === 'inward') {
      newQty = currentQty + adjustQty;
    } else {
      if (currentQty < adjustQty) {
        await connection.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock. Cannot remove ${adjustQty} ${material.unit}. Current stock is ${currentQty} ${material.unit}.`
        });
      }
      newQty = currentQty - adjustQty;
    }

    // Update material quantity
    await connection.query('UPDATE materials SET quantity = ? WHERE id = ?', [newQty, id]);

    // Sync with rack table
    const quantityChange = transaction_type === 'inward' ? adjustQty : -adjustQty;
    await syncMaterialToRack(connection, material.material_name, quantityChange, material.batch_number);

    // Record stock transaction
    const [transResult] = await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity, user_id) VALUES (?, ?, ?, ?)',
      [id, transaction_type, adjustQty, req.user ? req.user.id : null]
    );

    // Fetch assigned rack code for logging
    const [assigned] = await connection.query('SELECT rack_code FROM racks WHERE material_name = ?', [material.material_name]);
    const assignedRackCode = assigned.length > 0 ? assigned[0].rack_code : null;

    // Record user & scan timestamp
    if (transaction_type === 'inward' && existingQr.length > 0) {
      await connection.query(
        "UPDATE qr_codes SET scanned_at = CURRENT_TIMESTAMP, scanned_by = ? WHERE barcode_id = ?",
        [req.user ? req.user.id : null, material.barcode]
      );
    }

    // Log SCANNED to qr_history for inward scans
    if (transaction_type === 'inward') {
      await logQrHistory(connection, {
        barcode_id: material.barcode,
        material_name: material.material_name,
        action: 'SCANNED',
        rack_code: assignedRackCode,
        user_id: req.user ? req.user.id : null,
        quantity: adjustQty,
        remarks: 'QR code scanned at ingress'
      });
    }

    // Log history
    const isDepleted = newQty === 0;
    await logQrHistory(connection, {
      barcode_id: material.barcode,
      material_name: material.material_name,
      action: isDepleted ? 'USED' : (transaction_type === 'inward' ? 'INWARD' : 'OUTWARD'),
      rack_code: assignedRackCode,
      user_id: req.user ? req.user.id : null,
      quantity: adjustQty,
      remarks: isDepleted 
        ? `Material stock fully used/depleted (stock: 0)` 
        : `${transaction_type === 'inward' ? 'Inwarded' : 'Outwarded'} ${adjustQty} ${material.unit} of stock`
    });

    const [[qrCheck]] = await connection.query('SELECT status FROM qr_codes WHERE barcode_id = ?', [material.barcode]);
    console.log(`[AUDIT] status after: "${qrCheck ? qrCheck.status : 'N/A'}"`);

    // Commit to make quantity change final
    await connection.commit();

    // Check thresholds & trigger low-stock alerts
    const alertResult = await processThresholdCheck(null, id);

    // Retrieve updated material status
    const [updatedMaterials] = await db.query(
      `SELECT m.*, (SELECT r.rack_code FROM racks r WHERE r.material_name = m.material_name LIMIT 1) AS location 
       FROM materials m 
       WHERE m.id = ?`,
      [id]
    );
    const updatedMaterial = updatedMaterials[0];

    // Check rack occupancy alerts for this material's assigned rack
    const [assignedRackAlert] = await db.query('SELECT rack_code FROM racks WHERE material_name = ?', [updatedMaterial.material_name]);
    if (assignedRackAlert.length > 0) {
      await processRackOccupancyCheck(null, assignedRackAlert[0].rack_code);
    }

    // Console Log: material updated
    console.log(`[Inventory] Material stock updated: '${updatedMaterial.material_name}' (ID: ${id}, type: ${transaction_type}, quantity: ${adjustQty})`);

    res.status(200).json({
      status: 'success',
      message: `Stock updated successfully (${transaction_type})`,
      transaction: {
        id: transResult.insertId,
        material_id: parseInt(id, 10),
        transaction_type,
        quantity: adjustQty
      },
      material: updatedMaterial,
      warning: alertResult?.alertGenerated ? alertResult.message : null
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Search materials by name, batch number, or barcode
 * GET /api/materials/search
 */
export const searchMaterials = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        status: 'error',
        message: 'Query parameter q is required'
      });
    }

    const queryStr = `%${q}%`;
    const [results] = await db.query(
      `SELECT DISTINCT
         m.material_name,
         m.barcode,
         m.quantity,
         m.batch_number,
         m.created_at AS manufacturing_date,
         COALESCE(r.rack_code, 'Not Assigned') AS rack_location
       FROM materials m
       LEFT JOIN racks r ON m.material_name = r.material_name
       WHERE m.material_name LIKE ? OR m.batch_number LIKE ? OR m.barcode LIKE ?
       ORDER BY m.material_name ASC`,
      [queryStr, queryStr, queryStr]
    );

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: results,
      materials: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Predict material stock depletion, reorder dates, risks, trends, and recommended reorder quantities
 * GET /api/materials/predictions
 */
export const getMaterialPredictions = async (req, res, next) => {
  try {
    const [materials] = await db.query('SELECT * FROM materials');
    const [outwardTransactions] = await db.query(
      `SELECT material_id, quantity, created_at FROM transactions WHERE transaction_type = 'outward' ORDER BY created_at ASC`
    );

    // Group transactions by material_id
    const txMap = {};
    outwardTransactions.forEach(tx => {
      const mid = tx.material_id;
      if (!txMap[mid]) {
        txMap[mid] = [];
      }
      txMap[mid].push(tx);
    });

    const predictions = materials.map(mat => {
      const qty = parseFloat(mat.quantity) || 0;
      const threshold = parseFloat(mat.threshold_limit) || 0;
      const txs = txMap[mat.id] || [];

      // Calculate daily consumption rate
      let dailyRate = 0;
      let trend = 'Stable';

      if (txs.length > 0) {
        const oldestTxDate = new Date(txs[0].created_at);
        const newestTxDate = new Date();
        const diffMs = newestTxDate.getTime() - oldestTxDate.getTime();
        const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        
        const totalOutward = txs.reduce((acc, tx) => acc + parseFloat(tx.quantity), 0);
        dailyRate = totalOutward / diffDays;

        // Calculate trend (comparing last 7 days vs previous)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const recentQty = txs
          .filter(tx => new Date(tx.created_at) >= sevenDaysAgo)
          .reduce((acc, tx) => acc + parseFloat(tx.quantity), 0);

        const olderQty = txs
          .filter(tx => {
            const date = new Date(tx.created_at);
            return date >= fourteenDaysAgo && date < sevenDaysAgo;
          })
          .reduce((acc, tx) => acc + parseFloat(tx.quantity), 0);

        if (recentQty > olderQty * 1.1) {
          trend = 'Increasing';
        } else if (recentQty < olderQty * 0.9) {
          trend = 'Decreasing';
        } else {
          trend = 'Stable';
        }
      }

      // Safe fallbacks for dailyRate
      if (dailyRate <= 0) {
        dailyRate = threshold > 0 ? parseFloat((threshold * 0.05).toFixed(2)) : 2.50;
      }
      dailyRate = Math.max(0.1, parseFloat(dailyRate.toFixed(2)));

      // 1. Days until depletion
      const daysUntilDepletion = Math.ceil(qty / dailyRate);
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);

      // 2. Days until reorder (reorder when stock hits threshold)
      let daysUntilReorder = 0;
      if (qty > threshold) {
        daysUntilReorder = Math.ceil((qty - threshold) / dailyRate);
      }
      const reorderDate = new Date();
      reorderDate.setDate(reorderDate.getDate() + daysUntilReorder);

      // 3. Shortage Risk & Risk Score
      let risk = 'Low';
      let riskScore = 0;

      if (qty <= threshold) {
        risk = 'High';
        const ratio = threshold > 0 ? (threshold - qty) / threshold : 1;
        riskScore = Math.min(100, Math.round(80 + ratio * 20));
      } else if (daysUntilDepletion <= 3) {
        risk = 'High';
        riskScore = Math.round(70 + (3 - daysUntilDepletion) * 10);
      } else if (daysUntilDepletion <= 7) {
        risk = 'Medium';
        riskScore = Math.round(40 + (7 - daysUntilDepletion) * 7);
      } else {
        risk = 'Low';
        riskScore = Math.max(5, Math.round(30 - (daysUntilDepletion - 7) * 0.5));
      }

      const recommendedReorderQty = Math.max(Math.round(threshold * 2), Math.round(dailyRate * 15));

      return {
        id: mat.id,
        materialName: mat.material_name,
        barcode: mat.barcode,
        quantity: qty,
        threshold: threshold,
        unit: mat.unit,
        dailyRate,
        trend,
        daysUntilDepletion,
        depletionDate: depletionDate.toISOString().split('T')[0],
        daysUntilReorder,
        reorderDate: reorderDate.toISOString().split('T')[0],
        risk,
        riskScore,
        recommendedReorderQty
      };
    });

    res.status(200).json({
      status: 'success',
      data: predictions
    });
  } catch (error) {
    next(error);
  }
};
