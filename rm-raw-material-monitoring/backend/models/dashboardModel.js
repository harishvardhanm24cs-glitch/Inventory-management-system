const db = require('../config/db');

const Dashboard = {
  async getOverviewStats() {
    // Aggregate multiple basic stats using parallel queries
    const [[{ total_materials }]] = await db.query('SELECT COUNT(*) as total_materials FROM materials');
    const [[{ low_stock }]] = await db.query('SELECT COUNT(*) as low_stock FROM materials WHERE quantity <= threshold_limit');
    const [[{ active_alerts }]] = await db.query('SELECT COUNT(*) as active_alerts FROM alerts WHERE is_resolved = FALSE');
    
    // Get today's total inward/outward movement
    const [[today_stats]] = await db.query(`
      SELECT 
        SUM(CASE WHEN type = 'inward' THEN quantity ELSE 0 END) as today_inward,
        SUM(CASE WHEN type = 'outward' THEN quantity ELSE 0 END) as today_outward
      FROM transactions 
      WHERE DATE(created_at) = CURDATE()
    `);

    return {
      total_materials,
      low_stock,
      active_alerts,
      today_inward: today_stats.today_inward || 0,
      today_outward: today_stats.today_outward || 0
    };
  },

  async getDailyTrends() {
    // Group transactions by date for the last 7 days
    const [rows] = await db.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'inward' THEN quantity ELSE 0 END) as total_inward,
        SUM(CASE WHEN type = 'outward' THEN quantity ELSE 0 END) as total_outward
      FROM transactions
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return rows;
  },

  async getTopConsumed() {
    // Top 5 materials consumed (outward) in the last 30 days
    const [rows] = await db.query(`
      SELECT 
        m.material_name,
        SUM(t.quantity) as total_consumed,
        m.unit
      FROM transactions t
      JOIN materials m ON t.material_id = m.id
      WHERE t.type = 'outward' AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY t.material_id, m.material_name, m.unit
      ORDER BY total_consumed DESC
      LIMIT 5
    `);
    return rows;
  }
};

module.exports = Dashboard;
