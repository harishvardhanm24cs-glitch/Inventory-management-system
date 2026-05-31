import QRCode from 'qrcode';
import db from '../config/db.js';
import fs from 'fs';
import path from 'path';

/**
 * Generate QR Code and register new material bucket
 * POST /api/generate-qr
 */
export const generateQR = async (req, res, next) => {
  try {
    const { material_name, weight, batch_number, manufacturing_date, rack_code } = req.body;

    // Validate material_name
    if (!material_name) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide material_name'
      });
    }

    // Automatically generate unique barcode ID
    const barcodeId = `BAR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Prepare JSON payload for the QR code
    const qrDataObj = {
      barcode_id: barcodeId,
      material_name,
      weight: weight !== undefined ? parseFloat(weight) : 0.00,
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
      'INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number, qr_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        barcodeId,
        material_name,
        parseFloat(weight) || 0.00,
        0.00, // default safety threshold
        'KG', // default unit
        batch_number || null,
        filePath // Store file path in materials.qr_data
      ]
    );

    const materialId = result.insertId;
    console.log(`QR saved for: ${material_name}`);
    console.log(`database updated`);
    console.log(`Material linked: ${materialId}`);

    // Return the response payload
    res.status(201).json({
      status: 'success',
      message: 'QR generated and material registered successfully',
      barcode_id: barcodeId,
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
