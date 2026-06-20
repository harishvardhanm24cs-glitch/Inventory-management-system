import db from '../config/db.js';

/**
 * Log a new lifecycle trace event for a barcode.
 * 
 * @param {object} connectionOrPool - Active DB connection (transaction scope) or pool.
 * @param {object} params - Log details
 * @param {string} params.barcode_id - Barcode ID being tracked
 * @param {string} params.material_name - Name of material associated
 * @param {string} params.action - Trace action (GENERATED, SCANNED, INWARD, OUTWARD, MOVED, USED)
 * @param {string} [params.rack_code] - Associated rack code (optional)
 * @param {number} [params.user_id] - User ID who triggered the action (optional)
 * @param {string} [params.remarks] - Log notes (optional)
 */
export const logQrHistory = async (connectionOrPool, { barcode_id, material_name, action, rack_code, user_id, remarks, quantity }) => {
  try {
    const conn = connectionOrPool || db;

    // Resolve user_name from user_id if provided
    let user_name = 'System';
    if (user_id) {
      const [users] = await conn.query('SELECT name FROM users WHERE id = ?', [user_id]);
      if (users.length > 0) {
        user_name = users[0].name;
      }
    }

    await conn.query(
      `INSERT INTO qr_history (barcode_id, material_name, action, rack_code, quantity, user_name, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        barcode_id,
        material_name,
        action,
        rack_code || null,
        quantity !== undefined ? quantity : null,
        user_name,
        remarks || null
      ]
    );
    console.log(`[QR History] Logged action '${action}' for barcode: ${barcode_id}`);
  } catch (error) {
    console.error('[QR History] Failed to write QR history log:', error.message);
  }
};
