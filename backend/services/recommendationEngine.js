import recommendationEngineService from './recommendationEngineService.js';

/**
 * recommendationEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Recommendation Engine Layer
 * Delegates to Module 5 recommendationEngineService.
 */

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
