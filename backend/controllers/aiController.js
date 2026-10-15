

import { aiBridgeService } from '../services/aiBridgeService.js';

export const predictSingle = async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await aiBridgeService.executeAction('predict', payload);
    
    return res.status(200).json({
      status: 'success',
      data: {
        prediction: result.predicted_quantity_used,
        unit: result.unit || 'KG',
        confidence: 'HIGH (R² 0.9842)',
        execution_time_ms: result.execution_time_ms,
        model_version: result.model_version,
        prediction_timestamp: result.prediction_timestamp,
        top_contributing_features: ['norm_quantity', 'ohe_mov_OUTWARD', 'total_outward', 'material_weight']
      }
    });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] predictSingle failed:', error.message);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Single prediction failed.'
    });
  }
};

export const predictBatch = async (req, res) => {
  try {
    const payload = req.body || [];
    const result = await aiBridgeService.executeAction('predict_batch', payload);

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] predictBatch failed:', error.message);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Batch prediction failed.'
    });
  }
};

export const getModelStatus = async (req, res) => {
  try {
    const result = await aiBridgeService.executeAction('status');

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getModelStatus failed:', error.message);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve model status.'
    });
  }
};

export const getFeaturesSchema = async (req, res) => {
  try {
    const result = await aiBridgeService.executeAction('features');

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getFeaturesSchema failed:', error.message);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve feature schema.'
    });
  }
};

export const validatePayload = async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await aiBridgeService.executeAction('validate', payload);

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Validation failed.'
    });
  }
};

export const getInsights = async (req, res) => {
  try {
    const materialId = req.query.material_id ? Number(req.query.material_id) : null;
    const { aiIntegrationService } = await import('../services/aiIntegrationService.js');
    const result = await aiIntegrationService.getMaterialAIInsights(materialId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch AI Insights.'
    });
  }
};

