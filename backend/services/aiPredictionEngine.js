import featureExtractor from './featureExtractor.js';
import modelRegistry from './predictionModels.js';

export const aiPredictionEngine = {
  
  getActiveStrategy() {
    return modelRegistry.getActiveModel();
  },

  
  async predictDemand() {
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictDemand(matFeatures);
  },

  
  async predictDepletion() {
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictDepletion(matFeatures);
  },

  
  async predictRackUtilization() {
    const rackFeatures = await featureExtractor.extractRackFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictRackUtilization(rackFeatures);
  },

  
  async predictWarehouseRisk() {
    const warehouseFeatures = await featureExtractor.extractWarehouseFeatures();
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const rackFeatures = await featureExtractor.extractRackFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictWarehouseRisk(warehouseFeatures, matFeatures, rackFeatures);
  },

  
  async predictConsumptionTrend() {
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const strategy = this.getActiveStrategy();
    return await strategy.predictConsumptionTrend(matFeatures);
  },

  
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
