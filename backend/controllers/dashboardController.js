import db from '../config/db.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Count materials from materials table
    const [[{ total: total_materials }]] = await db.query('SELECT COUNT(*) AS total FROM materials');

    // 2. Count total inventory (sum of quantity from materials table)
    const [[{ total: total_inventory_raw }]] = await db.query('SELECT SUM(quantity) AS total FROM materials');
    const total_inventory = parseFloat(total_inventory_raw) || 0.00;

    // 3. Count racks from rack_inventory table
    const [[{ total: total_racks }]] = await db.query('SELECT COUNT(*) AS total FROM rack_inventory');

    // 4. Count occupied racks (where current_capacity > 0)
    const [[{ total: occupied_racks }]] = await db.query('SELECT COUNT(*) AS total FROM rack_inventory WHERE current_capacity > 0');

    // 5. Count empty racks (where current_capacity = 0)
    const [[{ total: empty_racks }]] = await db.query('SELECT COUNT(*) AS total FROM rack_inventory WHERE current_capacity = 0');

    // 6. Count QR codes
    const [[{ total: total_qr_codes }]] = await db.query('SELECT COUNT(*) AS total FROM qr_codes');
    const [[{ total: used_qr_codes }]] = await db.query("SELECT COUNT(*) AS total FROM qr_codes WHERE status = 'used'");
    const [[{ total: unused_qr_codes }]] = await db.query("SELECT COUNT(*) AS total FROM qr_codes WHERE status = 'unused'");

    // 7. Count active alerts
    const [[{ total: active_alerts }]] = await db.query("SELECT COUNT(*) AS total FROM alerts WHERE alert_status = 'active'");

    // 8. Warehouse capacities (total, occupied, available)
    const [[{ total_curr, total_max }]] = await db.query(
      'SELECT SUM(current_capacity) AS total_curr, SUM(max_capacity) AS total_max FROM rack_inventory'
    );
    const occupied_capacity = parseFloat(total_curr) || 0.00;
    const total_warehouse_capacity = parseFloat(total_max) || 0.00;
    const available_capacity = Math.max(0, total_warehouse_capacity - occupied_capacity);
    const warehouse_utilization = total_warehouse_capacity > 0 
      ? parseFloat(((occupied_capacity / total_warehouse_capacity) * 100).toFixed(2)) 
      : 0.00;

    // 9. Count active workers/users from users table
    const [[{ total: active_workers }]] = await db.query('SELECT COUNT(*) AS total FROM users');

    // 10. Count low stock items (quantity <= threshold_limit)
    const [[{ total: low_stock_items }]] = await db.query('SELECT COUNT(*) AS total FROM materials WHERE quantity <= threshold_limit');

    // 11. Count Today's Inward Transactions
    const [[{ total: todays_inward }]] = await db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE LOWER(transaction_type) = 'inward' AND DATE(created_at) = CURDATE()"
    );

    // 12. Count Today's Outward Transactions
    const [[{ total: todays_outward }]] = await db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE LOWER(transaction_type) = 'outward' AND DATE(created_at) = CURDATE()"
    );

    res.status(200).json({
      status: 'success',
      data: {
        total_materials: total_materials || 0,
        total_inventory: total_inventory || 0,
        total_warehouse_capacity: total_warehouse_capacity || 0,
        occupied_capacity: occupied_capacity || 0,
        available_capacity: available_capacity || 0,
        total_racks: total_racks || 0,
        occupied_racks: occupied_racks || 0,
        empty_racks: empty_racks || 0,
        active_workers: active_workers || 0,
        low_stock_items: low_stock_items || 0,
        todays_inward_transactions: todays_inward || 0,
        todays_outward_transactions: todays_outward || 0,
        total_qr_codes: total_qr_codes || 0,
        used_qr_codes: used_qr_codes || 0,
        unused_qr_codes: unused_qr_codes || 0,
        active_alerts: active_alerts || 0,
        warehouse_utilization: warehouse_utilization || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comprehensive warehouse analytics data with support for filtering
 * GET /api/dashboard/analytics
 */
export const getWarehouseAnalytics = async (req, res, next) => {
  try {
    const { dateRange = '30d', material = 'all', rack = 'all', transactionType = 'all' } = req.query;

    // Build date filter clause for transactions/history
    let dateInterval = '30 DAY';
    if (dateRange === '7d') dateInterval = '7 DAY';
    else if (dateRange === '90d') dateInterval = '90 DAY';
    else if (dateRange === '1y') dateInterval = '1 YEAR';

    const useDateFilter = dateRange !== 'all';

    // 1. Inventory by Material
    let matQuery = 'SELECT id, barcode, material_name, quantity, threshold_limit, unit FROM materials';
    const matParams = [];
    if (material !== 'all') {
      matQuery += ' WHERE material_name = ?';
      matParams.push(material);
    }
    matQuery += ' ORDER BY quantity DESC LIMIT 20';
    const [materialsList] = await db.query(matQuery, matParams);

    const inventoryByMaterial = materialsList.map(m => ({
      name: m.material_name,
      barcode: m.barcode,
      stock: parseFloat(m.quantity) || 0,
      threshold: parseFloat(m.threshold_limit) || 0,
      unit: m.unit || 'KG'
    }));

    // 2. Inventory by Rack
    let rackQuery = 'SELECT rack_code, material_name, current_capacity, max_capacity FROM rack_inventory';
    const rackParams = [];
    if (rack !== 'all') {
      rackQuery += ' WHERE rack_code = ?';
      rackParams.push(rack);
    }
    rackQuery += ' ORDER BY current_capacity DESC LIMIT 20';
    const [racksList] = await db.query(rackQuery, rackParams);

    const inventoryByRack = racksList.map(r => ({
      rack_code: r.rack_code,
      material_name: r.material_name || 'Unassigned',
      occupied: parseFloat(r.current_capacity) || 0,
      capacity: parseFloat(r.max_capacity) || 0,
      utilization: parseFloat(r.max_capacity) > 0 
        ? parseFloat(((parseFloat(r.current_capacity) / parseFloat(r.max_capacity)) * 100).toFixed(1)) 
        : 0
    }));

    // 3. Warehouse Utilization Summary
    const [[{ total_curr, total_max }]] = await db.query(
      'SELECT SUM(current_capacity) AS total_curr, SUM(max_capacity) AS total_max FROM rack_inventory'
    );
    const totalOcc = parseFloat(total_curr) || 0;
    const totalCap = parseFloat(total_max) || 0;
    const availCap = Math.max(0, totalCap - totalOcc);
    const utilPct = totalCap > 0 ? parseFloat(((totalOcc / totalCap) * 100).toFixed(1)) : 0;

    const warehouseUtilization = {
      totalCapacity: totalCap,
      occupiedCapacity: totalOcc,
      availableCapacity: availCap,
      utilizationPercentage: utilPct
    };

    // 4. Material Distribution (Percentage shares)
    const [distRows] = await db.query(
      'SELECT material_name, SUM(quantity) AS total_stock FROM materials GROUP BY material_name ORDER BY total_stock DESC LIMIT 8'
    );
    const sumAllStock = distRows.reduce((acc, r) => acc + (parseFloat(r.total_stock) || 0), 0);
    const materialDistribution = distRows.map(r => {
      const val = parseFloat(r.total_stock) || 0;
      return {
        name: r.material_name,
        value: val,
        percentage: sumAllStock > 0 ? parseFloat(((val / sumAllStock) * 100).toFixed(1)) : 0
      };
    });

    // 5. Daily Material Movement
    let dailyWhere = 'WHERE 1=1';
    const dailyParams = [];
    if (useDateFilter) {
      dailyWhere += ` AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})`;
    }
    if (material !== 'all') {
      dailyWhere += ' AND material_id IN (SELECT id FROM materials WHERE material_name = ?)';
      dailyParams.push(material);
    }
    if (transactionType !== 'all') {
      dailyWhere += ' AND LOWER(transaction_type) = ?';
      dailyParams.push(transactionType.toLowerCase());
    }

    const [dailyRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
              SUM(CASE WHEN LOWER(transaction_type) = 'inward' THEN quantity ELSE 0 END) AS inward,
              SUM(CASE WHEN LOWER(transaction_type) = 'outward' THEN quantity ELSE 0 END) AS outward
       FROM transactions
       ${dailyWhere}
       GROUP BY DATE(created_at)
       ORDER BY date ASC
       LIMIT 30`,
      dailyParams
    );

    const dailyMaterialMovement = dailyRows.map(r => ({
      date: r.date,
      inward: parseFloat(r.inward) || 0,
      outward: parseFloat(r.outward) || 0,
      total: (parseFloat(r.inward) || 0) + (parseFloat(r.outward) || 0)
    }));

    // 6. Weekly Transactions
    const [weeklyRows] = await db.query(
      `SELECT YEARWEEK(created_at, 1) AS yw,
              CONCAT('Week ', WEEK(created_at, 1)) AS label,
              SUM(CASE WHEN LOWER(transaction_type) = 'inward' THEN quantity ELSE 0 END) AS inward,
              SUM(CASE WHEN LOWER(transaction_type) = 'outward' THEN quantity ELSE 0 END) AS outward
       FROM transactions
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
       GROUP BY yw, label
       ORDER BY yw ASC`
    );

    const weeklyTransactions = weeklyRows.map(r => ({
      week: r.label,
      inward: parseFloat(r.inward) || 0,
      outward: parseFloat(r.outward) || 0
    }));

    // 7. Monthly Transactions
    const [monthlyRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%b %Y') AS month,
              SUM(CASE WHEN LOWER(transaction_type) = 'inward' THEN quantity ELSE 0 END) AS inward,
              SUM(CASE WHEN LOWER(transaction_type) = 'outward' THEN quantity ELSE 0 END) AS outward
       FROM transactions
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m'), month
       ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC`
    );

    const monthlyTransactions = monthlyRows.map(r => ({
      month: r.month,
      inward: parseFloat(r.inward) || 0,
      outward: parseFloat(r.outward) || 0
    }));

    res.status(200).json({
      status: 'success',
      data: {
        inventoryByMaterial,
        inventoryByRack,
        warehouseUtilization,
        materialDistribution,
        dailyMaterialMovement,
        weeklyTransactions,
        monthlyTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};


