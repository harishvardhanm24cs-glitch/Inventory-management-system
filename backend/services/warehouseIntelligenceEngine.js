import db from '../config/db.js';

/**
 * warehouseIntelligenceEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Warehouse Intelligence Engine Service (Module 1 - System Brain)
 *
 * Consumes real database data across:
 * • Inventory (materials table)
 * • Transactions (transactions & material_usage_history)
 * • Racks & Occupancy (racks & rack_inventory)
 * • Thresholds (threshold_limit)
 * • Alerts (alerts table)
 * • Movement History (qr_history)
 *
 * Generates structured intelligence objects consumed by:
 * • Dashboard
 * • Digital Twin
 * • Notifications / Alerts Engine
 * • Reports & Schedulers
 *
 * No mock data. No UI dependencies. No duplicate inventory data.
 */

export const warehouseIntelligenceEngine = {
  /**
   * 1. Calculate Predictive Inventory Depletion & Risk Rankings
   */
  async generatePredictions() {
    const [materials] = await db.query('SELECT id, barcode, material_name, quantity, threshold_limit, unit FROM materials');

    let outwardTransactions = [];
    try {
      const [rows] = await db.query('SELECT material_id, quantity, created_at FROM material_usage_history ORDER BY created_at ASC');
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

    if (!materials || materials.length === 0) {
      return [];
    }

    return materials.map(mat => {
      const current_stock = parseFloat(mat.quantity) || 0.00;
      const threshold_limit = parseFloat(mat.threshold_limit) || 0.00;
      const txs = txMap[mat.id] || [];

      // Calculate average daily consumption velocity
      let avg_daily_usage = 0.00;
      if (txs.length > 0) {
        const oldestTxDate = new Date(txs[0].created_at);
        const newestTxDate = new Date();
        const diffMs = newestTxDate.getTime() - oldestTxDate.getTime();
        const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const totalOutward = txs.reduce((acc, tx) => acc + parseFloat(tx.quantity), 0);
        avg_daily_usage = parseFloat((totalOutward / diffDays).toFixed(2));
      }

      // Days Remaining until depletion
      let days_remaining = null;
      if (avg_daily_usage > 0) {
        days_remaining = parseFloat((current_stock / avg_daily_usage).toFixed(1));
      }

      // Days until threshold
      let days_until_threshold = null;
      if (current_stock <= threshold_limit) {
        days_until_threshold = 0;
      } else if (avg_daily_usage > 0) {
        days_until_threshold = Math.ceil((current_stock - threshold_limit) / avg_daily_usage);
      }

      // Calculate Recommended Reorder Qty & Action
      let recommended_reorder_qty = 0;
      let recommendation = 'Stock level stable. Normal monitoring.';

      if (avg_daily_usage > 0) {
        recommended_reorder_qty = Math.max(100, Math.round(avg_daily_usage * 20));
        if (current_stock <= threshold_limit || (days_remaining !== null && days_remaining <= 14)) {
          const timeframe = days_remaining !== null ? Math.max(1, Math.round(days_remaining / 2)) : 5;
          recommendation = `Reorder ${recommended_reorder_qty} ${mat.unit || 'KG'} within ${timeframe} days.`;
        }
      } else {
        recommended_reorder_qty = Math.max(100, Math.round(threshold_limit * 2));
        if (current_stock <= threshold_limit) {
          recommendation = `Reorder ${recommended_reorder_qty} ${mat.unit || 'KG'} immediately. Deficit detected.`;
        }
      }

      // Calculate Risk Score (0-100)
      const stockRatio = threshold_limit > 0 ? (current_stock / threshold_limit) : 1.5;
      let baseScore = 0;
      if (current_stock === 0) baseScore = 60;
      else if (stockRatio <= 0.5) baseScore = 50;
      else if (stockRatio <= 1.0) baseScore = 40;
      else if (stockRatio <= 1.3) baseScore = 20;

      const usageScore = Math.min(25, Math.round(avg_daily_usage * 1.5));
      let daysRemainingScore = 0;
      if (days_remaining !== null) {
        if (days_remaining < 3) daysRemainingScore = 25;
        else if (days_remaining < 7) daysRemainingScore = 18;
        else if (days_remaining < 14) daysRemainingScore = 10;
      } else if (current_stock < threshold_limit) {
        daysRemainingScore = 15;
      }

      let risk_score = Math.min(100, baseScore + usageScore + daysRemainingScore);
      if (current_stock === 0 && risk_score < 90) risk_score = 90;
      else if (current_stock < threshold_limit && risk_score < 50) risk_score = 50;

      let risk_level = 'LOW';
      if (risk_score >= 90) risk_level = 'CRITICAL';
      else if (risk_score >= 65) risk_level = 'HIGH';
      else if (risk_score >= 40) risk_level = 'MEDIUM';

      return {
        material_id: mat.id,
        material_name: mat.material_name,
        barcode: mat.barcode,
        unit: mat.unit || 'KG',
        current_stock,
        threshold_limit,
        avg_daily_usage,
        days_remaining,
        days_until_threshold,
        risk_score,
        risk_level,
        recommended_reorder_qty,
        recommendation
      };
    });
  },

  /**
   * 2. Generate Actionable AI Warehouse Recommendations
   */
  async generateRecommendations() {
    const recommendations = [];
    const nowISO = new Date().toISOString();

    // Fetch Rack state
    const [racks] = await db.query(`
      SELECT 
        r.rack_code, 
        r.material_name, 
        r.quantity AS current_capacity, 
        COALESCE(ri.max_capacity, r.max_capacity) AS max_capacity, 
        COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage
      FROM racks r
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
    `);

    // Fetch Material state
    const [materials] = await db.query(`
      SELECT id, material_name, barcode, quantity, threshold_limit 
      FROM materials
    `);

    // Fetch Movement History (last 30 days)
    const [history] = await db.query(`
      SELECT rack_code, material_name, action, created_at 
      FROM qr_history
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // --- 1. RACK CAPACITIES & BALANCING ---
    (racks || []).forEach((rack) => {
      const occ = parseFloat(rack.occupancy_percentage) || 0;
      if (occ > 85) {
        recommendations.push({
          id: `rec-rack-cap-${rack.rack_code}-${Date.now()}`,
          recommendation_type: 'RACK_CAPACITY',
          priority: occ > 95 ? 'CRITICAL' : 'HIGH',
          title: `Rack ${rack.rack_code} Near Capacity`,
          message: `Rack ${rack.rack_code} is at ${occ}% capacity (${rack.current_capacity} KG / ${rack.max_capacity} KG MAX).`,
          impact: 'Prevents rack overflow and physical bottleneck during ingress scans.',
          suggestedAction: `Transfer surplus inventory from ${rack.rack_code} to an underutilized storage rack.`,
          targetEntity: { type: 'rack', codeOrId: rack.rack_code },
          metrics: { occupancyPct: occ },
          createdAt: nowISO,
        });
      }
    });

    const highOccRacks = (racks || []).filter((r) => (parseFloat(r.occupancy_percentage) || 0) > 80);
    const lowOccRacks = (racks || []).filter((r) => (parseFloat(r.occupancy_percentage) || 0) < 20);

    if (highOccRacks.length > 0 && lowOccRacks.length > 0) {
      highOccRacks.forEach((hr, idx) => {
        const lr = lowOccRacks[idx % lowOccRacks.length];
        const matName = hr.material_name || 'Material';
        recommendations.push({
          id: `rec-balance-${hr.rack_code}-${lr.rack_code}-${Date.now()}`,
          recommendation_type: 'OCCUPANCY_BALANCE',
          priority: 'MEDIUM',
          title: `Rebalance Load: ${hr.rack_code} ➔ ${lr.rack_code}`,
          message: `Move ${matName} from ${hr.rack_code} (${Math.round(hr.occupancy_percentage)}%) to ${lr.rack_code} (${Math.round(lr.occupancy_percentage)}%).`,
          impact: 'Balances slot load distribution across warehouse rows.',
          suggestedAction: `Execute internal stock movement from ${hr.rack_code} to ${lr.rack_code}.`,
          targetEntity: { type: 'rack', codeOrId: hr.rack_code },
          metrics: { occupancyPct: parseFloat(hr.occupancy_percentage) },
          createdAt: nowISO,
        });
      });
    }

    // --- 2. MATERIAL DEFICITS & THRESHOLDS ---
    (materials || []).forEach((mat) => {
      const qty = parseFloat(mat.quantity) || 0;
      const threshold = parseFloat(mat.threshold_limit) || 0;

      if (qty === 0) {
        recommendations.push({
          id: `rec-stock-depleted-${mat.id}-${Date.now()}`,
          recommendation_type: 'STOCK_REORDER',
          priority: 'CRITICAL',
          title: `${mat.material_name} Stock Depleted`,
          message: `${mat.material_name} is completely out of stock (0 KG). Reorder immediately to avoid production halt.`,
          impact: 'Eliminates material shortage downtime in production pipeline.',
          suggestedAction: `Initiate emergency purchase order for ${mat.material_name}.`,
          targetEntity: { type: 'material', codeOrId: String(mat.id) },
          metrics: { currentStock: 0, threshold },
          createdAt: nowISO,
        });
      } else if (qty <= threshold) {
        recommendations.push({
          id: `rec-stock-critical-${mat.id}-${Date.now()}`,
          recommendation_type: 'STOCK_REORDER',
          priority: 'CRITICAL',
          title: `${mat.material_name} Below Safety Limit`,
          message: `${mat.material_name} current stock (${qty} KG) is below minimum safety limit (${threshold} KG).`,
          impact: 'Restores inventory safety buffer.',
          suggestedAction: `Issue purchase order to replenish ${mat.material_name}.`,
          targetEntity: { type: 'material', codeOrId: String(mat.id) },
          metrics: { currentStock: qty, threshold },
          createdAt: nowISO,
        });
      } else if (qty <= threshold * 1.25) {
        recommendations.push({
          id: `rec-stock-warning-${mat.id}-${Date.now()}`,
          recommendation_type: 'STOCK_WARNING',
          priority: 'HIGH',
          title: `${mat.material_name} Approaching Safety Limit`,
          message: `${mat.material_name} stock (${qty} KG) is approaching safety limit (${threshold} KG).`,
          impact: 'Prevents stockout via proactive reordering.',
          suggestedAction: `Schedule replenishment order for ${mat.material_name}.`,
          targetEntity: { type: 'material', codeOrId: String(mat.id) },
          metrics: { currentStock: qty, threshold },
          createdAt: nowISO,
        });
      }
    });

    // --- 3. MOVEMENT VELOCITY & INACTIVE STOCK ---
    (materials || []).forEach((mat) => {
      const matHistory = (history || []).filter(
        (h) => h.material_name && h.material_name.toLowerCase() === mat.material_name.toLowerCase()
      );
      if (matHistory.length === 0 && (parseFloat(mat.quantity) || 0) > 0) {
        recommendations.push({
          id: `rec-slow-moving-${mat.id}-${Date.now()}`,
          recommendation_type: 'SLOW_MOVING_STOCK',
          priority: 'LOW',
          title: `Inactive Stock: ${mat.material_name}`,
          message: `${mat.material_name} has had zero movement activity in the last 30 days.`,
          impact: 'Frees active shelf space for fast-moving inventory.',
          suggestedAction: `Consider relocating ${mat.material_name} to long-term storage zone.`,
          targetEntity: { type: 'material', codeOrId: String(mat.id) },
          metrics: { currentStock: parseFloat(mat.quantity) },
          createdAt: nowISO,
        });
      }
    });

    return recommendations;
  },

  /**
   * 3. Generate Rack Optimizations & Load Balancing Suggestions
   */
  async generateRackOptimizations() {
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

    const [history] = await db.query(`
      SELECT rack_code, COUNT(*) AS count
      FROM qr_history
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND rack_code IS NOT NULL
        AND rack_code != ''
      GROUP BY rack_code
    `);

    const movementMap = {};
    (history || []).forEach((h) => {
      movementMap[h.rack_code] = h.count;
    });

    const highOccupied = (racks || []).filter((r) => (parseFloat(r.occupancy_percentage) || 0) > 80);
    const lowOccupied = (racks || []).filter((r) => (parseFloat(r.occupancy_percentage) || 0) < 20);

    const optimizations = [];

    highOccupied.forEach((hr, idx) => {
      const occ = Math.round(parseFloat(hr.occupancy_percentage) || 0);
      const moves = movementMap[hr.rack_code] || 0;

      if (lowOccupied.length > 0) {
        const lr = lowOccupied[idx % lowOccupied.length];
        const lrOcc = Math.round(parseFloat(lr.occupancy_percentage) || 0);

        let priority_score = 'MEDIUM';
        if (occ > 95) priority_score = 'CRITICAL';
        else if (occ > 90 || moves > 20) priority_score = 'HIGH';

        optimizations.push({
          current_rack: hr.rack_code,
          suggested_rack: lr.rack_code,
          suggestion: `Move inventory from ${hr.rack_code} (${occ}%) to ${lr.rack_code} (${lrOcc}%).`,
          expected_improvement: `Reduces ${hr.rack_code} occupancy and utilizes underutilized slot capacity`,
          priority_score
        });
      }
    });

    (racks || []).forEach((rack) => {
      const occ = Math.round(parseFloat(rack.occupancy_percentage) || 0);
      if (occ > 0 && occ < 20) {
        optimizations.push({
          current_rack: rack.rack_code,
          suggested_rack: null,
          suggestion: `Rack ${rack.rack_code} is underutilized (${occ}%).`,
          expected_improvement: `Frees up underutilized shelf space in ${rack.rack_code}`,
          priority_score: 'LOW'
        });
      }
    });

    return optimizations;
  }
};

export default warehouseIntelligenceEngine;
