import QRCode from 'qrcode';
import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { logQrHistory } from '../utils/qrHistory.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * Generate QR Code and register new material bucket
 * POST /api/generate-qr
 */
export const generateQR = async (req, res, next) => {
  try {
    const { material_name, weight, quantity, batch_number, manufacturing_date, rack_code } = req.body;

    // Validate material_name
    if (!material_name) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide material_name'
      });
    }

    // Automatically generate unique barcode ID
    const barcodeId = `BAR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const finalWeight = weight !== undefined ? parseFloat(weight) : (quantity !== undefined ? parseFloat(quantity) : 0.00);

    // Prepare JSON payload for the QR code
    const qrDataObj = {
      barcode_id: barcodeId,
      material_name,
      weight: finalWeight,
      batch_number: batch_number || null,
      manufacturing_date: manufacturing_date || null,
      rack_code: rack_code || null
    };

    const qrDataString = JSON.stringify(qrDataObj);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate relative file path and absolute destination path
    const filePath = `uploads/qr_${barcodeId}.png`;
    const fullPath = path.join(process.cwd(), filePath);

    // Save QR code as PNG image file
    await QRCode.toFile(fullPath, qrDataString, {
      width: 512,
      margin: 2
    });

    console.log(`QR generated: ${barcodeId}`);
    console.log('QR image saved successfully');
    console.log(`generated file path: /${filePath}`);

    // Save QR relative file path (as qr_data) and material details in the database
    const [result] = await db.query(
      'INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, qr_data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        barcodeId,
        material_name,
        1.00, // 1 container
        finalWeight,
        rack_code || null,
        filePath,
        'unused'
      ]
    );

    const qrId = result.insertId;
    console.log(`QR saved for: ${material_name}`);
    console.log(`database updated`);
    console.log(`QR Index linked: ${qrId}`);

    await logQrHistory(db, {
      barcode_id: barcodeId,
      material_name,
      action: 'GENERATED',
      rack_code: rack_code || null,
      user_id: req.user ? req.user.id : null,
      remarks: `Single QR Code Generated for ${material_name}`
    });

    let userName = 'System';
    if (req.user && req.user.id) {
      const [users] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) userName = users[0].name;
    }
    await logAudit({
      action_type: 'QR Generated',
      material_name,
      qr_code: barcodeId,
      rack_code: rack_code || null,
      user_name: userName,
      action_details: `Generated single QR code for material ${material_name} (Barcode: ${barcodeId})`
    });

    // Return the response payload
    res.status(201).json({
      status: 'success',
      message: 'QR generated and material registered successfully',
      barcode_id: barcodeId,
      data: {
        barcode_id: barcodeId
      },
      qr_image_path: `/${filePath}`, // prefixed with a leading slash
      material_name: material_name,
      batch_number: batch_number || null,
      rack_code: rack_code || null
    });
  } catch (error) {
    console.error('Error generating QR PNG file:', error.message);
    next(error);
  }
};

/**
 * Bulk generate QR codes for a material and assign them sequentially incremented unique barcode IDs.
 * POST /api/qr/bulk-generate
 */
export const bulkGenerateQR = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { material_name, quantity, rack_code, units } = req.body;
    console.log('[API Call] POST /api/qr/bulk-generate with req.body:', req.body);

    if (!material_name || !quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide material_name and quantity'
      });
    }

    const count = parseInt(quantity, 10);
    if (isNaN(count) || count <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'quantity must be a positive integer'
      });
    }

    // 1. Extract initials-based prefix from material name (e.g. "Dark Blue Paint" -> "DB")
    const words = material_name
      .split(' ')
      .filter(w => !['paint', 'material', 'raw', 'color', 'ink', 'powder', 'chemical'].includes(w.toLowerCase()));
    
    let prefix = 'QR';
    if (words.length >= 2) {
      prefix = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      prefix = words[0].slice(0, 2).toUpperCase();
    }
    // Clean prefix of non-alphabetic chars
    prefix = prefix.replace(/[^A-Z]/g, '');
    if (!prefix) prefix = 'QR';

    // 2. Query existing barcode IDs starting with this prefix to identify the next sequential number
    const [existingQrCodes] = await connection.query(
      'SELECT barcode_id FROM qr_codes WHERE barcode_id LIKE ?',
      [`${prefix}%`]
    );
    const [existingMaterials] = await connection.query(
      'SELECT barcode FROM materials WHERE barcode LIKE ?',
      [`${prefix}%`]
    );

    const existingBarcodes = new Set([
      ...existingQrCodes.map(q => q.barcode_id),
      ...existingMaterials.map(m => m.barcode)
    ]);

    let maxNum = 0;
    const regex = new RegExp(`^${prefix}(\\d+)$`);
    existingBarcodes.forEach(code => {
      const match = code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });

    let nextNumber = maxNum + 1;
    const generatedList = [];

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 3. Loop and generate QR codes
    for (let i = 0; i < count; i++) {
      const barcodeId = `${prefix}${String(nextNumber).padStart(3, '0')}`;
      nextNumber++;

      const qrDataObj = {
        barcode_id: barcodeId,
        material_name,
        weight: units !== undefined ? parseFloat(units) : 0.00,
        batch_number: null,
        manufacturing_date: null,
        rack_code: rack_code || null
      };

      const qrDataString = JSON.stringify(qrDataObj);
      const filePath = `uploads/qr_${barcodeId}.png`;
      const fullPath = path.join(process.cwd(), filePath);

      // Save QR code as PNG image file
      await QRCode.toFile(fullPath, qrDataString, {
        width: 512,
        margin: 2
      });

      console.log(`[Bulk QR DB] Inserting into qr_codes: barcode_id=${barcodeId}, material_name=${material_name}, quantity=1.00, units=${units !== undefined ? parseFloat(units) : 0.00}, rack_code=${rack_code || null}, qr_data=${filePath}`);
      // Insert into qr_codes table
      await connection.query(
        'INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, qr_data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          barcodeId,
          material_name,
          1.00, // 1 container
          units !== undefined ? parseFloat(units) : 0.00,
          rack_code || null,
          filePath,
          'unused'
        ]
      );

      await logQrHistory(connection, {
        barcode_id: barcodeId,
        material_name,
        action: 'GENERATED',
        rack_code: rack_code || null,
        user_id: req.user ? req.user.id : null,
        remarks: `Bulk QR Code Generated for ${material_name}`
      });

      let userName = 'System';
      if (req.user && req.user.id) {
        const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        if (users.length > 0) userName = users[0].name;
      }
      await logAudit({
        action_type: 'QR Generated',
        material_name,
        qr_code: barcodeId,
        rack_code: rack_code || null,
        user_name: userName,
        action_details: `Bulk QR code generated for material ${material_name} (Barcode: ${barcodeId})`
      });

      generatedList.push({
        barcode_id: barcodeId,
        qr_image_path: `/${filePath}`
      });
    }

    await connection.commit();

    console.log(`[Bulk QR] Generated ${count} QR codes with prefix ${prefix}`);

    res.status(201).json({
      success: true,
      generated: count,
      data: generatedList
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error in bulk QR generation:', error.message);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Get a paginated, filterable list of all generated QR codes.
 * GET /api/qr/list
 */
export const getQrCodesList = async (req, res, next) => {
  try {
    const { q, status, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM qr_codes q
      WHERE q.qr_data IS NOT NULL AND q.qr_data != ''
    `;
    let dataQuery = `
      SELECT 
        q.id,
        q.barcode_id,
        q.material_name,
        NULL AS batch_number,
        COALESCE(q.rack_code, 'Not Assigned') AS rack_code,
        q.units AS quantity,
        IF(q.status = 'unused', 'Unused', 'Used') AS status,
        q.qr_data AS qr_image_path,
        q.created_at
      FROM qr_codes q
      WHERE q.qr_data IS NOT NULL AND q.qr_data != ''
    `;

    const queryParams = [];

    // Search filter
    if (q) {
      const searchPattern = `%${q}%`;
      countQuery += ` AND (q.material_name LIKE ? OR q.barcode_id LIKE ?)`;
      dataQuery += ` AND (q.material_name LIKE ? OR q.barcode_id LIKE ?)`;
      queryParams.push(searchPattern, searchPattern);
    }

    // Status filter
    if (status && status !== 'all') {
      countQuery += ` AND q.status = ?`;
      dataQuery += ` AND q.status = ?`;
      queryParams.push(status);
    }

    // Sort by creation date descending
    dataQuery += ` ORDER BY q.created_at DESC`;

    // Pagination limits
    dataQuery += ` LIMIT ? OFFSET ?`;
    
    const countParams = [...queryParams];
    const dataParams = [...queryParams, limitNum, offset];

    const [[{ total }]] = await db.query(countQuery, countParams);
    const [results] = await db.query(dataQuery, dataParams);

    res.status(200).json({
      status: 'success',
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve QR Traceability history including scan details and transaction history.
 * GET /api/qr/trace/:barcode_id
 */
export const getQrTrace = async (req, res, next) => {
  try {
    const { barcode_id } = req.params;

    // 1. Fetch QR code record and join with the user who scanned it
    const [qrRecords] = await db.query(
      `SELECT q.id, q.barcode_id, q.material_name, q.quantity, q.units, 
              COALESCE(q.rack_code, 'Not Assigned') AS rack_code, q.status, 
              q.scanned_at, u.name AS scanned_by_name, q.created_at,
              q.batch_number, q.manufacturing_date
       FROM qr_codes q
       LEFT JOIN users u ON q.scanned_by = u.id
       WHERE q.barcode_id = ?`,
      [barcode_id]
    );

    if (qrRecords.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `QR code with Barcode ID '${barcode_id}' not found`
      });
    }

    const qrCode = qrRecords[0];

    // 2. Fetch transaction history of the associated material
    // We map barcode_id to materials.barcode
    const [materials] = await db.query(
      'SELECT id, quantity AS current_stock, unit FROM materials WHERE barcode = ?',
      [barcode_id]
    );

    let transactions = [];
    let materialDetails = null;
    if (materials.length > 0) {
      materialDetails = materials[0];
      const materialId = materials[0].id;
      const [txs] = await db.query(
        `SELECT t.id, t.transaction_type, t.quantity, t.created_at, u.name AS user_name
         FROM transactions t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.material_id = ?
         ORDER BY t.created_at DESC`,
        [materialId]
      );
      transactions = txs;
    }

    res.status(200).json({
      status: 'success',
      data: {
        qrCode,
        materialDetails,
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve complete QR history logs.
 * GET /api/qr/history
 */
export const getQrHistory = async (req, res, next) => {
  try {
    const { action, limit = 100, page = 1 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 100;
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM qr_history';
    let countQuery = 'SELECT COUNT(*) AS total FROM qr_history';
    const params = [];

    if (action) {
      query += ' WHERE action = ?';
      countQuery += ' WHERE action = ?';
      params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const dataParams = [...params, limitNum, offset];

    const [[{ total }]] = await db.query(countQuery, params);
    const [results] = await db.query(query, dataParams);

    res.status(200).json({
      status: 'success',
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve QR history for a specific barcode_id.
 * GET /api/qr/history/:barcode_id
 */
export const getQrHistoryByBarcode = async (req, res, next) => {
  try {
    const { barcode_id } = req.params;

    const [results] = await db.query(
      'SELECT * FROM qr_history WHERE barcode_id = ? ORDER BY created_at ASC',
      [barcode_id]
    );

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve Warehouse Traffic Analytics from movement history logs.
 * GET /api/qr/traffic-analytics
 */
export const getTrafficAnalytics = async (req, res, next) => {
  try {
    // 1. Most Active Rack
    const [mostActiveRacks] = await db.query(
      `SELECT rack_code, COUNT(*) AS count
       FROM qr_history
       WHERE rack_code IS NOT NULL AND rack_code != '' AND rack_code != 'Not Assigned' AND rack_code != 'Unassigned'
       GROUP BY rack_code
       ORDER BY count DESC
       LIMIT 1`
    );
    const mostActiveRack = mostActiveRacks.length > 0 ? mostActiveRacks[0] : { rack_code: 'N/A', count: 0 };

    // 2. Least Active Rack (Rank all registered racks by activity count, including 0 count racks)
    const [leastActiveRacks] = await db.query(
      `SELECT r.rack_code, COUNT(qh.id) AS count
       FROM racks r
       LEFT JOIN qr_history qh ON r.rack_code = qh.rack_code
       GROUP BY r.rack_code
       ORDER BY count ASC, r.rack_code ASC
       LIMIT 1`
    );
    const leastActiveRack = leastActiveRacks.length > 0 ? leastActiveRacks[0] : { rack_code: 'N/A', count: 0 };

    // 3. Most Moved Material
    const [mostMovedMaterials] = await db.query(
      `SELECT material_name, COUNT(*) AS count
       FROM qr_history
       WHERE action IN ('MOVED', 'INWARD', 'OUTWARD', 'SCANNED')
       GROUP BY material_name
       ORDER BY count DESC
       LIMIT 1`
    );
    const mostMovedMaterial = mostMovedMaterials.length > 0 ? mostMovedMaterials[0] : { material_name: 'N/A', count: 0 };

    // 4. Today's Movements
    const [[{ todayCount }]] = await db.query(
      `SELECT COUNT(*) AS todayCount
       FROM qr_history
       WHERE DATE(created_at) = CURDATE()`
    );

    // 5. This Week Movements
    const [[{ thisWeekCount }]] = await db.query(
      `SELECT COUNT(*) AS thisWeekCount
       FROM qr_history
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    // 6. Daily Movements Chart Data (Last 7 days)
    const [dailyLogs] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
       FROM qr_history
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // 7. Top 5 Rack Activity Chart Data
    const [rackActivityLogs] = await db.query(
      `SELECT rack_code, COUNT(*) AS count
       FROM qr_history
       WHERE rack_code IS NOT NULL AND rack_code != '' AND rack_code != 'Not Assigned' AND rack_code != 'Unassigned'
       GROUP BY rack_code
       ORDER BY count DESC
       LIMIT 5`
    );

    res.status(200).json({
      status: 'success',
      data: {
        mostActiveRack,
        leastActiveRack,
        mostMovedMaterial,
        todayMovements: todayCount,
        thisWeekMovements: thisWeekCount,
        dailyMovements: dailyLogs,
        rackActivity: rackActivityLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

