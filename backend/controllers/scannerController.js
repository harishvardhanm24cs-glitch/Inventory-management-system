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

    
    console.log("barcode_id:", barcode_id);
    console.log("status_before:", statusBefore);

    console.log("Validation Check - QR status. Status:", statusBefore);

    
    const finalMaterialName = material_name || qrRecord.material_name;
    const finalQuantity = quantity !== undefined ? quantity : qrRecord.units;
    const finalRackCode = rack_code || qrRecord.rack_code;

    console.log("Validation Check - finalMaterialName check. Value:", finalMaterialName);
    
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

    
    console.log("Executing SQL: SELECT ... FROM materials WHERE barcode = ? FOR UPDATE");
    const [existingMaterials] = await connection.query(
      'SELECT id, quantity, threshold_limit, unit, material_name FROM materials WHERE barcode = ? FOR UPDATE',
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

      
      const [recentTx] = await connection.query(
        `SELECT id FROM transactions 
         WHERE material_id = ? AND transaction_type = 'inward' 
         AND created_at >= NOW() - INTERVAL 5 SECOND`,
        [materialId]
      );

      if (recentTx.length > 0) {
        console.warn(`[Scanner Sync] Duplicate scan blocked for barcode: ${barcode_id}`);
        await connection.rollback();
        return res.status(409).json({
          success: false,
          status: 'duplicate',
          message: 'Duplicate scan rejected. Inventory not updated.'
        });
      }

      
      await connection.query(
        'UPDATE materials SET quantity = quantity + ?, batch_number = COALESCE(?, batch_number), material_name = ? WHERE id = ?',
        [scannedQty, batch_number || null, finalMaterialName, materialId]
      );
    } else {
      
      const [insertResult] = await connection.query(
        'INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number, qr_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [barcode_id, finalMaterialName, scannedQty, materialLimit, materialUnit, batch_number || null, qrRecord.qr_data || null]
      );
      materialId = insertResult.insertId;
    }

    console.log("QR stored");

    
    let targetRackCode = finalRackCode;

    if (!targetRackCode || targetRackCode === 'Auto-Assigning...') {
      
      console.log(`Auto-assigning rack: Attempting to find rack with same material '${finalMaterialName}'...`);
      const [sameMaterialRacks] = await connection.query(
        'SELECT rack_code FROM racks WHERE material_name = ? ORDER BY rack_code ASC LIMIT 1',
        [finalMaterialName]
      );

      if (sameMaterialRacks.length > 0) {
        targetRackCode = sameMaterialRacks[0].rack_code;
        console.log(`Auto-assigning rack: Selected rack with same material: ${targetRackCode}`);
      } else {
        
        console.log("Auto-assigning rack: Attempting to find empty racks...");
        const [emptyRacks] = await connection.query(
          'SELECT rack_code FROM racks WHERE quantity = 0 OR material_name IS NULL ORDER BY rack_code ASC LIMIT 1'
        );

        if (emptyRacks.length > 0) {
          targetRackCode = emptyRacks[0].rack_code;
          console.log(`Auto-assigning rack: Selected empty rack: ${targetRackCode}`);
        } else {
          
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
      'SELECT id, quantity, max_capacity, material_name FROM racks WHERE rack_code = ? FOR UPDATE',
      [targetRackCode]
    );
    console.log("Rack lookup result (SQL query result):", existingRacks);

    if (existingRacks.length > 0) {
      const rack = existingRacks[0];
      const rackQty = parseFloat(rack.quantity) || 0;
      
      console.log("Validation Check - Rack material assignment match check. Rack material:", rack.material_name, "Final material:", finalMaterialName);
      
      if (rackQty > 0 && rack.material_name && rack.material_name !== finalMaterialName) {
        console.log("Validation failure reason: Rack assigned to different material");
        await connection.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Rack ${targetRackCode} is already assigned to a different material: ${rack.material_name}`
        });
      }
      
      
      await connection.query(
        'UPDATE racks SET material_name = ?, batch_number = COALESCE(?, batch_number), quantity = quantity + ? WHERE rack_code = ?',
        [finalMaterialName, batch_number || null, scannedQty, targetRackCode]
      );
    } else {
      const maxCap = 999999999.00;
      
      await connection.query(
        'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, ?, ?, ?, ?, ?)',
        [targetRackCode, finalMaterialName, batch_number || null, scannedQty, maxCap, 10.00]
      );
    }

    console.log("Rack updated:", targetRackCode);

    
    await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity, user_id) VALUES (?, ?, ?, ?)',
      [materialId, 'inward', scannedQty, req.user ? req.user.id : null]
    );

    console.log("Transaction created");

    
    import('../services/aiDataCollectionService.js').then(({ aiDataCollectionService }) => {
      aiDataCollectionService.captureTransaction({
        material_id: materialId,
        quantity: scannedQty,
        movement_type: 'INWARD',
        created_at: new Date().toISOString()
      });
    }).catch(() => {});

    
    await connection.query(
      "UPDATE qr_codes SET status = 'used', rack_code = ?, batch_number = COALESCE(?, batch_number), scanned_at = CURRENT_TIMESTAMP, scanned_by = ? WHERE barcode_id = ?",
      [targetRackCode, batch_number || null, req.user ? req.user.id : null, barcode_id]
    );

    const [[qrCheck]] = await connection.query('SELECT status FROM qr_codes WHERE barcode_id = ?', [barcode_id]);
    const statusAfter = qrCheck ? qrCheck.status : 'N/A';
    console.log("status_after:", statusAfter);

    
    await logQrHistory(connection, {
      barcode_id,
      material_name: finalMaterialName,
      action: 'INWARD',
      rack_code: targetRackCode,
      user_id: req.user ? req.user.id : null,
      quantity: scannedQty,
      remarks: `Direct inward to rack ${targetRackCode} (quantity: ${scannedQty} KG)`
    });

    
    const [txDetails] = await connection.query(
      'SELECT created_at FROM transactions WHERE material_id = ? AND transaction_type = ? ORDER BY id DESC LIMIT 1',
      [materialId, 'inward']
    );
    const txTimestamp = txDetails.length > 0 ? txDetails[0].created_at : new Date().toISOString();

    
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

    
    if (qrRecord.status === 'unused' && qrRecord.scanned_at === null) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: `Barcode ${barcode_id} cannot be outwarded because it has not been inwarded (status is unused).`
      });
    }

    
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
    const outwardQty = req.body.quantity !== undefined && !isNaN(parseFloat(req.body.quantity))
      ? parseFloat(req.body.quantity)
      : (parseFloat(qrRecord.units) || 0);

    
    if (currentQty < outwardQty) {
      await connection.rollback();
      return res.status(400).json({
        status: 'error',
        message: `Insufficient inventory stock. Cannot remove ${outwardQty} ${material.unit}. Current stock is ${currentQty} ${material.unit}.`
      });
    }

    
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
            'UPDATE racks SET quantity = quantity - ? WHERE rack_code = ?',
            [outwardQty, targetRackCode]
          );
        }
      }
    }

    
    const newMaterialQty = currentQty - outwardQty;
    await connection.query(
      'UPDATE materials SET quantity = quantity - ? WHERE id = ?',
      [outwardQty, material.id]
    );

    
    await connection.query(
      "UPDATE qr_codes SET status = 'OUTWARD', scanned_at = CURRENT_TIMESTAMP WHERE barcode_id = ?",
      [barcode_id]
    );

    
    
    await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity, user_id) VALUES (?, ?, ?, ?)',
      [material.id, 'outward', outwardQty, req.user ? req.user.id : null]
    );

    
    import('../services/aiDataCollectionService.js').then(({ aiDataCollectionService }) => {
      aiDataCollectionService.captureTransaction({
        material_id: material.id,
        quantity: outwardQty,
        movement_type: 'OUTWARD',
        created_at: new Date().toISOString()
      });
    }).catch(() => {});

    
    await logQrHistory(connection, {
      barcode_id,
      material_name: qrRecord.material_name,
      action: 'OUTWARD',
      rack_code: targetRackCode || null,
      user_id: req.user ? req.user.id : null,
      quantity: outwardQty,
      remarks: `Material outwarded from rack ${targetRackCode || 'N/A'} (quantity: ${outwardQty})`
    });

    
    await connection.commit();

    
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

    
    await processThresholdCheck(null, material.id);
    if (targetRackCode) {
      await processRackOccupancyCheck(null, targetRackCode);

      
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
