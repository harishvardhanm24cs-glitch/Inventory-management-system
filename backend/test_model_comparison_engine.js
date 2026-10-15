import db from './config/db.js';
import modelComparisonService from './services/modelComparisonService.js';
import modelRegistryService from './services/modelRegistryService.js';

async function runModule7A4Tests() {
  console.log('==================================================');
  console.log('STARTING MODULE 7A.4 MODEL COMPARISON ENGINE TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ [PASS]: ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${message}`);
      failed++;
    }
  }

  try {
    
    const v1Tag = 'v1.0.0';
    const v2Tag = 'v1.1.0';

    await modelRegistryService.registerModel({
      model_version: v1Tag,
      model_name: `Production Baseline Model ${v1Tag}`,
      algorithm: 'GradientBoostingRegressor',
      dataset_version: '2026.08.001',
      status: 'PRODUCTION',
      mae: 0.85,
      rmse: 1.12,
      r2_score: 0.94,
      cv_score: 0.92,
      latency_ms: 4.5
    });

    await modelRegistryService.registerModel({
      model_version: v2Tag,
      model_name: `Candidate Retrained Model ${v2Tag}`,
      algorithm: 'GradientBoostingRegressor',
      dataset_version: '2026.08.001',
      status: 'CANDIDATE',
      mae: 0.78,
      rmse: 1.02,
      r2_score: 0.96,
      cv_score: 0.94,
      latency_ms: 4.2
    });

    
    console.log('--- TEST 1: One-to-One Model Comparison (v1.0.0 vs v1.1.0) ---');
    const compRes = await modelComparisonService.compareModels({
      production_model: v1Tag,
      candidate_model: v2Tag,
      created_by: 'TEST_SUITE'
    });

    assert(compRes.success === true, 'Model comparison executed successfully');
    assert(compRes.comparison !== null, 'Comparison returned comparison result payload');
    assert(compRes.comparison.winner === v2Tag, `Winner correctly identified as Candidate (${v2Tag})`);
    assert(compRes.comparison.recommendation === 'ELIGIBLE_FOR_PROMOTION', 'Recommendation status is ELIGIBLE_FOR_PROMOTION');
    assert(compRes.comparison.confidence_score >= 85.0, `Confidence score is ${compRes.comparison.confidence_score}%`);
    assert(Array.isArray(compRes.comparison.advantages) && compRes.comparison.advantages.length > 0, 'Generated list of candidate metric advantages');

    
    console.log('\n--- TEST 2: Metric-by-Metric Evaluation Breakdown ---');
    const breakdown = compRes.comparison.metrics_breakdown;
    assert(breakdown.mae.better === 'b', 'MAE metric correctly identifies candidate (b) as superior');
    assert(breakdown.rmse.better === 'b', 'RMSE metric correctly identifies candidate (b) as superior');
    assert(breakdown.r2_score.better === 'b', 'R² metric correctly identifies candidate (b) as superior');
    assert(breakdown.latency_ms.better === 'b', 'Latency metric correctly identifies candidate (b) as superior');

    
    console.log('\n--- TEST 3: Model Leaderboard Ranking Leaderboard ---');
    const rankings = await modelComparisonService.getModelRanking();
    assert(Array.isArray(rankings) && rankings.length >= 2, `Rankings returned leaderboard with ${rankings.length} models`);
    assert(rankings[0].model_version === v2Tag, `Rank 1 model is Candidate ${v2Tag}`);
    assert(rankings[0].rank === 1, 'Rank number is 1');

    
    console.log('\n--- TEST 4: Recommendation API Resolution ---');
    const recPayload = await modelComparisonService.getRecommendation(v1Tag, v2Tag);
    assert(recPayload !== null, 'Recommendation resolved successfully');
    assert(recPayload.recommendation === 'ELIGIBLE_FOR_PROMOTION', `Recommendation tag is ${recPayload.recommendation}`);

    
    console.log('\n--- TEST 5: Custom Weighted Scoring Calculation ---');
    const customCompRes = await modelComparisonService.compareModels({
      production_model: v1Tag,
      candidate_model: v2Tag,
      weights: { mae: 0.40, r2_score: 0.40, latency: 0.20 }
    });
    assert(customCompRes.success === true, 'Custom weighted comparison executed');
    assert(customCompRes.comparison.comparison_score > 0, `Custom composite score calculated: ${customCompRes.comparison.comparison_score}`);

    
    console.log('\n--- TEST 6: Comparison History Audit Log Persistence ---');
    const history = await modelComparisonService.getComparisonHistory();
    assert(Array.isArray(history) && history.length > 0, `History contains logged comparison runs (${history.length} runs found)`);
    assert(history.some(h => h.winner === v2Tag), 'Comparison history contains winning candidate entry');

    
    console.log('\n--- TEST 7: Non-Deployment & Non-Interference Guarantee ---');
    const currentProd = await modelRegistryService.getCurrentProductionModel();
    assert(currentProd.model_version === v1Tag, `Production model remains unchanged as ${v1Tag} (comparison did NOT auto-promote)`);

    console.log('\n==================================================');
    console.log(`MODULE 7A.4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('UNEXPECTED TEST ERROR:', err);
    await db.end();
    process.exit(1);
  }
}

runModule7A4Tests();
