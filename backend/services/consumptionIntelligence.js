import db from '../config/db.js';

/**
 * consumptionIntelligence.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 4 – Consumption Intelligence Engine
 *
 * Calculates material consumption metrics across daily, weekly, and monthly
 * time horizons using existing database tables (materials, transactions, material_usage_history).
 */

class ConsumptionIntelligenceEngine {
  async analyzeAll() {
    const [materials] = await db.query('SELECT id, barcode, material_name, quantity, unit FROM materials ORDER BY material_name ASC');

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
    const recent7dTxMap = {};
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    (outwardTransactions || []).forEach((tx) => {
      const mid = tx.material_id;
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push(tx);

      const txDate = new Date(tx.created_at);
      if (txDate >= sevenDaysAgo) {
        if (!recent7dTxMap[mid]) recent7dTxMap[mid] = [];
        recent7dTxMap[mid].push(tx);
      }
    });

    if (!materials || materials.length === 0) {
      return {
        materials: [],
        most_consumed: [],
        least_consumed: [],
        summary: {
          total_warehouse_daily_consumption: 0,
          total_warehouse_weekly_consumption: 0,
          total_warehouse_monthly_consumption: 0,
          increasing_count: 0,
          stable_count: 0,
          decreasing_count: 0,
        }
      };
    }

    let increasingCount = 0;
    let stableCount = 0;
    let decreasingCount = 0;

    let totalDailyWarehouse = 0;

    const processedMaterials = materials.map((mat) => {
      const current_quantity = parseFloat(mat.quantity) || 0.00;
      const unitStr = mat.unit || 'KG';
      const allTxs = txMap[mat.id] || [];
      const recent7dTxs = recent7dTxMap[mat.id] || [];

      // Total consumed across all recorded time
      const total_consumed = parseFloat(
        allTxs.reduce((sum, tx) => sum + parseFloat(tx.quantity || 0), 0).toFixed(2)
      );

      // Average daily consumption calculation
      let avg_daily_consumption = 0.00;
      if (allTxs.length > 0) {
        const oldestDate = new Date(allTxs[0].created_at);
        const diffMs = now.getTime() - oldestDate.getTime();
        const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        avg_daily_consumption = parseFloat((total_consumed / diffDays).toFixed(2));
      }

      // 7-day recent consumption velocity
      const recent_7d_consumed = parseFloat(
        recent7dTxs.reduce((sum, tx) => sum + parseFloat(tx.quantity || 0), 0).toFixed(2)
      );
      const recentDailyRate = parseFloat((recent_7d_consumed / 7).toFixed(2));

      // Trend Evaluation Vector
      let trend = 'Stable';
      let trend_percentage_change = 0;

      if (avg_daily_consumption > 0) {
        trend_percentage_change = parseFloat(
          (((recentDailyRate - avg_daily_consumption) / avg_daily_consumption) * 100).toFixed(1)
        );
        if (recentDailyRate > avg_daily_consumption * 1.15) {
          trend = 'Increasing';
          increasingCount++;
        } else if (recentDailyRate < avg_daily_consumption * 0.85) {
          trend = 'Decreasing';
          decreasingCount++;
        } else {
          trend = 'Stable';
          stableCount++;
        }
      } else {
        stableCount++;
      }

      const avg_weekly_consumption = parseFloat((avg_daily_consumption * 7).toFixed(2));
      const avg_monthly_consumption = parseFloat((avg_daily_consumption * 30).toFixed(2));

      totalDailyWarehouse += avg_daily_consumption;

      return {
        material_id: mat.id,
        material_name: mat.material_name,
        barcode: mat.barcode,
        unit: unitStr,
        current_quantity,
        total_consumed,
        avg_daily_consumption,
        avg_weekly_consumption,
        avg_monthly_consumption,
        recent_7d_consumed,
        trend,
        trend_percentage_change
      };
    });

    // ── Rankings ──
    const most_consumed = [...processedMaterials]
      .sort((a, b) => b.total_consumed - a.total_consumed)
      .slice(0, 5);

    const least_consumed = [...processedMaterials]
      .sort((a, b) => a.total_consumed - b.total_consumed)
      .slice(0, 5);

    return {
      materials: processedMaterials,
      most_consumed,
      least_consumed,
      summary: {
        total_warehouse_daily_consumption: parseFloat(totalDailyWarehouse.toFixed(2)),
        total_warehouse_weekly_consumption: parseFloat((totalDailyWarehouse * 7).toFixed(2)),
        total_warehouse_monthly_consumption: parseFloat((totalDailyWarehouse * 30).toFixed(2)),
        increasing_count: increasingCount,
        stable_count: stableCount,
        decreasing_count: decreasingCount,
      }
    };
  }
}

export const consumptionIntelligence = new ConsumptionIntelligenceEngine();
export default consumptionIntelligence;
