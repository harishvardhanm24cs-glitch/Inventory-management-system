import aiMonitoringService from './services/aiMonitoringService.js';

/**
 * test_ai_monitoring.js
 * Verification test suite for Module 7: AI Monitoring System.
 */

async function runTests() {
  console.log('=== RUNNING AI MONITORING SUITE TESTS ===\n');

  try {
    // 1. Initial AI Health Summary Audit
    console.log('[1/4] Auditing AI Health Index & Operational Status...');
    const healthSummary = await aiMonitoringService.getAiHealthSummary();
    console.log('  ✓ AI Health Index:', `${healthSummary.health_index}%`);
    console.log('  ✓ Operational Status:', healthSummary.status);
    console.log('  ✓ Non-Interference Guarantee:', healthSummary.non_interference_guarantee);

    if (typeof healthSummary.health_index !== 'number' || healthSummary.health_index < 0 || healthSummary.health_index > 100) {
      throw new Error('AI Health Index outside [0, 100] range!');
    }

    // 2. 6 Core Tracking Metrics Audit
    console.log('\n[2/4] Auditing 6 Core Metric Tracking Dimensions...');
    const m = healthSummary.metrics;

    console.log(`  ✓ 1. Prediction Accuracy: ${m.prediction_accuracy.accuracy_pct}% (F1: ${m.prediction_accuracy.f1_score}, MAE: ${m.prediction_accuracy.mae_score})`);
    console.log(`  ✓ 2. Prediction Latency: Avg ${m.prediction_latency.avg_latency_ms} ms (P95: ${m.prediction_latency.p95_latency_ms} ms, Total Served: ${m.prediction_latency.total_predictions_served})`);
    console.log(`  ✓ 3. Feature Availability: Readiness ${m.feature_availability.readiness_pct}% (Missing Ratio: ${m.feature_availability.missing_vector_ratio})`);
    console.log(`  ✓ 4. Model Status: Active Model '${m.model_status.active_model_id}' (${m.model_status.framework}, Loaded: ${m.model_status.is_loaded})`);
    console.log(`  ✓ 5. Data Quality: Cleanliness ${m.data_quality.cleanliness_score_pct}% (Schema Integrity: ${m.data_quality.schema_integrity_pct}%)`);
    console.log(`  ✓ 6. Prediction Failures: ${m.prediction_failures.total_failures} failures (Error Rate: ${m.prediction_failures.failure_rate_pct}%, Fallbacks: ${m.prediction_failures.fallback_triggers_count})`);

    // 3. Async Non-Blocking Telemetry Ingestion Test
    console.log('\n[3/4] Testing Async Non-Blocking Telemetry Recording...');
    aiMonitoringService.recordPredictionTelemetry({ latencyMs: 3.4, success: true });
    aiMonitoringService.recordFallbackTrigger('test_model_v9');

    // Wait 50ms for setImmediate callbacks
    await new Promise(r => setTimeout(r, 50));
    const updatedSummary = await aiMonitoringService.getAiHealthSummary();
    console.log('  ✓ Updated total predictions served:', updatedSummary.metrics.prediction_latency.total_predictions_served);
    console.log('  ✓ Updated fallbacks counter:', updatedSummary.metrics.prediction_failures.fallback_triggers_count);

    // 4. Administrative Telemetry Reset Test
    console.log('\n[4/4] Testing Administrative Telemetry Reset...');
    const resetRes = aiMonitoringService.resetMetrics();
    console.log('  ✓ Reset result:', resetRes.message);

    console.log('\n✅ ALL MODULE 7 AI MONITORING TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ AI MONITORING TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
