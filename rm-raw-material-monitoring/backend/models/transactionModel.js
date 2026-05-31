const db = require('../config/db');

const Transaction = {
  async getHistory() {
    const [rows] = await db.query(`
      SELECT t.*, m.material_name, m.barcode, u.name as user_name 
      FROM transactions t
      JOIN materials m ON t.material_id = m.id
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    return rows;
  },

  async logTransaction(material_id, user_id, type, quantity, previous_stock, new_stock) {
    const [result] = await db.query(
      'INSERT INTO transactions (material_id, user_id, type, quantity, previous_stock, new_stock) VALUES (?, ?, ?, ?, ?, ?)',
      [material_id, user_id, type, quantity, previous_stock, new_stock]
    );
    return result.insertId;
  }
};

module.exports = Transaction;
