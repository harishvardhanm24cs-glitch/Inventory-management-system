import db from '../config/db.js';
import { processThresholdCheck, processRackOccupancyCheck } from '../services/alertService.js';
import { logQrHistory } from '../utils/qrHistory.js';
import { logAudit } from '../utils/auditLogger.js';
import { getNextRackCode } from '../utils/rackHelper.js';

/**
 * Automatically store scanned QR code data into materials, racks, and transactions
 * POST /api/scanner/auto-store
 */
export const autoStore = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { material_name, quantity, batch_number, manufacturing_date, rack_code, barcode_id } = req.body;

    console.log("AUTO STORE REQUEST:", req.body);

    console.log("Validation Check - barcode_id existence check. Value:", barcode_id);
    if (!barcode_id) {
      console.log("Validation failure reason: Please provide barcode_id");
      console.log("Missing field: barcode_id");
      console.log("Lookup result: N/A");
      console.log("SQL query result: N/A");
      console.error('[VALIDATION ERROR] Missing barcode_id', {
        barcode_id: null,
        material_name: material_name || null,
        rack_code: rack_code || null,
        quantity: quantity || null,
        validation_failure_reason: 'Please provide barcode_id'
      });
      return res.status(400).json({
        status: 'error',
        message: 'Please provide barcode_id'
      });
    }

    await connection.beginTransaction();

    // 0.1. Defensive schema validation check
    try {
      const requiredRackCols = ['id', 'rack_code', 'quantity', 'max_capacity', 'material_name'];
      const requiredInvCols = ['rack_code', 'current_capacity', 'max_capacity', 'occupancy_percentage', 'zone_name', 'material_name'];

      const [rackCols] = await connection.query('SHOW COLUMNS FROM racks');
      const [invCols] = await connection.query('SHOW COLUMNS FROM rack_inventory');

      const actualRackCols = rackCols.map(c => c.Field);
      const actualInvCols = invCols.map(c => c.Field);

      const missingRackCols = requiredRackCols.filter(col => !actualRackCols.includes(col));
      const missingInvCols = requiredInvCols.filter(col => !actualInvCols.includes(col));

      if (missingRackCols.length > 0 || missingInvCols.length > 0) {
        const errorMsg = `Database schema is invalid. Missing columns: racks -> [${missingRackCols.join(', ')}], rack_inventory -> [${missingInvCols.join(', ')}]`;
        console.error(errorMsg);
        await connection.rollback();
        return res.status(500).json({
          status: 'error',
          message: errorMsg
        });
      }
    } catch (schemaErr) {
      console.error('Defensive schema validation failed:', schemaErr.message);
      await connection.rollback();
      return res.status(500).json({
        status: 'error',
        message: `Schema validation failed: ${schemaErr.message}`
      });
    }

    // 0. Lookup barcode_id in qr_codes table with FOR UPDATE locking
    console.log("Executing SQL: SELECT ... FROM qr_codes WHERE barcode_id = ?");
    const [existingQr] = await connection.query(
      'SELECT id, barcode_id, material_name, quantity, units, status, rack_code, qr_data FROM qr_codes WHERE barcode_id = ? FOR UPDATE',
      [barcode_id]
    );
    console.log("Barcode lookup result (SQL query result):", existingQr);

    console.log("Validation Check - QR existence. Count:", existingQr.length);
    if (existingQr.length === 0) {
      console.log("Validation failure reason: Barcode ID not registered");
      console.log("Missing field: none");
      console.log("Lookup result: empty");
      console.log("SQL query result:", existingQr);
      await connection.rollback();
      return res.status(404).json({
        status: 'error',
        message: `Barcode ID ${barcode_id} is not registered in the QR Registry. Please generate it first.`
      });
    }

    const qrRecord = existingQr[0];
    const statusBefore = qrRecord.status;

    // Log status transition details
    console.log("barcode_id:", barcode_id);
    console.log("status_before:", statusBefore);

    console.log("Validation Check - QR status. Status:", statusBefore);

    // Fallback parameters from the registered QR code record if not provided in the request
    const finalMaterialName = material_name || qrRecord.material_name;
    const finalQuantity = quantity !== undefined ? quantity : qrRecord.units;
    const finalRackCode = rack_code || qrRecord.rack_code;

    console.log("Validation Check - finalMaterialName check. Value:", finalMaterialName);
    // Validate final parameters
    if (!finalMaterialName) {
      console.log("Validation failure reason: Material name is required");
      console.log("Missing field: material_name");
      console.log("Lookup result: finalMaterialName is empty");
      console.log("SQL query result:", existingQr);
      await connection.rollback();
      console.error('[VALIDATION ERROR] Missing material_name', {
        barcode_id: barcode_id || null,
        material_name: null,
        rack_code: finalRackCode || null,
        quantity: finalQuantity || null,
        validation_failure_reason: 'Material name is required'
      });
      return res.status(400).json({
        status: 'error',
        message: 'Material name is required'
      });
    }

    const scannedQty = parseFloat(finalQuantity);
    console.log("Validation Check - quantity check. Raw value:", finalQuantity, "Parsed quantity:", scannedQty);
    if (isNaN(scannedQty) || scannedQty <= 0) {
      console.log("Validation failure reason: Quantity must be a positive number");
      console.log("Missing field: quantity (or invalid format)");
      console.log("Lookup result: quantity invalid");
      console.log("SQL query result: N/A");
      await connection.rollback();
      console.error('[VALIDATION ERROR] Invalid quantity', {
        barcode_id: barcode_id || null,
        material_name: finalMaterialName || null,
        rack_code: finalRackCode || null,
        quantity: finalQuantity || null,
        validation_failure_reason: 'Quantity must be a positive number'
      });
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
      });
    }

    // 1. Fetch material by barcode (barcode_id)
    console.log("Executing SQL: SELECT ... FROM materials WHERE barcode = ?");
    const [existingMaterials] = await connection.query(
      'SELECT id, quantity, threshold_limit, unit, material_name FROM materials WHERE barcode = ?',
      [barcode_id]
    );
    console.log("Material lookup result (SQL query result):", existingMaterials);

    let materialId;
    let currentQty = 0;
    let materialUnit = 'KG';
    let materialLimit = 10.00;

    if (existingMaterials.length > 0) {
      const material = existingMaterials[0];
      materialId = material.id;
      currentQty = parseFloat(material.quantity) || 0;
      materialUnit = material.unit || 'KG';
      materialLimit = parseFloat(material.threshold_limit) || 10.00;

      // Duplicate scan prevention (Check if a transaction with same quantity was created in the last 5 seconds)
      const [recentTx] = await connection.query(
        `SELECT id FROM transactions 
         WHERE material_id = ? AND transaction_type = 'inward' 
         AND created_at >= NOW() - INTERVAL 5 SECOND`,
        [materialId]
      );

      if (recentTx.length > 0) {
        console.warn(`[Scanner Sync] Duplicate scan blocked for barcode: ${barcode_id}`);
        await connection.rollback();
        return res.status(200).json({
          success: true,
          status: 'duplicate',
          rack_updated: false,
          message: 'Duplicate scan ignored (already registered in the last 5 seconds)'
        });
      }

      // Update material (increment quantity)
      const newQty = currentQty + scannedQty;
      await connection.query(
        'UPDATE materials SET quantity = ?, batch_number = ?, material_name = ? WHERE id = ?',
        [newQty, batch_number || null, finalMaterialName, materialId]
      );
    } else {
      // Insert new material
      const [insertResult] = await connection.query(
        'INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number, qr_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [barcode_id, finalMaterialName, scannedQty, materialLimit, materialUnit, batch_number || null, qrRecord.qr_data || null]
      );
      materialId = insertResult.insertId;
    }

    console.log("QR stored");

    // 2. Fetch/Update racks
    let targetRackCode = finalRackCode;

    if (!targetRackCode || targetRackCode === 'Auto-Assigning...') {
      // 1. Prefer rack containing the same material
      console.log(`Auto-assigning rack: Attempting to find rack with same material '${finalMaterialName}'...`);
      const [sameMaterialRacks] = await connection.query(
        'SELECT rack_code FROM racks WHERE material_name = ? ORDER BY rack_code ASC LIMIT 1',
        [finalMaterialName]
      );

      if (sameMaterialRacks.length > 0) {
        targetRackCode = sameMaterialRacks[0].rack_code;
        console.log(`Auto-assigning rack: Selected rack with same material: ${targetRackCode}`);
      } else {
        // 2. If none exist, check for empty racks
        console.log("Auto-assigning rack: Attempting to find empty racks...");
        const [emptyRacks] = await connection.query(
          'SELECT rack_code FROM racks WHERE quantity = 0 OR material_name IS NULL ORDER BY rack_code ASC LIMIT 1'
        );

        if (emptyRacks.length > 0) {
          targetRackCode = emptyRacks[0].rack_code;
          console.log(`Auto-assigning rack: Selected empty rack: ${targetRackCode}`);
        } else {
          // 3. Generate the next available rack code dynamically
          console.log("Auto-assigning rack: All existing racks are occupied. Allocating next rack...");
          const [existingRacksList] = await connection.query('SELECT rack_code FROM racks');
          const existingCodes = existingRacksList.map(r => r.rack_code);
          targetRackCode = getNextRackCode(existingCodes);
          console.log(`Auto-assigning rack: Generated new Excel-style rack code: ${targetRackCode}`);
        }
      }
    }

    console.log("Executing SQL: SELECT ... FROM racks WHERE rack_code = ?", targetRackCode);
    const [existingRacks] = await connection.query(
      'SELECT id, quantity, max_capacity, material_name FROM racks WHERE rack_code = ?',
      [targetRackCode]
    );
    console.log("Rack lookup result (SQL query result):", existingRacks);

    if (existingRacks.length > 0) {
      const rack = existingRacks[0];
      const rackQty = parseFloat(rack.quantity) || 0;
      
      console.log("Validation Check - Rack material assignment match check. Rack material:", rack.material_name, "Final material:", finalMaterialName);
      // Prevent duplicate assignment: conflict check if rack is assigned to a different material
      if (rackQty > 0 && rack.material_name && rack.material_name !== finalMaterialName) {
        console.log("Validation failure reason: Rack assigned to different material");
        console.log("Missing field: none");
        console.log("Lookup result: rack assigned to different material:", rack.material_name);
        console.log("SQL query result:", existingRacks);
        await connection.rollback();
        console.error('[VALIDATION ERROR] Rack assigned to different material', {
          barcode_id: barcode_id || null,
          material_name: finalMaterialName || null,
          rack_code: targetRackCode || null,
          quantity: scannedQty || null,
          validation_failure_reason: `Rack ${targetRackCode} is already assigned to a different material: ${rack.material_name}`
        });
        return res.status(400).json({
          status: 'error',
          message: `Rack ${targetRackCode} is already assigned to a different material: ${rack.material_name}`
        });
      }
      
      const newRackQty = rackQty + scannedQty;
      
      await connection.query(
        'UPDATE racks SET material_name = ?, batch_number = ?, quantity = ? WHERE rack_code = ?',
        [finalMaterialName, batch_number || null, newRackQty, targetRackCode]
      );
    } else {
      const maxCap = 999999999.00;
      
      await connection.query(
        'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, ?, ?, ?, ?, ?)',
        [targetRackCode, finalMaterialName, batch_number || null, scannedQty, maxCap, 10.00]
      );
    }

    console.log("Rack updated:", targetRackCode);

    // 3. Insert transaction log with user ID
    await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity, user_id) VALUES (?, ?, ?, ?)',
      [materialId, 'inward', scannedQty, req.user ? req.user.id : null]
    );

    console.log("Transaction created");

    // 4. Record user & scan timestamp
    await connection.query(
      "UPDATE qr_codes SET scanned_at = CURRENT_TIMESTAMP, scanned_by = ? WHERE barcode_id = ?",
      [req.user ? req.user.id : null, barcode_id]
    );

    const [[qrCheck]] = await connection.query('SELECT status FROM qr_codes WHERE barcode_id = ?', [barcode_id]);
    const statusAfter = qrCheck ? qrCheck.status : 'N/A';
    console.log("status_after:", statusAfter);

    // 4.5. Log QR history lifecycle events (SCANNED and INWARD)
    await logQrHistory(connection, {
      barcode_id,
      material_name: finalMaterialName,
      action: 'SCANNED',
      rack_code: targetRackCode,
      user_id: req.user ? req.user.id : null,
      quantity: scannedQty,
      remarks: 'QR code scanned at ingress'
    });

    await logQrHistory(connection, {
      barcode_id,
      material_name: finalMaterialName,
      action: 'INWARD',
      rack_code: targetRackCode,
      user_id: req.user ? req.user.id : null,
      quantity: scannedQty,
      remarks: `Material inwarded to rack ${targetRackCode} (quantity: ${scannedQty})`
    });

    // Fetch transaction timestamp
    const [txDetails] = await connection.query(
      'SELECT created_at FROM transactions WHERE material_id = ? AND transaction_type = ? ORDER BY id DESC LIMIT 1',
      [materialId, 'inward']
    );
    const txTimestamp = txDetails.length > 0 ? txDetails[0].created_at : new Date().toISOString();

    // Fetch the updated rack details to return
    const [updatedRacks] = await connection.query(
      'SELECT r.*, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code WHERE r.rack_code = ?',
      [targetRackCode]
    );
    
    let mappedRack = null;
    if (updatedRacks.length > 0) {
      const rack = updatedRacks[0];
      const qty = parseFloat(rack.quantity) || 0;
      const maxCap = parseFloat(rack.max_capacity) || 1;
      const occPercent = rack.occupancy_percentage !== undefined && rack.occupancy_percentage !== null
        ? parseFloat(rack.occupancy_percentage)
        : (maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00);
      const statusColor = occPercent > 80 ? 'RED' : occPercent > 40 ? 'YELLOW' : 'GREEN';
      mappedRack = {
        ...rack,
        rack_name: rack.rack_code,
        capacity: maxCap,
        current_stock: qty,
        occupancy_percentage: occPercent,
        occupancyPercentage: occPercent,
        status_color: statusColor
      };
    }

    await connection.commit();

    // Log Inward Scan Audit Event
    let userName = 'System';
    if (req.user && req.user.id) {
      const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) userName = users[0].name;
    }
    await logAudit({
      action_type: 'Inward Scan',
      material_name: finalMaterialName,
      qr_code: barcode_id,
      rack_code: targetRackCode || null,
      user_name: userName,
      action_details: `Inwarded ${scannedQty} ${materialUnit} of ${finalMaterialName} into Rack ${targetRackCode}`
    });

    // 5. Check low-stock threshold status & alerts
    await processThresholdCheck(null, materialId);
    await processRackOccupancyCheck(null, targetRackCode);
    console.log("Alerts and rack occupancy checked");

    res.status(200).json({
      success: true,
      barcode_id,
      status: statusAfter,
      rack_updated: true,
      assigned_rack: targetRackCode,
      rack: mappedRack,
      timestamp: txTimestamp
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Process outward scans to dispatch materials from racks
 * POST /api/scanner/outward
 */
export const outwardScan = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { barcode_id } = req.body;

    if (!barcode_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide barcode_id'
      });
    }

    await connection.beginTransaction();

    // 1. Lookup barcode_id in qr_codes table with FOR UPDATE locking
    const [existingQr] = await connection.query(
      'SELECT id, material_name, quantity, units, status, rack_code, qr_data, scanned_at FROM qr_codes WHERE barcode_id = ? FOR UPDATE',
      [barcode_id]
    );

    if (existingQr.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: 'error',
        message: `Barcode ID ${barcode_id} is not registered in the QR Registry. Please scan a valid barcode.`
      });
    }

    const qrRecord = existingQr[0];

    // Verify barcode has been inwarded (we shouldn't outward an unused barcode)
    if (qrRecord.status === 'unused' && qrRecord.scanned_at === null) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: `Barcode ${barcode_id} cannot be outwarded because it has not been inwarded (status is unused).`
      });
    }

    // 2. Fetch corresponding material by barcode
    const [existingMaterials] = await connection.query(
      'SELECT id, quantity, threshold_limit, unit, material_name FROM materials WHERE barcode = ? FOR UPDATE',
      [barcode_id]
    );

    if (existingMaterials.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: 'error',
        message: `No active material found associated with barcode ${barcode_id}.`
      });
    }

    const material = existingMaterials[0];
    const currentQty = parseFloat(material.quantity) || 0;
    const outwardQty = parseFloat(qrRecord.units) || 0;

    // Prevent: Negative stock in inventory
    if (currentQty < outwardQty) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: `Insufficient inventory stock. Cannot remove ${outwardQty} ${material.unit}. Current stock is ${currentQty} ${material.unit}.`
      });
    }

    // Determine target rack code
    let targetRackCode = qrRecord.rack_code;
    if (!targetRackCode) {
      const [historyRows] = await connection.query(
        "SELECT rack_code FROM qr_history WHERE barcode_id = ? AND action IN ('INWARD', 'MOVED') ORDER BY id DESC LIMIT 1",
        [barcode_id]
      );
      if (historyRows.length > 0) {
        targetRackCode = historyRows[0].rack_code;
      }
    }

    let mappedRack = null;
    let newRackQty = 0;

    if (targetRackCode) {
      const [racks] = await connection.query(
        'SELECT id, quantity, max_capacity, material_name FROM racks WHERE rack_code = ? FOR UPDATE',
        [targetRackCode]
      );

      if (racks.length > 0) {
        const rack = racks[0];
        const rackQty = parseFloat(rack.quantity) || 0;

        // Prevent: Negative stock in rack
        if (rackQty < outwardQty) {
          await connection.rollback();
          return res.status(400).json({
            status: 'error',
            message: `Insufficient stock in rack ${targetRackCode}. Cannot outward (current rack stock: ${rackQty}, barcode quantity: ${outwardQty}).`
          });
        }

        newRackQty = rackQty - outwardQty;

        if (newRackQty === 0) {
          await connection.query(
            'DELETE FROM racks WHERE rack_code = ?',
            [targetRackCode]
          );
        } else {
          await connection.query(
            'UPDATE racks SET quantity = ? WHERE rack_code = ?',
            [newRackQty, targetRackCode]
          );
        }
      }
    }

    // Reduce inventory quantity
    const newMaterialQty = currentQty - outwardQty;
    await connection.query(
      'UPDATE materials SET quantity = ? WHERE id = ?',
      [newMaterialQty, material.id]
    );

    // Create transaction record
    // Type is 'outward' to match database constraints
    await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity, user_id) VALUES (?, ?, ?, ?)',
      [material.id, 'outward', outwardQty, req.user ? req.user.id : null]
    );

    // Log QR history lifecycle events
    await logQrHistory(connection, {
      barcode_id,
      material_name: qrRecord.material_name,
      action: 'OUTWARD',
      rack_code: targetRackCode || null,
      user_id: req.user ? req.user.id : null,
      quantity: outwardQty,
      remarks: `Material outwarded from rack ${targetRackCode || 'N/A'} (quantity: ${outwardQty})`
    });

    // Commit changes
    await connection.commit();

    // Log Outward Scan Audit Event
    let userName = 'System';
    if (req.user && req.user.id) {
      const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) userName = users[0].name;
    }
    await logAudit({
      action_type: 'Outward Scan',
      material_name: qrRecord.material_name,
      qr_code: barcode_id,
      rack_code: targetRackCode || null,
      user_name: userName,
      action_details: `Outwarded ${outwardQty} ${material.unit} of ${qrRecord.material_name} from Rack ${targetRackCode || 'N/A'}`
    });

    // Check low stock limits and rack occupancy levels (alerts and email sending trigger here)
    await processThresholdCheck(null, material.id);
    if (targetRackCode) {
      await processRackOccupancyCheck(null, targetRackCode);

      // Fetch the updated rack details to return
      const [updatedRacks] = await db.query(
        'SELECT r.*, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code WHERE r.rack_code = ?',
        [targetRackCode]
      );
      if (updatedRacks.length > 0) {
        const rack = updatedRacks[0];
        const qty = parseFloat(rack.quantity) || 0;
        const maxCap = parseFloat(rack.max_capacity) || 1;
        const occPercent = rack.occupancy_percentage !== undefined && rack.occupancy_percentage !== null
          ? parseFloat(rack.occupancy_percentage)
          : (maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00);
        const statusColor = occPercent > 80 ? 'RED' : occPercent > 40 ? 'YELLOW' : 'GREEN';
        mappedRack = {
          ...rack,
          rack_name: rack.rack_code,
          capacity: maxCap,
          current_stock: qty,
          occupancy_percentage: occPercent,
          occupancyPercentage: occPercent,
          status_color: statusColor
        };
      }
    }

    res.status(200).json({
      success: true,
      message: 'Outward scan processed successfully',
      barcode_id,
      material_name: qrRecord.material_name,
      removed_quantity: outwardQty,
      updated_material_stock: newMaterialQty,
      updated_rack_stock: newRackQty,
      rack_code: targetRackCode || null,
      rack: mappedRack
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
