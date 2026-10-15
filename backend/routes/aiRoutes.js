

import express from 'express';
import {
  predictSingle,
  predictBatch,
  getModelStatus,
  getFeaturesSchema,
  validatePayload,
  getInsights,
  getLowStockIntelligence,
  getSmartAlerts,
  getRackOptimizationIntelligence,
  getDeadStockIntelligence,
  getConsumptionIntelligence,
  getPredictions,
  getReorderRecommendations,
  getRiskAnalysis,
  getRackOptimization,
  getPredictionEngineOverview,
  getPredictionDemand,
  getPredictionDepletion,
  getPredictionRackUtilization,
  getPredictionWarehouseRisk,
  getPredictionConsumptionTrend,
  getPredictiveRecommendations,
  runMlPipeline,
  getMlPipelineStatus,
  getMlPipelineDatasets,
  exportMlPipeline,
  getMaterialFeatures,
  getWarehouseFeatures,
  getFeatureCatalog,
  getModels,
  registerModel,
  switchModel,
  loadModel,
  getModelPerformance,
  getRecommendationsEngine,
  getRecommendationsByCategory,
  switchRecommendationStrategy,
  explainMaterial,
  explainRack,
  getXaiDashboard,
  getXaiDigitalTwin,
  getXaiReports,
  getXaiManagerPortal,
  getMonitoringHealth,
  getMonitoringMetrics,
  resetMonitoringMetrics,
  getWarehouseHealthScore,
  getDataCollectionStatus,
  getDataCollectionStatistics,
  collectDataTransaction,
  getDataCollectionLogs,
  getDatasets,
  getCurrentDataset,
  getDatasetByVersion,
  createDatasetSnapshot,
  archiveDataset,
  restoreDataset,
  selectDataset,
  getDatasetStatistics,
  getDatasetHistory,
  verifyDatasetIntegrity,
  getRegisteredModels,
  getCurrentProductionModel,
  getRegisteredModelByVersion,
  registerNewModel,
  archiveModelVersion,
  promoteModelToProduction,
  updateModelStatus,
  getModelRegistryHistory,
  getModelRegistryMetrics,
  getModelArtifacts,
  compareModels,
  getModelRanking,
  getModelComparisons,
  getModelRecommendation,
  evaluateDeploymentCandidate,
  getDeploymentDecision,
  getDeploymentHistory,
  overrideDeploymentDecision,
  getDeploymentPolicies,
  saveDeploymentPolicies,
  
  getRollbackEligible,
  requestRollback,
  simulateRollback,
  approveRollback,
  rejectRollback,
  getRollbackHistory
} from '../controllers/AIController.js';
import { validatePredictPayload, validateBatchPayload } from '../middleware/AIValidation.js';
import { protect, managerOnly, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/predict', optionalAuth, validatePredictPayload, predictSingle);
router.post('/predict/batch', protect, managerOnly, validateBatchPayload, predictBatch);
router.post('/validate', optionalAuth, validatePayload);

router.get('/model/status', optionalAuth, getModelStatus);
router.get('/features', optionalAuth, getFeaturesSchema);
router.get('/insights', optionalAuth, getInsights);

router.get('/low-stock-intelligence', optionalAuth, getLowStockIntelligence);
router.get('/smart-alerts', optionalAuth, getSmartAlerts);
router.get('/rack-optimization-intelligence', optionalAuth, getRackOptimizationIntelligence);
router.get('/dead-stock-intelligence', optionalAuth, getDeadStockIntelligence);
router.get('/consumption-intelligence', optionalAuth, getConsumptionIntelligence);

router.get('/predictions', optionalAuth, getPredictions);
router.get('/recommendations', optionalAuth, getReorderRecommendations);
router.get('/reorder-recommendations', optionalAuth, getReorderRecommendations);
router.get('/risk-analysis', optionalAuth, getRiskAnalysis);
router.get('/rack-optimization', optionalAuth, getRackOptimization);
router.get('/alert-prioritization', optionalAuth, getSmartAlerts);
router.get('/warehouse-health-score', optionalAuth, getWarehouseHealthScore);

router.get('/prediction-engine/overview', optionalAuth, getPredictionEngineOverview);
router.get('/prediction-engine/demand', optionalAuth, getPredictionDemand);
router.get('/prediction-engine/depletion', optionalAuth, getPredictionDepletion);
router.get('/prediction-engine/rack-utilization', optionalAuth, getPredictionRackUtilization);
router.get('/prediction-engine/warehouse-risk', optionalAuth, getPredictionWarehouseRisk);
router.get('/prediction-engine/consumption-trend', optionalAuth, getPredictionConsumptionTrend);
router.get('/prediction-engine/recommendations', optionalAuth, getPredictiveRecommendations);

router.post('/ml-pipeline/run', optionalAuth, runMlPipeline);
router.get('/ml-pipeline/status', optionalAuth, getMlPipelineStatus);
router.get('/ml-pipeline/datasets', optionalAuth, getMlPipelineDatasets);
router.get('/ml-pipeline/export/:framework', optionalAuth, exportMlPipeline);

router.get('/features/materials', optionalAuth, getMaterialFeatures);
router.get('/features/warehouse', optionalAuth, getWarehouseFeatures);
router.get('/features/catalog', optionalAuth, getFeatureCatalog);

router.get('/models', optionalAuth, getModels);
router.post('/models/register', optionalAuth, registerModel);
router.post('/models/switch', optionalAuth, switchModel);
router.post('/models/load', optionalAuth, loadModel);
router.get('/models/performance', optionalAuth, getModelPerformance);

router.get('/recommendations/engine', optionalAuth, getRecommendationsEngine);
router.get('/recommendations/category/:category', optionalAuth, getRecommendationsByCategory);
router.post('/recommendations/strategy', optionalAuth, switchRecommendationStrategy);

router.get('/xai/explain/material/:materialId', optionalAuth, explainMaterial);
router.get('/xai/explain/rack/:rackCode', optionalAuth, explainRack);
router.get('/xai/dashboard', optionalAuth, getXaiDashboard);
router.get('/xai/digital-twin', optionalAuth, getXaiDigitalTwin);
router.get('/xai/reports', optionalAuth, getXaiReports);
router.get('/xai/manager-portal', optionalAuth, getXaiManagerPortal);

router.get('/monitoring/health', optionalAuth, getMonitoringHealth);
router.get('/monitoring/metrics', optionalAuth, getMonitoringMetrics);
router.post('/monitoring/reset', optionalAuth, resetMonitoringMetrics);

router.get('/data-collection/status', optionalAuth, getDataCollectionStatus);
router.get('/data-collection/statistics', optionalAuth, getDataCollectionStatistics);
router.post('/data-collection/collect', optionalAuth, collectDataTransaction);
router.get('/data-collection/logs', optionalAuth, getDataCollectionLogs);

router.get('/datasets', optionalAuth, getDatasets);
router.get('/datasets/current', optionalAuth, getCurrentDataset);
router.get('/datasets/statistics', optionalAuth, getDatasetStatistics);
router.get('/datasets/history', optionalAuth, getDatasetHistory);
router.get('/datasets/integrity', optionalAuth, verifyDatasetIntegrity);
router.get('/datasets/:version', optionalAuth, getDatasetByVersion);
router.post('/datasets/create', optionalAuth, createDatasetSnapshot);
router.post('/datasets/archive', optionalAuth, archiveDataset);
router.post('/datasets/restore', optionalAuth, restoreDataset);
router.post('/datasets/select', optionalAuth, selectDataset);

router.get('/models/registry', optionalAuth, getRegisteredModels);
router.get('/models/current', optionalAuth, getCurrentProductionModel);
router.get('/models/history', optionalAuth, getModelRegistryHistory);
router.get('/models/metrics', optionalAuth, getModelRegistryMetrics);
router.get('/models/artifacts', optionalAuth, getModelArtifacts);
router.get('/models/version/:version', optionalAuth, getRegisteredModelByVersion);
router.post('/models/register-new', optionalAuth, registerNewModel);
router.post('/models/archive-version', optionalAuth, archiveModelVersion);
router.post('/models/promote', optionalAuth, promoteModelToProduction);
router.post('/models/status', optionalAuth, updateModelStatus);

router.get('/models/compare', optionalAuth, compareModels);
router.post('/models/compare', optionalAuth, compareModels);
router.get('/models/ranking', optionalAuth, getModelRanking);
router.get('/models/comparisons', optionalAuth, getModelComparisons);
router.get('/models/recommendation', optionalAuth, getModelRecommendation);

router.post('/deployment/evaluate', optionalAuth, evaluateDeploymentCandidate);
router.get('/deployment/decision', optionalAuth, getDeploymentDecision);
router.get('/deployment/history', optionalAuth, getDeploymentHistory);
router.post('/deployment/override', optionalAuth, overrideDeploymentDecision);
router.get('/deployment/policies', optionalAuth, getDeploymentPolicies);
router.post('/deployment/policies', optionalAuth, saveDeploymentPolicies);

router.get('/rollback/eligible',  optionalAuth, getRollbackEligible);
router.post('/rollback/request',  optionalAuth, requestRollback);
router.post('/rollback/simulate', optionalAuth, simulateRollback);
router.post('/rollback/approve',  optionalAuth, approveRollback);
router.post('/rollback/reject',   optionalAuth, rejectRollback);
router.get('/rollback/history',   optionalAuth, getRollbackHistory);

export default router;
