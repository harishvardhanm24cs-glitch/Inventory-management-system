import aiPredictionEngine from '../services/aiPredictionEngine.js';
import recommendationEngine from '../services/recommendationEngine.js';

/**
 * predictionEngineController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HTTP Controller exposing AI Prediction Engine endpoints.
 */

export const getPredictionEngineOverview = async (req, res, next) => {
  try {
    const data = await aiPredictionEngine.getOverviewPredictions();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getDemandPredictions = async (req, res, next) => {
  try {
    const data = await aiPredictionEngine.predictDemand();
    res.status(200).json({
      status: 'success',
      results: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getDepletionPredictions = async (req, res, next) => {
  try {
    const data = await aiPredictionEngine.predictDepletion();
    res.status(200).json({
      status: 'success',
      results: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getRackUtilizationPredictions = async (req, res, next) => {
  try {
    const data = await aiPredictionEngine.predictRackUtilization();
    res.status(200).json({
      status: 'success',
      results: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseRiskPredictions = async (req, res, next) => {
  try {
    const data = await aiPredictionEngine.predictWarehouseRisk();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getConsumptionTrendPredictions = async (req, res, next) => {
  try {
    const data = await aiPredictionEngine.predictConsumptionTrend();
    res.status(200).json({
      status: 'success',
      results: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getPredictiveRecommendations = async (req, res, next) => {
  try {
    const data = await recommendationEngine.generatePredictiveRecommendations();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};
