import db from '../config/db.js';
import { processThresholdCheck } from '../services/alertService.js';
import { sendEmail } from '../services/emailService.js';

/**
 * Reusable helper to check low-stock threshold limit,
 * output console warnings, and trigger asynchronous Gmail alerts.
 * 
 * @param {object} material - The material record
 * @returns {string|null} The warning message if stock is low, otherwise null
 */
const triggerEmailAlert = (material) => {
  if (!material) {
    console.error("[Threshold Alert] Error: material object is null or undefined");
    return "Error: Material not found";
  }

  // Required console logs
  console.log("Updated Material:", material);
  console.log("Quantity:", material.quantity);
  console.log("Threshold:", material.threshold_limit);

  // Validate quantity is not undefined/null to prevent crash
  let qty = material.quantity;
  if (qty === undefined || qty === null) {
    console.warn(`[Threshold Alert] Quantity is undefined/null for material '${material.material_name || 'Unknown'}'. Defaulting to 0.00 to prevent crash.`);
    qty = 0.00;
  } else {
    qty = parseFloat(qty);
  }

  // Check if threshold_limit is null
  let limit = material.threshold_limit;
  if (limit === null || limit === undefined) {
    console.warn(`[Threshold Alert] Threshold limit is not configured (null/undefined) for material '${material.material_name || 'Unknown'}'. Warning generated.`);
    return `Warning: threshold_limit is not configured for material '${material.material_name || 'Unknown'}'`;
  } else {
    limit = parseFloat(limit);
  }

  // Compare quantity <= threshold_limit
  if (qty <= limit) {
    // Console log: threshold triggered
    console.warn(`[Threshold Alert] Low stock detected for '${material.material_name}': ${qty} ${material.unit || ''} (Threshold limit is ${limit} ${material.unit || ''})`);
    
    // Generate warning message
    const warningMsg = `Warning: ${material.material_name} stock is below threshold. Current Stock: ${qty} ${material.unit || ''}. Threshold Limit: ${limit} ${material.unit || ''}. Immediate refill required to prevent production shutdown.`;

    // Trigger email alert
    const recipient = process.env.EMAIL_USER || 'manager@gmail.com';
    const subject = `LOW STOCK ALERT - ${material.material_name}`;
    const emailText = `Warning:
${material.material_name} stock is below threshold.

Current Stock: ${qty} ${material.unit || ''}
Threshold Limit: ${limit} ${material.unit || ''}

Immediate refill required to prevent production shutdown.`;

    // Console log: email triggered
    console.log(`[Threshold Alert] Email notification triggered for '${material.material_name}' to recipient: ${recipient}`);

    sendEmail(recipient, subject, emailText)
      .then(result => {
        if (result.success) {
          // Console log: email sent
          console.log(`[Threshold Alert] Email sent successfully for '${material.material_name}'. Message ID: ${result.messageId}`);
        } else {
          console.error(`[Threshold Alert] Email failed to send for '${material.material_name}': ${result.error}`);
        }
      })
      .catch(err => {
        console.error(`[Threshold Alert] Uncaught exception during email delivery:`, err.message);
      });

    return warningMsg;
  }

  return "Stock level normal";
};


/**
 * Get all materials
 * GET /api/materials
 */
export const getAllMaterials = async (req, res, next) => {
  try {
    const [materials] = await db.query('SELECT * FROM materials ORDER BY created_at DESC');
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
    const [materials] = await db.query('SELECT * FROM materials WHERE barcode = ?', [barcode]);

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

    // Process alerts check
    const alertResult = await processThresholdCheck(null, materialId);

    // Fetch the newly created material
    const [newMaterial] = await db.query('SELECT * FROM materials WHERE id = ?', [materialId]);
    const createdMaterial = newMaterial[0];

    // Trigger SMTP email alert
    const warning = triggerEmailAlert(createdMaterial);

    res.status(201).json({
      status: 'success',
      message: 'Material created successfully',
      material: createdMaterial,
      warning: warning || (alertResult?.alertGenerated ? alertResult.message : null)
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
    const { material_name, quantity, threshold_limit, unit, batch_number, barcode } = req.body;

    // Validate material exists
    const [existing] = await db.query('SELECT id FROM materials WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

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

    // Process alerts check in DB
    const alertResult = await processThresholdCheck(null, id);

    // FETCH FULL UPDATED RECORD FROM MYSQL (Double-fetching state as required)
    const [updated] = await db.query('SELECT * FROM materials WHERE id = ?', [id]);
    const updatedMaterial = updated[0];

    // Trigger SMTP email alert warning
    const warning = triggerEmailAlert(updatedMaterial);

    // Console Log: material updated
    console.log(`[Inventory] Material updated: '${updatedMaterial.material_name}' (ID: ${id})`);

    res.status(200).json({
      status: 'success',
      message: 'Material updated successfully',
      material: updatedMaterial,
      warning: warning || (alertResult?.alertGenerated ? alertResult.message : "No warning message generated")
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

    const [existing] = await db.query('SELECT id FROM materials WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

    await db.query('DELETE FROM materials WHERE id = ?', [id]);

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

    // Fetch and lock material row for safety
    const [materials] = await connection.query(
      'SELECT * FROM materials WHERE id = ? FOR UPDATE',
      [id]
    );

    if (materials.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

    const material = materials[0];
    const currentQty = parseFloat(material.quantity);
    let newQty = currentQty;

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

    // Record stock transaction
    const [transResult] = await connection.query(
      'INSERT INTO transactions (material_id, transaction_type, quantity) VALUES (?, ?, ?)',
      [id, transaction_type, adjustQty]
    );

    // Commit to make quantity change final
    await connection.commit();

    // Check thresholds & trigger low-stock alerts
    const alertResult = await processThresholdCheck(null, id);

    // Retrieve updated material status
    const [updatedMaterials] = await db.query('SELECT * FROM materials WHERE id = ?', [id]);
    const updatedMaterial = updatedMaterials[0];

    // Trigger SMTP email alert
    const warningMessage = triggerEmailAlert(updatedMaterial);

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
      warning: warningMessage || (alertResult?.alertGenerated ? alertResult.message : null)
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
