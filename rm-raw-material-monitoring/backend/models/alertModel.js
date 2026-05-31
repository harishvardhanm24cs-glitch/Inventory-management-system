const db = require('../config/db');

const Alert = {
  async createAlert(material_id, message) {
    // Check if an unresolved alert already exists for this material to prevent spam
    const [existing] = await db.query(
      'SELECT id FROM alerts WHERE material_id = ? AND is_resolved = FALSE', 
      [material_id]
    );

    if (existing.length === 0) {
      const [result] = await db.query(
        'INSERT INTO alerts (material_id, message) VALUES (?, ?)',
        [material_id, message]
      );
      return result.insertId;
    }
    return null; // Alert already active
  },

  async getActiveAlerts() {
    const [rows] = await db.query(`
      SELECT a.*, m.material_name, m.barcode, m.quantity, m.threshold_limit 
      FROM alerts a
      JOIN materials m ON a.material_id = m.id
      WHERE a.is_resolved = FALSE
      ORDER BY a.created_at DESC
    `);
    return rows;
  },
  
  async resolveAlert(id) {
    const [result] = await db.query('UPDATE alerts SET is_resolved = TRUE WHERE id = ?', [id]);
    return result.affectedRows;
  }
};

module.exports = Alert;
