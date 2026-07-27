import express from 'express';
import { 
  getAiPredictions, 
  getAiRecommendations, 
  getRackOptimizations, 
  getReorderRecommendations,
  getRiskAnalysis,
  getLowStockIntelligence,
  getConsumptionIntelligence,
  getDeadStockIntelligence,
  getRackOptimizationIntelligence,
  getSmartAlerts,
  getWarehouseHealthScore,
  getAiAlertPrioritization
} from '../controllers/aiController.js';
import { protect, anyRole, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

import { 
  getPredictionEngineOverview,
  getDemandPredictions,
  getDepletionPredictions,
  getRackUtilizationPredictions,
  getWarehouseRiskPredictions,
  getConsumptionTrendPredictions,
  getPredictiveRecommendations
} from '../controllers/predictionEngineController.js';

import {
  runPipeline,
  getPipelineStatus,
  getDatasets,
  exportDataset
} from '../controllers/mlPipelineController.js';

import {
  getFeatures,
  getMaterialFeatures,
  getWarehouseFeatures,
  getFeatureCatalog
} from '../controllers/featureController.js';

import {
  getModels,
  registerModel,
  switchModel,
  loadModel,
  getModelPerformance
} from '../controllers/modelController.js';

import {
  getRecommendationsEngine,
  getRecommendationsByCategory,
  switchRecommendationStrategy
} from '../controllers/recommendationController.js';

import {
  explainMaterial,
  explainRack,
  getDashboardExplanations,
  getDigitalTwinExplanations,
  getReportsExplanations,
  getManagerPortalExplanations
} from '../controllers/xaiController.js';

import {
  getAiHealth,
  getAiMetrics,
  resetAiMetrics
} from '../controllers/aiMonitoringController.js';

import {
  getPlatformOverview,
  generateDataset,
  configureTraining,
  simulateRun,
  getHistory,
  getEvaluations,
  deployModel,
  rollbackModel
} from '../controllers/trainingPlatformController.js';

import {
  generateDataset as generateMlDataset,
  getVersions as getDatasetVersions,
  downloadDataset
} from '../controllers/datasetGeneratorController.js';

import {
  runCleaningPipeline,
  getCleaningReport,
  downloadCleanDataset
} from '../controllers/dataCleaningPipelineController.js';

import {
  runFeaturePipeline,
  getFeatureMetadata,
  getFeatureStatistics,
  downloadFeatureDataset,
  getFeatureRegistry,
  getFeatureImportanceTemplate,
  getPreprocessingConfig,
  getFeaturePipelineDoc,
  getModelRegistry
} from '../controllers/featureEngineeringPipelineController.js';

// --- Feature Engineering & Governance Endpoints ---
router.post('/feature-engineering/run', protect, anyRole, runFeaturePipeline);
router.get('/feature-engineering/metadata', protect, anyRole, getFeatureMetadata);
router.get('/feature-engineering/statistics', protect, anyRole, getFeatureStatistics);
router.get('/feature-engineering/download/:format', protect, anyRole, downloadFeatureDataset);
router.get('/feature-engineering/registry', protect, anyRole, getFeatureRegistry);
router.get('/feature-registry', protect, anyRole, getFeatureRegistry);

// --- AI Governance Metadata Endpoints ---
router.get('/governance/feature-registry', protect, anyRole, getFeatureRegistry);
router.get('/governance/feature-importance-template', protect, anyRole, getFeatureImportanceTemplate);
router.get('/governance/preprocessing-config', protect, anyRole, getPreprocessingConfig);
router.get('/governance/feature-pipeline', protect, anyRole, getFeaturePipelineDoc);
router.get('/governance/model-registry', protect, anyRole, getModelRegistry);

// --- ML Data Cleaning Pipeline Endpoints ---
router.post('/data-cleaning/run', protect, anyRole, runCleaningPipeline);
router.get('/data-cleaning/report', protect, anyRole, getCleaningReport);
router.get('/data-cleaning/download/:format', protect, anyRole, downloadCleanDataset);

// --- AI Dataset Generator Endpoints ---
router.post('/dataset-generator/generate', protect, anyRole, generateMlDataset);
router.get('/dataset-generator/versions', protect, anyRole, getDatasetVersions);
router.get('/dataset-generator/download/:filename', protect, anyRole, downloadDataset);

// --- Module 10: Future AI Training Platform Endpoints ---
router.get('/training/overview', protect, anyRole, getPlatformOverview);
router.post('/training/dataset/generate', protect, anyRole, generateDataset);
router.post('/training/configure', protect, anyRole, configureTraining);
router.post('/training/run', protect, anyRole, simulateRun);
router.get('/training/history', protect, anyRole, getHistory);
router.get('/training/evaluations', protect, anyRole, getEvaluations);
router.post('/training/deploy', protect, anyRole, deployModel);
router.post('/training/rollback', protect, anyRole, rollbackModel);

// Get AI stock prediction insights
// GET /api/ai/predictions
router.get('/predictions', protect, anyRole, getAiPredictions);

// --- Module 7: AI Monitoring Endpoints ---
// GET /api/ai/monitoring/health
router.get('/monitoring/health', protect, anyRole, getAiHealth);

// GET /api/ai/monitoring/metrics
router.get('/monitoring/metrics', protect, anyRole, getAiMetrics);

// POST /api/ai/monitoring/reset
router.post('/monitoring/reset', protect, adminOnly, resetAiMetrics);

// --- Module 6: Explainable AI (XAI) Endpoints ---
// GET /api/ai/xai/explain/material/:id
router.get('/xai/explain/material/:id', protect, anyRole, explainMaterial);

// GET /api/ai/xai/explain/rack/:code
router.get('/xai/explain/rack/:code', protect, anyRole, explainRack);

// GET /api/ai/xai/dashboard
router.get('/xai/dashboard', protect, anyRole, getDashboardExplanations);

// GET /api/ai/xai/digital-twin
router.get('/xai/digital-twin', protect, anyRole, getDigitalTwinExplanations);

// GET /api/ai/xai/reports
router.get('/xai/reports', protect, anyRole, getReportsExplanations);

// GET /api/ai/xai/manager-portal
router.get('/xai/manager-portal', protect, anyRole, getManagerPortalExplanations);

// --- Module 5: AI Recommendation Engine Endpoints ---
// GET /api/ai/recommendations/engine
router.get('/recommendations/engine', protect, anyRole, getRecommendationsEngine);

// GET /api/ai/recommendations/category/:category
router.get('/recommendations/category/:category', protect, anyRole, getRecommendationsByCategory);

// POST /api/ai/recommendations/strategy
router.post('/recommendations/strategy', protect, anyRole, switchRecommendationStrategy);

// --- Module 4: Model Management Endpoints ---
// GET /api/ai/models
router.get('/models', protect, anyRole, getModels);

// POST /api/ai/models/register
router.post('/models/register', protect, anyRole, registerModel);

// POST /api/ai/models/switch
router.post('/models/switch', protect, anyRole, switchModel);

// POST /api/ai/models/load
router.post('/models/load', protect, anyRole, loadModel);

// GET /api/ai/models/performance
router.get('/models/performance', protect, anyRole, getModelPerformance);

// --- Module 3: Feature Engineering Endpoints ---
// GET /api/ai/features
router.get('/features', protect, anyRole, getFeatures);

// GET /api/ai/features/materials
router.get('/features/materials', protect, anyRole, getMaterialFeatures);

// GET /api/ai/features/warehouse
router.get('/features/warehouse', protect, anyRole, getWarehouseFeatures);

// GET /api/ai/features/catalog
router.get('/features/catalog', protect, anyRole, getFeatureCatalog);

// --- Module 2: Machine Learning Data Pipeline Endpoints ---
// POST /api/ai/ml-pipeline/run
router.post('/ml-pipeline/run', protect, anyRole, runPipeline);

// GET /api/ai/ml-pipeline/status
router.get('/ml-pipeline/status', protect, anyRole, getPipelineStatus);

// GET /api/ai/ml-pipeline/datasets
router.get('/ml-pipeline/datasets', protect, anyRole, getDatasets);

// GET /api/ai/ml-pipeline/export/:framework
router.get('/ml-pipeline/export/:framework', protect, anyRole, exportDataset);

// --- Module 1: AI Prediction Engine Endpoints ---
// GET /api/ai/prediction-engine/overview
router.get('/prediction-engine/overview', protect, anyRole, getPredictionEngineOverview);

// GET /api/ai/prediction-engine/demand
router.get('/prediction-engine/demand', protect, anyRole, getDemandPredictions);

// GET /api/ai/prediction-engine/depletion
router.get('/prediction-engine/depletion', protect, anyRole, getDepletionPredictions);

// GET /api/ai/prediction-engine/rack-utilization
router.get('/prediction-engine/rack-utilization', protect, anyRole, getRackUtilizationPredictions);

// GET /api/ai/prediction-engine/warehouse-risk
router.get('/prediction-engine/warehouse-risk', protect, anyRole, getWarehouseRiskPredictions);

// GET /api/ai/prediction-engine/consumption-trend
router.get('/prediction-engine/consumption-trend', protect, anyRole, getConsumptionTrendPredictions);

// GET /api/ai/prediction-engine/recommendations
router.get('/prediction-engine/recommendations', protect, anyRole, getPredictiveRecommendations);

// Get Low Stock Intelligence (Module 2)
// GET /api/ai/low-stock-intelligence
router.get('/low-stock-intelligence', protect, anyRole, getLowStockIntelligence);

// Get Consumption Intelligence (Module 4)
// GET /api/ai/consumption-intelligence
router.get('/consumption-intelligence', protect, anyRole, getConsumptionIntelligence);

// Get Dead Stock Intelligence (Module 5)
// GET /api/ai/dead-stock-intelligence
router.get('/dead-stock-intelligence', protect, anyRole, getDeadStockIntelligence);

// Get Rack Optimization Intelligence (Module 6)
// GET /api/ai/rack-optimization-intelligence
router.get('/rack-optimization-intelligence', protect, anyRole, getRackOptimizationIntelligence);

// Get AI Smart Alerts (Module 7)
// GET /api/ai/smart-alerts
router.get('/smart-alerts', protect, anyRole, getSmartAlerts);

// Get Warehouse Health Score (Module 10)
// GET /api/ai/warehouse-health-score
router.get('/warehouse-health-score', protect, anyRole, getWarehouseHealthScore);

// Get AI reorder recommendations
// GET /api/ai/reorder-recommendations
router.get('/reorder-recommendations', protect, anyRole, getReorderRecommendations);

// Get AI risk analysis
// GET /api/ai/risk-analysis
router.get('/risk-analysis', protect, anyRole, getRiskAnalysis);

// Get AI recommendations
// GET /api/ai/recommendations
router.get('/recommendations', protect, anyRole, getAiRecommendations);

// Get AI rack capacity optimizations
// GET /api/ai/rack-optimization
router.get('/rack-optimization', getRackOptimizations);

// Get AI alert prioritization
// GET /api/ai/alert-prioritization
router.get('/alert-prioritization', protect, anyRole, getAiAlertPrioritization);

export default router;
