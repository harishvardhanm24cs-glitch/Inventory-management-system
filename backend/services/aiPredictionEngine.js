import featureExtractor from './featureExtractor.js';
import modelRegistry from './predictionModels.js';

/**
 * aiPredictionEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized AI Prediction Engine (Module 1 - Core Intelligence Layer)
 *
 * Orchestrates Feature Extraction, Model Strategy Execution, and Prediction
 * Generation across 5 core dimensions:
 * 1. Demand Prediction
 * 2. Inventory Depletion Prediction
 * 3. Rack Utilization Prediction
 * 4. Warehouse Risk Prediction
 * 5. Consumption Trend Prediction
 *
 * Does NOT hardcode predictions. Uses pluggable model strategies via modelRegistry.
 */

export const aiPredictionEngine = {
  /**
   * Get current active ML model strategy
   */
  getActiveStrategy() {
    return modelRegistry.getActiveModel();
  },

  /**
   * 1. Demand Prediction
   */
  async predictDemand() {
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictDemand(matFeatures);
  },

  /**
   * 2. Inventory Depletion Prediction
   */
  async predictDepletion() {
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictDepletion(matFeatures);
  },

  /**
   * 3. Rack Utilization Prediction
   */
  async predictRackUtilization() {
    const rackFeatures = await featureExtractor.extractRackFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictRackUtilization(rackFeatures);
  },

  /**
   * 4. Warehouse Risk Prediction
   */
  async predictWarehouseRisk() {
    const warehouseFeatures = await featureExtractor.extractWarehouseFeatures();
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const rackFeatures = await featureExtractor.extractRackFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictWarehouseRisk(warehouseFeatures, matFeatures, rackFeatures);
  },

  /**
   * 5. Consumption Trend Prediction
   */
  async predictConsumptionTrend() {
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictConsumptionTrend(matFeatures);
  },

  /**
   * Complete Overview: Consolidated 5-Dimensional AI Prediction Engine Suite
   */
  async getOverviewPredictions() {
    const [
      demand,
      depletion,
      rackUtilization,
      warehouseRisk,
      consumptionTrend
    ] = await Promise.all([
      this.predictDemand(),
      this.predictDepletion(),
      this.predictRackUtilization(),
      this.predictWarehouseRisk(),
      this.predictConsumptionTrend()
    ]);

    const activeStrategy = this.getActiveStrategy();

    return {
      timestamp: new Date().toISOString(),
      engine_version: '1.0.0-AI-ENGINE',
      model_strategy: activeStrategy.name,
      predictions: {
        demand,
        depletion,
        rack_utilization: rackUtilization,
        warehouse_risk: warehouseRisk,
        consumption_trend: consumptionTrend
      }
    };
  }
};

export default aiPredictionEngine;
