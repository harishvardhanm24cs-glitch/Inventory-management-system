import db from '../config/db.js';

export const getWarehouseStats = async (req, res, next) => {
  try {
    // 1. Total Racks
    const [[{ total: totalRacks }]] = await db.query('SELECT COUNT(*) AS total FROM racks');

    // 2. Occupied Racks
    const [[{ total: occupiedRacks }]] = await db.query('SELECT COUNT(*) AS total FROM racks WHERE quantity > 0');

    // 3. Empty Racks
    const [[{ total: emptyRacks }]] = await db.query('SELECT COUNT(*) AS total FROM racks WHERE quantity = 0');

    // 3.5. QR Stats
    const [[{ total: totalQrCodes }]] = await db.query('SELECT COUNT(*) AS total FROM qr_codes');
    const [[{ total: usedQrCodes }]] = await db.query("SELECT COUNT(*) AS total FROM qr_codes WHERE status = 'used'");
    const [[{ total: unusedQrCodes }]] = await db.query("SELECT COUNT(*) AS total FROM qr_codes WHERE status = 'unused'");

    // 3.6. Critical Alerts Count (Active alerts in alerts table)
    const [[{ total: activeAlertsCount }]] = await db.query("SELECT COUNT(*) AS total FROM alerts WHERE alert_status = 'active'");

    // 4. Warehouse Utilization Percentage (Sum of Quantity / Sum of Max Capacity across all racks)
    const [[{ total_qty, total_cap }]] = await db.query(
      'SELECT SUM(quantity) AS total_qty, SUM(max_capacity) AS total_cap FROM racks'
    );
    const utilization = total_cap > 0 ? parseFloat(((total_qty / total_cap) * 100).toFixed(2)) : 0.00;

    // 5. Critical Stock Count (Active slots where quantity <= threshold_limit)
    const [[{ total: criticalCount }]] = await db.query(
      'SELECT COUNT(*) AS total FROM racks WHERE quantity > 0 AND quantity <= threshold_limit'
    );

    // 6. Low Stock Count (Active slots where quantity > threshold_limit and quantity <= threshold_limit * 1.2)
    const [[{ total: lowStockCount }]] = await db.query(
      'SELECT COUNT(*) AS total FROM racks WHERE quantity > threshold_limit AND quantity <= threshold_limit * 1.2'
    );

    // 7. Today's Inward Transactions Count
    const [[{ total: todayInward }]] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM transactions 
       WHERE transaction_type = 'inward' AND DATE(created_at) = CURDATE()`
    );

    // 8. Today's Outward Transactions Count
    const [[{ total: todayOutward }]] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM transactions 
       WHERE transaction_type = 'outward' AND DATE(created_at) = CURDATE()`
    );

    // 8.5. System Health Score Calculation
    let systemHealthScore = 100;
    try {
      const [racksData] = await db.query(`
        SELECT 
          r.rack_code, 
          r.quantity, 
          r.max_capacity, 
          COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage
        FROM racks r
        LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
      `);

      const [lowStockCounts] = await db.query(`
        SELECT q.rack_code, COUNT(*) AS count
        FROM qr_codes q
        JOIN materials m ON q.barcode_id = m.barcode
        WHERE q.status = 'used' AND m.quantity <= m.threshold_limit
        GROUP BY q.rack_code
      `);

      const lowStockMap = {};
      lowStockCounts.forEach(row => {
        lowStockMap[row.rack_code] = parseInt(row.count, 10);
      });

      let totalHealth = 0;
      racksData.forEach(rack => {
        const qty = parseFloat(rack.quantity) || 0;
        const maxCap = parseFloat(rack.max_capacity) || 100;
        const occupancy = rack.occupancy_percentage !== null ? parseFloat(rack.occupancy_percentage) : (maxCap > 0 ? (qty / maxCap) * 100 : 0);
        const lowCount = lowStockMap[rack.rack_code] || 0;

        let health = 100;
        if (occupancy > 100) {
          health -= Math.min(100, Math.round((occupancy - 100) * 5));
        } else if (occupancy > 80) {
          health -= Math.round((occupancy - 80) * 1.5);
        }

        health -= lowCount * 15;

        totalHealth += Math.max(0, Math.min(100, health));
      });

      systemHealthScore = racksData.length > 0 ? Math.round(totalHealth / racksData.length) : 100;
    } catch (err) {
      console.error('Error calculating systemHealthScore:', err.message);
    }

    // 8.6. AI Risk Score Calculation
    let aiRiskScore = 15;
    try {
      const [matsData] = await db.query('SELECT quantity, threshold_limit FROM materials');
      let totalRisk = 0;
      matsData.forEach(m => {
        const qty = parseFloat(m.quantity) || 0;
        const threshold = parseFloat(m.threshold_limit) || 0;
        let stockRatio = threshold > 0 ? (qty / threshold) : 1.5;
        let baseScore = 0;
        if (qty === 0) {
          baseScore = 60;
        } else if (stockRatio <= 0.5) {
          baseScore = 50;
        } else if (stockRatio <= 1.0) {
          baseScore = 40;
        } else if (stockRatio <= 1.3) {
          baseScore = 20;
        }
        let risk = Math.min(100, baseScore + 10 + (stockRatio <= 0.5 ? 25 : stockRatio <= 1.0 ? 15 : 0));
        if (qty === 0 && risk < 90) risk = 90;
        else if (qty < threshold && risk < 50) risk = 50;
        totalRisk += risk;
      });
      aiRiskScore = matsData.length > 0 ? Math.round(totalRisk / matsData.length) : 15;
    } catch (err) {
      console.error('Error calculating aiRiskScore:', err.message);
    }

    // Legacy support variables
    const [[{ total: totalMaterials }]] = await db.query('SELECT COUNT(*) AS total FROM materials');
    const [[{ total: criticalMaterials }]] = await db.query('SELECT COUNT(*) AS total FROM materials WHERE quantity <= threshold_limit');
    const [[{ total_inventory }]] = await db.query('SELECT COALESCE(SUM(quantity), 0.00) AS total_inventory FROM materials');

    const payload = {
      totalRacks: totalRacks || 0,
      occupiedRacks: occupiedRacks || 0,
      emptyRacks: emptyRacks || 0,
      utilizationPercentage: utilization || 0,
      criticalCount: criticalCount || 0,
      lowStockCount: lowStockCount || 0,
      todayInward: todayInward || 0,
      todayOutward: todayOutward || 0,
      totalMaterials: totalMaterials || 0,
      totalInventory: parseFloat(total_inventory) || 0,
      totalQrCodes: totalQrCodes || 0,
      usedQrCodes: usedQrCodes || 0,
      unusedQrCodes: unusedQrCodes || 0,
      criticalAlertsCount: activeAlertsCount || 0,
      systemHealthScore,
      aiRiskScore
    };

    res.status(200).json({
      status: 'success',
      ...payload,
      data: {
        ...payload,
        total_racks: totalRacks || 0,
        occupied_racks: occupiedRacks || 0,
        empty_racks: emptyRacks || 0,
        warehouse_utilization: utilization || 0,
        today_inward: todayInward || 0,
        today_outward: todayOutward || 0,
        total_materials: totalMaterials || 0,
        total_inventory: parseFloat(total_inventory) || 0,
        critical_materials: criticalMaterials || 0,
        total_qr_codes: totalQrCodes || 0,
        used_qr_codes: usedQrCodes || 0,
        unused_qr_codes: unusedQrCodes || 0,
        critical_alerts_count: activeAlertsCount || 0,
        systemHealthScore,
        aiRiskScore
      }
    });
  } catch (error) {
    next(error);
  }
};
