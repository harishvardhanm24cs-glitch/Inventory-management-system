import db from '../config/db.js';

/**
 * Get paginated and filterable list of audit logs
 * GET /api/audit-logs
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action_type, material_name, rack_code, user_name, date, q, page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'DESC' } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    let countQuery = 'SELECT COUNT(*) AS total FROM audit_logs WHERE 1=1';
    let dataQuery = 'SELECT * FROM audit_logs WHERE 1=1';
    const queryParams = [];

    // Filter by action type
    if (action_type && action_type !== 'All') {
      countQuery += ' AND action_type = ?';
      dataQuery += ' AND action_type = ?';
      queryParams.push(action_type);
    }

    // Filter by material name
    if (material_name) {
      countQuery += ' AND material_name LIKE ?';
      dataQuery += ' AND material_name LIKE ?';
      queryParams.push(`%${material_name}%`);
    }

    // Filter by rack code
    if (rack_code) {
      countQuery += ' AND rack_code LIKE ?';
      dataQuery += ' AND rack_code LIKE ?';
      queryParams.push(`%${rack_code}%`);
    }

    // Filter by user
    if (user_name) {
      countQuery += ' AND user_name LIKE ?';
      dataQuery += ' AND user_name LIKE ?';
      queryParams.push(`%${user_name}%`);
    }

    // Filter by date (YYYY-MM-DD)
    if (date) {
      countQuery += ' AND DATE(timestamp) = ?';
      dataQuery += ' AND DATE(timestamp) = ?';
      queryParams.push(date);
    }

    // General search query
    if (q) {
      countQuery += ' AND (action_type LIKE ? OR material_name LIKE ? OR rack_code LIKE ? OR user_name LIKE ? OR action_details LIKE ?)';
      dataQuery += ' AND (action_type LIKE ? OR material_name LIKE ? OR rack_code LIKE ? OR user_name LIKE ? OR action_details LIKE ?)';
      const pattern = `%${q}%`;
      queryParams.push(pattern, pattern, pattern, pattern, pattern);
    }

    // Sort order validation
    const allowedSortFields = ['timestamp', 'action_type', 'user_name', 'material_name', 'rack_code'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    dataQuery += ` ORDER BY ${sortField} ${direction} LIMIT ? OFFSET ?`;
    
    const countParams = [...queryParams];
    const dataParams = [...queryParams, limitNum, offset];

    const [[{ total }]] = await db.query(countQuery, countParams);
    const [results] = await db.query(dataQuery, dataParams);

    // Get today's summary stats
    const todaySummaryQuery = `
      SELECT 
        COUNT(CASE WHEN DATE(timestamp) = CURDATE() THEN 1 END) AS today_actions,
        COUNT(CASE WHEN action_type = 'Inward Scan' AND DATE(timestamp) = CURDATE() THEN 1 END) AS inward_count,
        COUNT(CASE WHEN action_type = 'Outward Scan' AND DATE(timestamp) = CURDATE() THEN 1 END) AS outward_count,
        COUNT(CASE WHEN action_type = 'Threshold Alert' AND DATE(timestamp) = CURDATE() THEN 1 END) AS alerts_generated,
        COUNT(CASE WHEN action_type = 'Email Alert' AND DATE(timestamp) = CURDATE() THEN 1 END) AS emails_sent
      FROM audit_logs
    `;
    const [[summaryStats]] = await db.query(todaySummaryQuery);

    res.status(200).json({
      status: 'success',
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      stats: summaryStats || { today_actions: 0, inward_count: 0, outward_count: 0, alerts_generated: 0, emails_sent: 0 },
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent audit logs
 * GET /api/audit-logs/recent
 */
export const getRecentAuditLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const [results] = await db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?', [limit]);
    
    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export audit logs (returns all records matching filter without pagination)
 * GET /api/audit-logs/export
 */
export const exportAuditLogs = async (req, res, next) => {
  try {
    const { action_type, material_name, rack_code, user_name, date, q, sortBy = 'timestamp', sortOrder = 'DESC' } = req.query;

    let dataQuery = 'SELECT * FROM audit_logs WHERE 1=1';
    const queryParams = [];

    // Filter by action type
    if (action_type && action_type !== 'All') {
      dataQuery += ' AND action_type = ?';
      queryParams.push(action_type);
    }

    // Filter by material name
    if (material_name) {
      dataQuery += ' AND material_name LIKE ?';
      queryParams.push(`%${material_name}%`);
    }

    // Filter by rack code
    if (rack_code) {
      dataQuery += ' AND rack_code LIKE ?';
      queryParams.push(`%${rack_code}%`);
    }

    // Filter by user
    if (user_name) {
      dataQuery += ' AND user_name LIKE ?';
      queryParams.push(`%${user_name}%`);
    }

    // Filter by date (YYYY-MM-DD)
    if (date) {
      dataQuery += ' AND DATE(timestamp) = ?';
      queryParams.push(date);
    }

    // General search query
    if (q) {
      dataQuery += ' AND (action_type LIKE ? OR material_name LIKE ? OR rack_code LIKE ? OR user_name LIKE ? OR action_details LIKE ?)';
      const pattern = `%${q}%`;
      queryParams.push(pattern, pattern, pattern, pattern, pattern);
    }

    const allowedSortFields = ['timestamp', 'action_type', 'user_name', 'material_name', 'rack_code'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    dataQuery += ` ORDER BY ${sortField} ${direction}`;

    const [results] = await db.query(dataQuery, queryParams);

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    next(error);
  }
};
