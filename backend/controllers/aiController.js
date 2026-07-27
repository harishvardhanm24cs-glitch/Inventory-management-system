import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import warehouseIntelligenceEngine from '../services/warehouseIntelligenceEngine.js';

/**
 * aiController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller layer exposing the AI Warehouse Intelligence Engine endpoints.
 * All core intelligence calculations are computed live via warehouseIntelligenceEngine.js.
 */

/**
 * Predict when materials will reach threshold levels based on historical outward transactions.
 * GET /api/ai/predictions
 */
export const getAiPredictions = async (req, res, next) => {
  try {
    const predictions = await warehouseIntelligenceEngine.generatePredictions();
    res.status(200).json({
      status: 'success',
      data: predictions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reorder recommendations for replenishment based on safety limit deficits.
 * GET /api/ai/reorder-recommendations
 */
export const getReorderRecommendations = async (req, res, next) => {
  try {
    const predictions = await warehouseIntelligenceEngine.generatePredictions();
    const recommendations = predictions.filter(
      p => p.current_stock <= p.threshold_limit || p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL'
    );

    res.status(200).json({
      status: 'success',
      results: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get prioritization risk calculations (0-100 score) for critical inventory monitoring.
 * GET /api/ai/risk-analysis
 */
export const getRiskAnalysis = async (req, res, next) => {
  try {
    const predictions = await warehouseIntelligenceEngine.generatePredictions();
    const riskAnalysis = predictions.map(p => ({
      material_name: p.material_name,
      risk_score: p.risk_score,
      risk_level: p.risk_level,
      recommendation: p.recommendation,
      details: `Stock: ${p.current_stock} KG / Threshold: ${p.threshold_limit} KG. Daily usage: ${p.avg_daily_usage} KG/day. Est. depletion in ${p.days_remaining !== null ? `${p.days_remaining} days` : 'N/A'}`
    }));

    res.status(200).json({
      status: 'success',
      results: riskAnalysis.length,
      data: riskAnalysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze warehouse metrics (occupancy, stock, alerts, movement history) to generate actionable AI recommendations.
 * GET /api/ai/recommendations
 */
export const getAiRecommendations = async (req, res, next) => {
  try {
    const recommendations = await warehouseIntelligenceEngine.generateRecommendations();

    let userName = 'System';
    if (req.user && req.user.id) {
      const [users] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0) userName = users[0].name;
    }

    await logAudit({
      action_type: 'AI Recommendation Generated',
      user_name: userName,
      action_details: `Generated ${recommendations.length} AI-based warehouse recommendations`
    });

    res.status(200).json({
      status: 'success',
      results: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate suggestions for warehouse slot load balancing and accessibility optimization.
 * GET /api/ai/rack-optimization
 */
export const getRackOptimizations = async (req, res, next) => {
  try {
    const optimizations = await warehouseIntelligenceEngine.generateRackOptimizations();
    res.status(200).json({
      status: 'success',
      results: optimizations.length,
      data: optimizations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Prioritize inventory alerts and calculate material risk scores.
 * GET /api/ai/alert-prioritization
 */
export const getAiAlertPrioritization = async (req, res, next) => {
  try {
    const predictions = await warehouseIntelligenceEngine.generatePredictions();
    res.status(200).json({
      status: 'success',
      results: predictions.length,
      data: predictions
    });
  } catch (error) {
    next(error);
  }
};

import lowStockIntelligence from '../services/lowStockIntelligence.js';
import consumptionIntelligence from '../services/consumptionIntelligence.js';
import deadStockIntelligence from '../services/deadStockIntelligence.js';
import rackOptimizationIntelligence from '../services/rackOptimizationIntelligence.js';
import smartAlertIntelligence from '../services/smartAlertIntelligence.js';
import warehouseHealthScoreIntelligence from '../services/warehouseHealthScoreIntelligence.js';

/**
 * Module 2 – Low Stock Intelligence endpoint
 * GET /api/ai/low-stock-intelligence
 */
export const getLowStockIntelligence = async (req, res, next) => {
  try {
    const analysis = await lowStockIntelligence.analyzeAll();
    res.status(200).json({
      status: 'success',
      results: analysis.length,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Module 4 – Consumption Intelligence endpoint
 * GET /api/ai/consumption-intelligence
 */
export const getConsumptionIntelligence = async (req, res, next) => {
  try {
    const report = await consumptionIntelligence.analyzeAll();
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Module 5 – Dead Stock Intelligence endpoint
 * GET /api/ai/dead-stock-intelligence
 */
export const getDeadStockIntelligence = async (req, res, next) => {
  try {
    const activeMaxDays = req.query.active_max_days ? parseInt(req.query.active_max_days) : undefined;
    const idleMaxDays = req.query.idle_max_days ? parseInt(req.query.idle_max_days) : undefined;

    const report = await deadStockIntelligence.analyzeAll({ activeMaxDays, idleMaxDays });
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Module 6 – Rack Optimization Intelligence endpoint
 * GET /api/ai/rack-optimization-intelligence
 */
export const getRackOptimizationIntelligence = async (req, res, next) => {
  try {
    const report = await rackOptimizationIntelligence.analyzeAll();
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Module 7 – AI Smart Alert System endpoint
 * GET /api/ai/smart-alerts
 */
export const getSmartAlerts = async (req, res, next) => {
  try {
    const report = await smartAlertIntelligence.generateSmartAlerts();
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Module 10 – Warehouse Health Score endpoint
 * GET /api/ai/warehouse-health-score
 */
export const getWarehouseHealthScore = async (req, res, next) => {
  try {
    const report = await warehouseHealthScoreIntelligence.calculateHealthScore();
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};
