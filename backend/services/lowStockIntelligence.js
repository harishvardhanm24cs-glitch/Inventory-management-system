import db from '../config/db.js';

/**
 * lowStockIntelligence.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 2 – Low Stock Intelligence Engine
 *
 * Dynamically analyzes:
 * • Current Quantity
 * • Threshold Limit
 * • Consumption Rate (burn rate per day)
 * • Recent Transaction velocity
 *
 * Evaluates dynamic health states:
 * • SAFE         ➔ Q > 1.3 * T and Days Remaining > 14
 * • MONITOR      ➔ 1.0 * T < Q <= 1.3 * T or Days Remaining 7–14
 * • REORDER_SOON ➔ 0.7 * T < Q <= 1.0 * T or Days Remaining 3–7
 * • CRITICAL     ➔ Q <= 0.7 * T or Days Remaining < 3 or Q === 0
 *
 * Features:
 * • Dynamic Message Generation (no hardcoded static strings)
 * • Pluggable ML Predictor Strategy (supports future ML model integration)
 */

// ── Default Rule-Based Velocity Predictor ─────────────────────────────────────
const velocityRulePredictor = (mat, txs) => {
  const current_stock = parseFloat(mat.quantity) || 0.00;
  const threshold_limit = parseFloat(mat.threshold_limit) || 0.00;
  const unitStr = mat.unit || 'KG';

  // Calculate daily burn rate velocity
  let burn_rate = 0.00;
  if (txs.length > 0) {
    const oldestTxDate = new Date(txs[0].created_at);
    const newestTxDate = new Date();
    const diffMs = newestTxDate.getTime() - oldestTxDate.getTime();
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const totalOutward = txs.reduce((acc, tx) => acc + parseFloat(tx.quantity), 0);
    burn_rate = parseFloat((totalOutward / diffDays).toFixed(2));
  }

  // Days remaining until zero stock
  let days_remaining = null;
  if (burn_rate > 0) {
    days_remaining = parseFloat((current_stock / burn_rate).toFixed(1));
  }

  // Days until safety threshold is breached
  let days_until_threshold = null;
  if (current_stock <= threshold_limit) {
    days_until_threshold = 0;
  } else if (burn_rate > 0) {
    days_until_threshold = Math.max(0, Math.ceil((current_stock - threshold_limit) / burn_rate));
  }

  // Calculate Recommended Reorder Quantity
  let recommended_reorder_qty = 0;
  if (burn_rate > 0) {
    recommended_reorder_qty = Math.max(100, Math.round(burn_rate * 21)); // 3 weeks supply
  } else {
    recommended_reorder_qty = Math.max(100, Math.round(threshold_limit * 2));
  }

  // ── Evaluate Dynamic Status State ──
  let status = 'SAFE';

  if (current_stock === 0 || current_stock <= threshold_limit * 0.7 || (days_remaining !== null && days_remaining <= 3)) {
    status = 'CRITICAL';
  } else if (current_stock <= threshold_limit || (days_remaining !== null && days_remaining <= 7)) {
    status = 'REORDER_SOON';
  } else if (current_stock <= threshold_limit * 1.3 || (days_remaining !== null && days_remaining <= 14)) {
    status = 'MONITOR';
  } else {
    status = 'SAFE';
  }

  // ── Generate Dynamic Timeframe & Recommendation Text ──
  let suggested_timeframe = 'Routine Schedule';
  let recommendation = '';

  if (status === 'CRITICAL') {
    if (current_stock === 0) {
      suggested_timeframe = 'Immediately';
      recommendation = `Reorder ${recommended_reorder_qty} ${unitStr} of ${mat.material_name} immediately. Stock is completely depleted (0 ${unitStr}).`;
    } else {
      const hoursLeft = days_remaining !== null ? Math.max(12, Math.round(days_remaining * 24)) : 24;
      suggested_timeframe = hoursLeft <= 24 ? 'within 24 hours' : `within ${Math.ceil(hoursLeft / 24)} days`;
      recommendation = `Reorder ${recommended_reorder_qty} ${unitStr} of ${mat.material_name} ${suggested_timeframe}. Stock (${current_stock} ${unitStr}) is critically low against threshold (${threshold_limit} ${unitStr}).`;
    }
  } else if (status === 'REORDER_SOON') {
    const daysLeftText = days_until_threshold !== null ? `Threshold breach in ~${days_until_threshold} day${days_until_threshold !== 1 ? 's' : ''}` : 'Nearing limit';
    suggested_timeframe = 'within 48 hours';
    recommendation = `Reorder ${recommended_reorder_qty} ${unitStr} of ${mat.material_name} within 48 hours. Burn rate is ${burn_rate} ${unitStr}/day. ${daysLeftText}.`;
  } else if (status === 'MONITOR') {
    suggested_timeframe = 'within 7 days';
    recommendation = `Monitor ${mat.material_name} stock (${current_stock} ${unitStr}). Burn rate: ${burn_rate} ${unitStr}/day. Projected threshold reach in ${days_until_threshold ?? 'N/A'} days.`;
  } else {
    suggested_timeframe = 'Normal Monitoring';
    recommendation = `Stock level safe (${current_stock} ${unitStr}). ${days_remaining !== null ? `Projected depletion in ${days_remaining} days based on ${burn_rate} ${unitStr}/day usage.` : 'Normal monitoring.'}`;
  }

  return {
    material_id: mat.id,
    material_name: mat.material_name,
    barcode: mat.barcode,
    unit: unitStr,
    current_stock,
    threshold_limit,
    burn_rate,
    days_remaining,
    days_until_threshold,
    status,
    recommended_reorder_qty,
    suggested_timeframe,
    recommendation,
    confidence_score: 95,
    predictor_type: 'RULE_VELOCITY',
  };
};

// ── Pluggable Predictor Container ─────────────────────────────────────────────
class LowStockIntelligenceEngine {
  constructor() {
    this.customPredictor = null;
  }

  /**
   * Register a custom ML predictor algorithm to override or enrich rule calculations
   */
  setCustomPredictor(predictorFn) {
    this.customPredictor = predictorFn;
  }

  /**
   * Execute low stock analysis across all materials using live DB records
   */
  async analyzeAll() {
    const [materials] = await db.query('SELECT id, barcode, material_name, quantity, threshold_limit, unit FROM materials ORDER BY material_name ASC');

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
    (outwardTransactions || []).forEach((tx) => {
      const mid = tx.material_id;
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push(tx);
    });

    if (!materials || materials.length === 0) {
      return [];
    }

    return materials.map((mat) => {
      const txs = txMap[mat.id] || [];

      // 1. Try custom ML predictor if registered
      if (this.customPredictor) {
        const mlResult = this.customPredictor(mat, txs);
        if (mlResult) return mlResult;
      }

      // 2. Default to velocity rule predictor
      return velocityRulePredictor(mat, txs);
    });
  }
}

export const lowStockIntelligence = new LowStockIntelligenceEngine();
export default lowStockIntelligence;
