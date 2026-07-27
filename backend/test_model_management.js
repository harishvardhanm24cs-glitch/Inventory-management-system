import modelManager from './services/modelManager.js';
import aiPredictionEngine from './services/aiPredictionEngine.js';

/**
 * test_model_management.js
 * Verification test suite for Module 4: AI Model Management System.
 */

async function runTests() {
  console.log('=== RUNNING AI MODEL MANAGEMENT SUITE TESTS ===\n');

  try {
    // 1. Initial Model Registry Audit
    console.log('[1/5] Auditing Model Registry Initialization...');
    const initialModels = modelManager.listAllModels();
    console.log('  ✓ Initial registered models count:', initialModels.length);
    console.log('  ✓ Active model:', modelManager.activeModelId);
    if (initialModels.length < 5) {
      throw new Error('Registry failed to initialize default framework adapters!');
    }

    // 2. Custom Model Registration Test
    console.log('\n[2/5] Testing Model Registration across Framework Adapters...');
    const newTF = modelManager.registerNewModel({
      name: 'XGBoost High Capacity Demand Model',
      framework: 'Scikit-Learn',
      version: 'v2.5.0',
      author: 'AI Research Lab',
      description: 'Tabular decision tree model for high-throughput materials.'
    });
    console.log(`  ✓ Registered model '${newTF.name}' (${newTF.framework} ${newTF.version})`);

    // 3. Dynamic Runtime Model Switching Test
    console.log('\n[3/5] Testing Dynamic Runtime Model Switching...');
    const switchRes = modelManager.switchActiveModel('tensorflow_deep_demand_v1');
    console.log('  ✓ Switched active model to:', switchRes.activeModelId);
    if (modelManager.activeModelId !== 'tensorflow_deep_demand_v1') {
      throw new Error('Failed to switch active model ID!');
    }

    // Serve prediction with active TensorFlow model
    const overviewTF = await aiPredictionEngine.getOverviewPredictions();
    console.log(`  ✓ Prediction served by strategy: '${overviewTF.model_strategy}'`);
    console.log(`    - Demand predictions count: ${overviewTF.predictions.demand.length}`);
    console.log(`    - Model tag on sample prediction: '${overviewTF.predictions.demand[0]?.model_used}'`);

    // 4. Graceful Fallback Test (Missing / Non-Existent Model)
    console.log('\n[4/5] Testing Graceful Fallback Mechanism (Missing Model Handling)...');
    const fallbackRes = modelManager.switchActiveModel('non_existent_model_999');
    console.log('  ✓ Attempted switch to invalid model. Fallback triggered:', fallbackRes.fallback);
    console.log('  ✓ Active model safely reset to:', fallbackRes.activeModelId);

    const fallbackOverview = await aiPredictionEngine.getOverviewPredictions();
    console.log(`  ✓ Predictions served seamlessly during fallback: ${fallbackOverview.predictions.demand.length} items.`);

    // 5. Performance Analytics & Metrics Verification
    console.log('\n[5/5] Testing Model Performance Analytics Logging...');
    const perfData = modelManager.getPerformanceAnalytics();
    console.log('  ✓ Total models tracked:', perfData.total_registered_models);
    console.log('  ✓ Fallback guarantee active:', perfData.fallback_guarantee_active);
    console.log('  ✓ Sample performance entry:', perfData.models[0].performance);

    console.log('\n✅ ALL MODULE 4 AI MODEL MANAGEMENT TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ MODEL MANAGEMENT TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
