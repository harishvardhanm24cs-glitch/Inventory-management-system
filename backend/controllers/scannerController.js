import db from '../config/db.js';
import { processThresholdCheck } from '../services/alertService.js';
import { sendEmail } from '../services/emailService.js';

/**
 * Automatically store scanned QR code data into materials, racks, and transactions
 * POST /api/scanner/auto-store
 */
export const autoStore = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { material_name, quantity, batch_number, manufacturing_date, rack_code, barcode_id } = req.body;

    // Validate fields
    if (!material_name || quantity === undefined || !rack_code || !barcode_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide material_name, quantity, rack_code, and barcode_id'
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

    // 1. Fetch material by barcode (barcode_id)
    const [existingMaterials] = await connection.query(
      'SELECT id, quantity, threshold_limit, unit, material_name FROM materials WHERE barcode = ?',
      [barcode_id]
    );

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
          rack_updated: false,
          message: 'Duplicate scan ignored (already registered in the last 5 seconds)'
        });
      }

      // Update material (increment quantity)
      const newQty = currentQty + scannedQty;
      await connection.query(
        'UPDATE materials SET quantity = ?, batch_number = ?, material_name = ? WHERE id = ?',
        [newQty, batch_number || null, material_name, materialId]
      );
    } else {
      // Insert new material
      const [insertResult] = await connection.query(
        'INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number) VALUES (?, ?, ?, ?, ?, ?)',
        [barcode_id, material_name, scannedQty, materialLimit, materialUnit, batch_number || null]
      );
      materialId = insertResult.insertId;
    }

    console.log("QR stored");

    // 2. Fetch/Update racks
    const [existingRacks] = await connection.query(
      'SELECT id, quantity FROM racks WHERE rack_code = ?',
      [rack_code]
    );

    if (existingRacks.length > 0) {
      const rack = existingRacks[0];
      const newRackQty = (parseFloat(rack.quantity) || 0) + scannedQty;
      await connection.query(
        'UPDATE racks SET material_name = ?, batch_number = ?, quantity = ? WHERE rack_code = ?',
        [material_name, batch_number || null, newRackQty, rack_code]
      );
    } else {
      await connection.query(
        'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, ?, ?, ?, ?, ?)',
        [rack_code, material_name, batch_number || null, scannedQty, 100.00, 10.00]
      );
    }

    console.log("Rack updated");

    // 3. Insert transaction log
    await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity) VALUES (?, ?, ?)',
      [materialId, 'inward', scannedQty]
    );

    console.log("Transaction created");

    await connection.commit();

    // 4. Check low-stock threshold status & alerts
    const alertResult = await processThresholdCheck(null, materialId);
    console.log("Threshold checked");

    // Trigger asynchronous email notifications if alert generated
    if (alertResult && alertResult.alertGenerated) {
      const recipient = process.env.EMAIL_USER || 'manager@gmail.com';
      const subject = `LOW STOCK ALERT - ${material_name}`;
      const emailText = `Warning: ${material_name} is below threshold limit.\nCurrent quantity: ${currentQty + scannedQty} ${materialUnit}.\nThreshold limit: ${materialLimit} ${materialUnit}.`;
      
      sendEmail(recipient, subject, emailText).catch(emailErr => {
        console.error('[Scanner Sync] Email alert dispatch failed:', emailErr.message);
      });
    }

    res.status(200).json({
      success: true,
      rack_updated: true
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
