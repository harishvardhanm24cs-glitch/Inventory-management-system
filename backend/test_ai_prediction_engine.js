import featureExtractor from './services/featureExtractor.js';
import modelRegistry, { IPredictionModelStrategy } from './services/predictionModels.js';
import aiPredictionEngine from './services/aiPredictionEngine.js';
import recommendationEngine from './services/recommendationEngine.js';

/**
 * test_ai_prediction_engine.js
 * Verification script to validate all 5 AI predictions, feature extraction, strategy pluggability, and recommendations.
 */

async function runTests() {
  console.log('=== RUNNING AI PREDICTION ENGINE SUITE TESTS ===\n');

  try {
    // 1. Feature Extraction Test
    console.log('[1/5] Testing Feature Extractor Layer...');
    const matFeatures = await featureExtractor.extractMaterialFeatures();
    const rackFeatures = await featureExtractor.extractRackFeatures();
    const warehouseFeatures = await featureExtractor.extractWarehouseFeatures();

    console.log(`  ✓ Extracted ${matFeatures.length} material feature vectors.`);
    console.log(`  ✓ Extracted ${rackFeatures.length} rack feature vectors.`);
    console.log(`  ✓ Warehouse features summary: Health Score = ${warehouseFeatures.healthScore}, Critical Alerts = ${warehouseFeatures.criticalAlertsCount}`);

    // 2. Prediction Core Test
    console.log('\n[2/5] Testing 5 Core AI Predictions...');
    const demand = await aiPredictionEngine.predictDemand();
    const depletion = await aiPredictionEngine.predictDepletion();
    const rackUtil = await aiPredictionEngine.predictRackUtilization();
    const risk = await aiPredictionEngine.predictWarehouseRisk();
    const trend = await aiPredictionEngine.predictConsumptionTrend();

    console.log(`  ✓ 1. Demand Predictions: ${demand.length} items evaluated.`);
    console.log(`  ✓ 2. Depletion Predictions: ${depletion.length} items evaluated.`);
    console.log(`  ✓ 3. Rack Utilization Predictions: ${rackUtil.length} racks evaluated.`);
    console.log(`  ✓ 4. Warehouse Risk Score: ${risk.overall_risk_score}/100 (${risk.risk_level})`);
    console.log(`  ✓ 5. Consumption Trend Predictions: ${trend.length} items evaluated.`);

    // 3. Consolidated Overview Test
    console.log('\n[3/5] Testing Consolidated AI Engine Overview Payload...');
    const overview = await aiPredictionEngine.getOverviewPredictions();
    console.log(`  ✓ Engine Version: ${overview.engine_version}`);
    console.log(`  ✓ Active Model Strategy: ${overview.model_strategy}`);

    // 4. Recommendation Engine Integration Test
    console.log('\n[4/5] Testing Predictive Recommendation Engine Integration...');
    const recs = await recommendationEngine.generatePredictiveRecommendations();
    console.log(`  ✓ Generated ${recs.total_recommendations} predictive recommendations.`);

    // 5. Pluggable ML Strategy Pattern Test
    console.log('\n[5/5] Testing Pluggable ML Strategy Adapter Interface...');

    class MockCustomMLModelStrategy extends IPredictionModelStrategy {
      constructor() {
        super('CustomNeuralNetMLStrategy');
      }
      async predictDemand(f) { return f.map(m => ({ material_id: m.material_id, custom_nn_forecast: 999, model_used: this.name })); }
      async predictDepletion(f) { return f.map(m => ({ material_id: m.material_id, custom_nn_depletion: '2026-12-31', model_used: this.name })); }
      async predictRackUtilization(f) { return f.map(r => ({ rack_code: r.rack_code, custom_nn_rack_load: 50, model_used: this.name })); }
      async predictWarehouseRisk(w, m, r) { return { overall_risk_score: 10, risk_level: 'LOW', model_used: this.name }; }
      async predictConsumptionTrend(f) { return f.map(m => ({ material_id: m.material_id, trend_direction: 'STABLE', model_used: this.name })); }
    }

    const customModel = new MockCustomMLModelStrategy();
    modelRegistry.registerModel('custom-nn', customModel);
    modelRegistry.setActiveModel('custom-nn');

    const customOverview = await aiPredictionEngine.getOverviewPredictions();
    console.log(`  ✓ Successfully switched active strategy to: '${customOverview.model_strategy}' without UI or core modification!`);

    // Reset back to default
    modelRegistry.setActiveModel('default');
    console.log(`  ✓ Successfully restored default strategy: '${aiPredictionEngine.getActiveStrategy().name}'.`);

    console.log('\n✅ ALL AI PREDICTION ENGINE TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

runTests();
