import pool from '../config/db.js';

/**
 * Log warehouse events to the audit_logs table
 */
export const logAudit = async ({
  action_type,
  material_name = null,
  qr_code = null,
  rack_code = null,
  user_name = 'System',
  action_details = null
}) => {
  try {
    const query = `
      INSERT INTO audit_logs (action_type, material_name, qr_code, rack_code, user_name, action_details)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [
      action_type,
      material_name,
      qr_code,
      rack_code,
      user_name,
      action_details
    ]);
    console.log(`[Audit Log] ${action_type}: ${action_details || ''}`);
  } catch (error) {
    console.error('[Audit Log Error] Failed to log audit event:', error.message);
  }
};
export default logAudit;
