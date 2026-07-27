import express from 'express';
import {
  getPredictionsApi,
  getRecommendationsApi,
  getWarehouseHealthApi,
  getForecastsApi,
  getModelStatusApi,
  getAiInsightsApi,
} from '../controllers/aiApiController.js';

const router = express.Router();

// CORS / Cloud Header Middleware for standalone API consumption
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('X-Service-Layer', 'AI-API-Layer-v1');
  res.header('X-Cloud-Deployment-Ready', 'true');
  next();
});

/**
 * @route GET /api/v1/ai/predictions
 * @desc Get stock depletion timelines and demand velocity predictions
 */
router.get('/predictions', getPredictionsApi);

/**
 * @route GET /api/v1/ai/recommendations
 * @desc Get intelligent procurement & rack layout reallocations
 */
router.get('/recommendations', getRecommendationsApi);

/**
 * @route GET /api/v1/ai/warehouse-health
 * @desc Get composite 0-100 warehouse health index & risk factors
 */
router.get('/warehouse-health', getWarehouseHealthApi);

/**
 * @route GET /api/v1/ai/forecasts
 * @desc Get 7d, 14d, 30d material consumption & capacity forecast projections
 */
router.get('/forecasts', getForecastsApi);

/**
 * @route GET /api/v1/ai/models/status
 * @desc Get active ML model, pipeline status, latency & accuracy metrics
 */
router.get('/models/status', getModelStatusApi);

/**
 * @route GET /api/v1/ai/insights
 * @desc Get executive AI summary insights and explainable XAI payload
 */
router.get('/insights', getAiInsightsApi);

export default router;
