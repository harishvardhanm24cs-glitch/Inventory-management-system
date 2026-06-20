import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * Retrieve the latest 20 warehouse movements from qr_history.
 * GET /api/movements/recent
 */
export const getRecentMovements = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        barcode_id,
        material_name,
        action,
        rack_code,
        remarks,
        created_at
      FROM qr_history
      ORDER BY created_at DESC
      LIMIT 20
    `);

    // Map DB actions to movement fields expected by frontend
    const movements = rows.map(row => {
      const actionUpper = (row.action || '').toUpperCase();
      const isOutward = ['OUTWARD', 'USED'].includes(actionUpper);
      
      const movement_type = isOutward ? 'OUTWARD' : 'INWARD';
      
      let source_location = 'Ingress Port';
      let destination_location = 'Outbound Port';
      
      if (isOutward) {
        source_location = row.rack_code || 'Warehouse';
        destination_location = 'Outbound Port';
      } else {
        source_location = 'Ingress Port';
        destination_location = row.rack_code || 'Warehouse';
      }

      return {
        id: row.id,
        barcode_id: row.barcode_id,
        material_name: row.material_name,
        source_location,
        destination_location,
        movement_type,
        timestamp: row.created_at,
        created_at: row.created_at
      };
    });

    res.status(200).json({
      status: 'success',
      results: movements.length,
      data: movements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new warehouse movement and log audit trail
 * POST /api/movements
 */
export const createMovement = async (req, res, next) => {
  try {
    const { barcode_id, material_name, source_location, destination_location, movement_type } = req.body;

    console.log('[DEBUG] createMovement Request Body:', req.body);

    // Validate required fields
    if (!barcode_id) {
      return res.status(400).json({ status: 'error', message: 'barcode_id is required' });
    }
    if (!material_name) {
      return res.status(400).json({ status: 'error', message: 'material_name is required' });
    }
    if (!source_location) {
      return res.status(400).json({ status: 'error', message: 'source_location is required' });
    }
    if (!destination_location) {
      return res.status(400).json({ status: 'error', message: 'destination_location is required' });
    }
    if (!movement_type) {
      return res.status(400).json({ status: 'error', message: 'movement_type is required' });
    }

    const remarks = `Moved from ${source_location} to ${destination_location}`;
    
    // Determine rack code based on movement direction
    let rackCode = null;
    const typeUpper = movement_type.toUpperCase();
    if (typeUpper === 'OUTWARD') {
      rackCode = source_location ? source_location.replace('Rack ', '').trim() : null;
    } else {
      rackCode = destination_location ? destination_location.replace('Rack ', '').trim() : null;
    }

    // Map movement_type to action ENUM if valid, otherwise fallback to 'MOVED'
    let dbAction = 'MOVED';
    if (['INWARD', 'OUTWARD', 'MOVED', 'USED', 'GENERATED', 'SCANNED'].includes(typeUpper)) {
      dbAction = typeUpper;
    }

    // Resolve user name safely from DB to prevent undefined parameter issues
    let userName = 'System';
    if (req.user) {
      if (req.user.id) {
        const [users] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        if (users.length > 0) {
          userName = users[0].name;
        } else {
          userName = req.user.email || req.user.role || 'System';
        }
      } else {
        userName = req.user.name || req.user.email || req.user.role || 'System';
      }
    }

    const sqlQuery = `
      INSERT INTO qr_history (barcode_id, material_name, action, rack_code, user_name, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const sqlParams = [
      barcode_id,
      material_name,
      dbAction,
      rackCode,
      userName,
      remarks
    ];

    console.log('[DEBUG] Executing SQL:', sqlQuery.trim());
    console.log('[DEBUG] Params:', sqlParams);

    await db.query(sqlQuery, sqlParams);

    // Identify if this is a transfer between racks or initial assignment
    let actionType = 'Rack Assignment';
    if (
      source_location.toLowerCase().includes('rack') && 
      destination_location.toLowerCase().includes('rack')
    ) {
      actionType = 'Rack Transfer';
    }

    await logAudit({
      action_type: actionType,
      material_name: material_name,
      qr_code: barcode_id,
      rack_code: rackCode,
      user_name: userName,
      action_details: `Transferred material ${material_name} from ${source_location} to ${destination_location}`
    });

    res.status(201).json({
      status: 'success',
      message: 'Movement created successfully'
    });
  } catch (error) {
    console.error('[ERROR] createMovement failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error occurred while inserting movement',
      error: error.message,
      sqlState: error.sqlState,
      code: error.code,
      errno: error.errno
    });
  }
};
