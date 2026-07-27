import db from '../config/db.js';
import warehouseHealthScoreIntelligence from './warehouseHealthScoreIntelligence.js';

/**
 * featureExtractor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Feature Extraction Layer for AI Prediction Engine.
 * Consumes raw data across existing database tables and existing intelligence services:
 * • Materials (Inventory)
 * • Transactions & Usage History
 * • Racks & Occupancy (Rack View)
 * • Movement History (qr_history)
 * • Alerts & Health Scores
 *
 * Transforms raw datasets into normalized feature matrices consumable by prediction models.
 */

export const featureExtractor = {
  /**
   * Extract features for inventory materials & demand analysis
   */
  async extractMaterialFeatures() {
    const [materials] = await db.query(
      'SELECT id, barcode, material_name, quantity, threshold_limit, unit FROM materials ORDER BY id ASC'
    );

    let outwardTransactions = [];
    try {
      const [rows] = await db.query(
        'SELECT material_id, quantity, created_at FROM material_usage_history ORDER BY created_at ASC'
      );
      outwardTransactions = rows;
    } catch {
      const [rows] = await db.query(
        "SELECT material_id, quantity, created_at FROM transactions WHERE transaction_type = 'outward' ORDER BY created_at ASC"
      );
      outwardTransactions = rows;
    }

    const txMap = {};
    (outwardTransactions || []).forEach(tx => {
      const mid = tx.material_id;
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push(tx);
    });

    const now = new Date();

    return (materials || []).map(mat => {
      const current_stock = parseFloat(mat.quantity) || 0.0;
      const threshold_limit = parseFloat(mat.threshold_limit) || 0.0;
      const txs = txMap[mat.id] || [];

      let total_outward_qty = 0;
      let avg_daily_usage = 0.0;
      let usage_variance = 0.0;
      let days_active = 1;
      let days_since_last_movement = 999;

      if (txs.length > 0) {
        const oldestTxDate = new Date(txs[0].created_at);
        const newestTxDate = new Date(txs[txs.length - 1].created_at);
        const diffMs = now.getTime() - oldestTxDate.getTime();
        days_active = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        total_outward_qty = txs.reduce((acc, tx) => acc + (parseFloat(tx.quantity) || 0), 0);
        avg_daily_usage = parseFloat((total_outward_qty / days_active).toFixed(2));

        const lastTxMs = now.getTime() - newestTxDate.getTime();
        days_since_last_movement = Math.max(0, Math.floor(lastTxMs / (1000 * 60 * 60 * 24)));

        // Calculate usage variance across transactions
        const quantities = txs.map(t => parseFloat(t.quantity) || 0);
        const meanQty = total_outward_qty / txs.length;
        const varianceSum = quantities.reduce((acc, q) => acc + Math.pow(q - meanQty, 2), 0);
        usage_variance = parseFloat((varianceSum / txs.length).toFixed(2));
      }

      const stock_deficit_ratio = threshold_limit > 0 ? parseFloat((current_stock / threshold_limit).toFixed(2)) : 1.5;
      const is_depleted = current_stock === 0;
      const is_below_threshold = current_stock <= threshold_limit;

      return {
        material_id: mat.id,
        barcode: mat.barcode,
        material_name: mat.material_name,
        unit: mat.unit || 'KG',
        current_stock,
        threshold_limit,
        total_outward_qty,
        tx_count: txs.length,
        avg_daily_usage,
        usage_variance,
        days_active,
        days_since_last_movement,
        stock_deficit_ratio,
        is_depleted,
        is_below_threshold
      };
    });
  },

  /**
   * Extract features for rack utilization & spatial load balancing
   */
  async extractRackFeatures() {
    const [racks] = await db.query(`
      SELECT 
        r.rack_code, 
        r.material_name, 
        r.quantity AS current_capacity, 
        COALESCE(ri.max_capacity, r.max_capacity) AS max_capacity, 
        COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage
      FROM racks r
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
      ORDER BY r.rack_code ASC
    `);

    let movementCounts = {};
    try {
      const [history] = await db.query(`
        SELECT rack_code, COUNT(*) AS count
        FROM qr_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND rack_code IS NOT NULL AND rack_code != ''
        GROUP BY rack_code
      `);
      (history || []).forEach(h => {
        movementCounts[h.rack_code] = parseInt(h.count) || 0;
      });
    } catch {
      // Graceful fallback if table is empty or inaccessible
      movementCounts = {};
    }

    return (racks || []).map(r => {
      const current_capacity = parseFloat(r.current_capacity) || 0.0;
      const max_capacity = parseFloat(r.max_capacity) || 1.0;
      const occupancy_percentage = parseFloat(r.occupancy_percentage) || (max_capacity > 0 ? (current_capacity / max_capacity) * 100 : 0);
      const activity_count_30d = movementCounts[r.rack_code] || 0;

      return {
        rack_code: r.rack_code,
        material_name: r.material_name || 'Unassigned',
        current_capacity,
        max_capacity,
        occupancy_percentage: parseFloat(occupancy_percentage.toFixed(2)),
        activity_count_30d,
        is_overloaded: occupancy_percentage >= 85,
        is_underutilized: occupancy_percentage <= 15
      };
    });
  },

  /**
   * Extract overall warehouse system health, risk, and alert metrics
   */
  async extractWarehouseFeatures() {
    const materialFeatures = await this.extractMaterialFeatures();
    const rackFeatures = await this.extractRackFeatures();

    let alertsCount = 0;
    let criticalAlertsCount = 0;
    try {
      const [alerts] = await db.query("SELECT severity FROM alerts WHERE status = 'active' OR status = 'ACTIVE' OR status IS NULL");
      alertsCount = alerts.length;
      criticalAlertsCount = alerts.filter(a => String(a.severity).toUpperCase() === 'CRITICAL' || String(a.severity).toUpperCase() === 'HIGH').length;
    } catch {
      alertsCount = 0;
      criticalAlertsCount = 0;
    }

    let healthScore = 85;
    try {
      const healthReport = await warehouseHealthScoreIntelligence.calculateHealthScore();
      if (healthReport && healthReport.overall_score !== undefined) {
        healthScore = healthReport.overall_score;
      }
    } catch {
      healthScore = 85;
    }

    const totalMaterials = materialFeatures.length;
    const depletedMaterials = materialFeatures.filter(m => m.is_depleted).length;
    const belowThresholdMaterials = materialFeatures.filter(m => m.is_below_threshold).length;

    const totalRacks = rackFeatures.length;
    const overloadedRacks = rackFeatures.filter(r => r.is_overloaded).length;
    const avgRackOccupancy = totalRacks > 0
      ? parseFloat((rackFeatures.reduce((acc, r) => acc + r.occupancy_percentage, 0) / totalRacks).toFixed(2))
      : 0;

    return {
      totalMaterials,
      depletedMaterials,
      belowThresholdMaterials,
      totalRacks,
      overloadedRacks,
      avgRackOccupancy,
      alertsCount,
      criticalAlertsCount,
      healthScore
    };
  }
};

export default featureExtractor;