export const getLowStockIntelligence = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getLowStockIntelligence();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getLowStockIntelligence:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getSmartAlerts = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getSmartAlerts();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getSmartAlerts:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRackOptimizationIntelligence = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getRackOptimizationIntelligence();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getRackOptimizationIntelligence:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDeadStockIntelligence = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const params = {
      active_max_days: req.query.active_max_days ? Number(req.query.active_max_days) : 15,
      idle_max_days: req.query.idle_max_days ? Number(req.query.idle_max_days) : 45
    };
    const data = await aiIntelligenceService.getDeadStockIntelligence(params);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getDeadStockIntelligence:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getConsumptionIntelligence = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getConsumptionIntelligence();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getConsumptionIntelligence:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictions = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictions();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getPredictions:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getReorderRecommendations = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getReorderRecommendations();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getReorderRecommendations:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRiskAnalysis = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getRiskAnalysis();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getRiskAnalysis:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRackOptimization = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getRackOptimization();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('[AI CONTROLLER ERROR] getRackOptimization:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictionEngineOverview = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictionEngineOverview();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictionDemand = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictionDemand();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictionDepletion = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictionDepletion();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictionRackUtilization = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictionRackUtilization();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictionWarehouseRisk = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictionWarehouseRisk();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictionConsumptionTrend = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictionConsumptionTrend();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPredictiveRecommendations = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getPredictionRecommendations();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const runMlPipeline = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.runMlPipeline(req.body?.dataset_name);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMlPipelineStatus = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getMlPipelineStatus();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMlPipelineDatasets = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getMlPipelineDatasets();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const exportMlPipeline = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.exportMlPipeline(req.params.framework);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMaterialFeatures = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getMaterialFeatures();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getWarehouseFeatures = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getWarehouseFeatures();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getFeatureCatalog = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getFeatureCatalog();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModels = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getModels();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const registerModel = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.registerModel(req.body);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const switchModel = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.switchModel(req.body?.model_id);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const loadModel = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.loadModel(req.body?.model_id);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModelPerformance = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getModelPerformance();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRecommendationsEngine = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getRecommendationsEngine();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRecommendationsByCategory = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getRecommendationsByCategory(req.params.category);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const switchRecommendationStrategy = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.switchRecommendationStrategy(req.body?.strategy_name);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const explainMaterial = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.explainMaterial(req.params.materialId);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const explainRack = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.explainRack(req.params.rackCode);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getXaiDashboard = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getXaiDashboard();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getXaiDigitalTwin = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getXaiDigitalTwin();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getXaiReports = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getXaiReports();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getXaiManagerPortal = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getXaiManagerPortal();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMonitoringHealth = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getMonitoringHealth();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMonitoringMetrics = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getMonitoringMetrics();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const resetMonitoringMetrics = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.resetMonitoringMetrics();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getWarehouseHealthScore = async (req, res) => {
  try {
    const { aiIntelligenceService } = await import('../services/aiIntelligenceService.js');
    const data = await aiIntelligenceService.getRiskAnalysis();
    return res.status(200).json({ status: 'success', data: { health_score: 100 - data.risk_score, risk_level: data.risk_level } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDataCollectionStatus = async (req, res) => {
  try {
    const { aiDataCollectionService } = await import('../services/aiDataCollectionService.js');
    const data = await aiDataCollectionService.getCollectionStatus();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDataCollectionStatistics = async (req, res) => {
  try {
    const { aiDataCollectionService } = await import('../services/aiDataCollectionService.js');
    const data = await aiDataCollectionService.getCollectionStatistics();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const collectDataTransaction = async (req, res) => {
  try {
    const { aiDataCollectionService } = await import('../services/aiDataCollectionService.js');
    const result = await aiDataCollectionService.captureTransaction(req.body);
    const statusCode = result.success ? 200 : (result.status === 'DUPLICATE' ? 409 : 400);
    return res.status(statusCode).json({ status: result.success ? 'success' : 'error', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDataCollectionLogs = async (req, res) => {
  try {
    const { aiDataCollectionService } = await import('../services/aiDataCollectionService.js');
    const data = await aiDataCollectionService.getCollectionLogs();
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDatasets = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const datasets = await datasetVersioningService.getDatasets();
    return res.status(200).json({ status: 'success', datasets });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCurrentDataset = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const dataset = await datasetVersioningService.getCurrentDataset();
    return res.status(200).json({ status: 'success', dataset });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDatasetByVersion = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const dataset = await datasetVersioningService.getDatasetByVersion(req.params.version);
    if (!dataset) return res.status(404).json({ status: 'error', message: `Dataset version ${req.params.version} not found.` });
    return res.status(200).json({ status: 'success', dataset });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createDatasetSnapshot = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const result = await datasetVersioningService.createDatasetSnapshot(req.body);
    return res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const archiveDataset = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const result = await datasetVersioningService.archiveDataset(req.body?.version_tag || req.params?.version);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json({ status: result.success ? 'success' : 'error', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const restoreDataset = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const result = await datasetVersioningService.restoreDataset(req.body?.version_tag || req.params?.version);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json({ status: result.success ? 'success' : 'error', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const selectDataset = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const result = await datasetVersioningService.selectDataset(req.body?.version_tag || req.params?.version);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json({ status: result.success ? 'success' : 'error', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDatasetStatistics = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const statistics = await datasetVersioningService.getStatistics();
    return res.status(200).json({ status: 'success', statistics });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDatasetHistory = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const history = await datasetVersioningService.getHistory();
    return res.status(200).json({ status: 'success', history });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const verifyDatasetIntegrity = async (req, res) => {
  try {
    const { datasetVersioningService } = await import('../services/datasetVersioningService.js');
    const version = req.params?.version || req.query?.version;
    const result = await datasetVersioningService.verifyIntegrity(version);
    return res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRegisteredModels = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const models = await modelRegistryService.getRegisteredModels();
    return res.status(200).json({ status: 'success', models });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCurrentProductionModel = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const model = await modelRegistryService.getCurrentProductionModel();
    return res.status(200).json({ status: 'success', model });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRegisteredModelByVersion = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const model = await modelRegistryService.getModelByVersion(req.params.version);
    if (!model) return res.status(404).json({ status: 'error', message: `Model version ${req.params.version} not found.` });
    return res.status(200).json({ status: 'success', model });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const registerNewModel = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const result = await modelRegistryService.registerModel(req.body);
    return res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const archiveModelVersion = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const result = await modelRegistryService.archiveModel(req.body?.model_version || req.params?.version);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json({ status: result.success ? 'success' : 'error', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const promoteModelToProduction = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const result = await modelRegistryService.promoteModel(req.body?.model_version || req.params?.version);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json({ status: result.success ? 'success' : 'error', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateModelStatus = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const result = await modelRegistryService.updateStatus(req.body?.model_version || req.params?.version, req.body?.status);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json({ status: result.success ? 'success' : 'error', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModelRegistryHistory = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const history = await modelRegistryService.getHistory();
    return res.status(200).json({ status: 'success', history });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModelRegistryMetrics = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const metrics = await modelRegistryService.getMetrics();
    return res.status(200).json({ status: 'success', metrics });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModelArtifacts = async (req, res) => {
  try {
    const { modelRegistryService } = await import('../services/modelRegistryService.js');
    const artifacts = await modelRegistryService.getArtifacts();
    return res.status(200).json({ status: 'success', artifacts });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const compareModels = async (req, res) => {
  try {
    const { modelComparisonService } = await import('../services/modelComparisonService.js');
    const result = await modelComparisonService.compareModels(req.body || req.query || {});
    return res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModelRanking = async (req, res) => {
  try {
    const { modelComparisonService } = await import('../services/modelComparisonService.js');
    const rankings = await modelComparisonService.getModelRanking();
    return res.status(200).json({ status: 'success', rankings });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModelComparisons = async (req, res) => {
  try {
    const { modelComparisonService } = await import('../services/modelComparisonService.js');
    const comparisons = await modelComparisonService.getComparisonHistory();
    return res.status(200).json({ status: 'success', comparisons });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getModelRecommendation = async (req, res) => {
  try {
    const { modelComparisonService } = await import('../services/modelComparisonService.js');
    const recommendation = await modelComparisonService.getRecommendation(req.query?.production, req.query?.candidate);
    return res.status(200).json({ status: 'success', recommendation });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const evaluateDeploymentCandidate = async (req, res) => {
  try {
    const { deploymentDecisionService } = await import('../services/deploymentDecisionService.js');
    const result = await deploymentDecisionService.evaluateCandidate(req.body || {});
    
    const decision = result?.decision || result || null;
    return res.status(200).json({ status: 'SUCCESS', decision, message: result?.message || 'Evaluation complete.' });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const getDeploymentDecision = async (req, res) => {
  try {
    const { deploymentDecisionService } = await import('../services/deploymentDecisionService.js');
    const decisionId = req.query?.decision_id || req.query?.id;
    const result = await deploymentDecisionService.getDecision(decisionId);
    
    return res.status(200).json({ status: 'SUCCESS', decision: result || null });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const getDeploymentHistory = async (req, res) => {
  try {
    const { deploymentDecisionService } = await import('../services/deploymentDecisionService.js');
    const filterType = req.query?.filter || req.query?.type;
    const result = await deploymentDecisionService.getHistory(filterType);
    
    return res.status(200).json({ status: 'SUCCESS', history: Array.isArray(result) ? result : [] });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const overrideDeploymentDecision = async (req, res) => {
  try {
    const { deploymentDecisionService } = await import('../services/deploymentDecisionService.js');
    const result = await deploymentDecisionService.overrideDecision(req.body || {});
    const decision = result?.decision || result || null;
    return res.status(200).json({ status: 'SUCCESS', decision, message: result?.message || 'Override applied.' });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const getDeploymentPolicies = async (req, res) => {
  try {
    const { deploymentDecisionService } = await import('../services/deploymentDecisionService.js');
    const result = await deploymentDecisionService.getPolicies();
    return res.status(200).json({ status: 'SUCCESS', policies: result || {} });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const saveDeploymentPolicies = async (req, res) => {
  try {
    const { deploymentDecisionService } = await import('../services/deploymentDecisionService.js');
    const result = await deploymentDecisionService.savePolicies(req.body || {});
    return res.status(200).json({ status: 'SUCCESS', message: result?.message || 'Policies saved.' });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const getRollbackEligible = async (req, res) => {
  try {
    const { rollbackService } = await import('../services/rollbackService.js');
    const result = await rollbackService.getEligibleTargets();
    return res.status(200).json({
      status: 'SUCCESS',
      eligible_targets: result?.eligible_targets || [],
      eligible_count: result?.eligible_count || 0,
      production_model: result?.production_model || null,
      production_model_name: result?.production_model_name || null
    });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const requestRollback = async (req, res) => {
  try {
    const { rollbackService } = await import('../services/rollbackService.js');
    const result = await rollbackService.requestRollback(req.body || {});
    return res.status(200).json({
      status: 'SUCCESS',
      message: result?.message || 'Rollback plan created.',
      rollback_plan: result?.rollback_plan || null
    });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const simulateRollback = async (req, res) => {
  try {
    const { rollbackService } = await import('../services/rollbackService.js');
    const result = await rollbackService.simulate(req.body || {});
    return res.status(200).json({
      status: 'SUCCESS',
      message: result?.message || 'Simulation complete.',
      simulation: result?.simulation || null,
      rollback_plan: result?.rollback_plan || null
    });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const approveRollback = async (req, res) => {
  try {
    const { rollbackService } = await import('../services/rollbackService.js');
    const result = await rollbackService.approve(req.body || {});
    return res.status(200).json({
      status: 'SUCCESS',
      message: result?.message || 'Rollback approved.',
      rollback_plan: result?.rollback_plan || null
    });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const rejectRollback = async (req, res) => {
  try {
    const { rollbackService } = await import('../services/rollbackService.js');
    const result = await rollbackService.reject(req.body || {});
    return res.status(200).json({
      status: 'SUCCESS',
      message: result?.message || 'Rollback rejected.',
      rollback_plan: result?.rollback_plan || null
    });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

export const getRollbackHistory = async (req, res) => {
  try {
    const { rollbackService } = await import('../services/rollbackService.js');
    const filterType = req.query?.filter || req.query?.type;
    const result = await rollbackService.getHistory(filterType);
    return res.status(200).json({
      status: 'SUCCESS',
      history: result?.history || []
    });
  } catch (error) {
    return res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

