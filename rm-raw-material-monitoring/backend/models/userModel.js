const db = require('../config/db');

const User = {
  async create(name, email, password, role) {
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role || 'worker']
    );
    return result.insertId;
  },

  async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
    return rows[0];
  }
};

module.exports = User;
