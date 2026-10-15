import recommendationEngineService from './recommendationEngineService.js';

export const recommendationEngine = {
  async generatePredictiveRecommendations() {
    const data = await recommendationEngineService.generateRecommendations();
    return {
      warehouse_risk: null,
      total_recommendations: data.total_count,
      recommendations: data.recommendations
    };
  }
};

export default recommendationEngine;
