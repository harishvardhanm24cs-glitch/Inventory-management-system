const db = require('../config/db');

const Material = {
  async findAll() {
    const [rows] = await db.query('SELECT * FROM materials ORDER BY created_at DESC');
    return rows;
  },

  async findByBarcode(barcode) {
    const [rows] = await db.query('SELECT * FROM materials WHERE barcode = ?', [barcode]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM materials WHERE id = ?', [id]);
    return rows[0];
  },

  async create(material) {
    const { barcode, material_name, quantity, threshold_limit, unit, batch_number } = material;
    const [result] = await db.query(
      'INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number) VALUES (?, ?, ?, ?, ?, ?)',
      [barcode, material_name, quantity, threshold_limit || 10, unit || 'kg', batch_number || '']
    );
    return result.insertId;
  },

  async update(id, material) {
    const { barcode, material_name, quantity, threshold_limit, unit, batch_number } = material;
    const [result] = await db.query(
      'UPDATE materials SET barcode = ?, material_name = ?, quantity = ?, threshold_limit = ?, unit = ?, batch_number = ? WHERE id = ?',
      [barcode, material_name, quantity, threshold_limit, unit, batch_number, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM materials WHERE id = ?', [id]);
    return result.affectedRows;
  }
};

module.exports = Material;
