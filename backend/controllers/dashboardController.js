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

    // 4. Count occupied racks (count of racks where current_capacity > 0)
    const [[{ total: occupied_racks }]] = await db.query('SELECT COUNT(*) AS total FROM rack_inventory WHERE current_capacity > 0');

    // 5. Count empty racks (count of racks where current_capacity = 0)
    const [[{ total: empty_racks }]] = await db.query('SELECT COUNT(*) AS total FROM rack_inventory WHERE current_capacity = 0');

    // 6. Count QR codes from qr_codes table
    const [[{ total: total_qr_codes }]] = await db.query('SELECT COUNT(*) AS total FROM qr_codes');

    // 7. Count used QR codes (status = 'used')
    const [[{ total: used_qr_codes }]] = await db.query("SELECT COUNT(*) AS total FROM qr_codes WHERE status = 'used'");

    // 8. Count unused QR codes (status = 'unused')
    const [[{ total: unused_qr_codes }]] = await db.query("SELECT COUNT(*) AS total FROM qr_codes WHERE status = 'unused'");

    // 9. Count active alerts from alerts table (alert_status = 'active')
    const [[{ total: active_alerts }]] = await db.query("SELECT COUNT(*) AS total FROM alerts WHERE alert_status = 'active'");

    // 10. Calculate warehouse utilization: (sum of current_capacity / sum of max_capacity) * 100
    const [[{ total_curr, total_max }]] = await db.query(
      'SELECT SUM(current_capacity) AS total_curr, SUM(max_capacity) AS total_max FROM rack_inventory'
    );
    const curr = parseFloat(total_curr) || 0.00;
    const max = parseFloat(total_max) || 0.00;
    const warehouse_utilization = max > 0 ? parseFloat(((curr / max) * 100).toFixed(2)) : 0.00;

    res.status(200).json({
      status: 'success',
      data: {
        total_materials: total_materials || 0,
        total_inventory: total_inventory || 0,
        total_racks: total_racks || 0,
        occupied_racks: occupied_racks || 0,
        empty_racks: empty_racks || 0,
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
