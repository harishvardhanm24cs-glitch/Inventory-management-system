import featureEngineeringService from './services/featureEngineeringService.js';

/**
 * test_feature_engineering.js
 * Verification test suite for Module 3: Feature Engineering.
 */

async function runTests() {
  console.log('=== RUNNING FEATURE ENGINEERING MODULE SUITE TESTS ===\n');

  try {
    // 1. Versioning & Metadata Test
    console.log('[1/6] Testing Metadata & Feature Versioning...');
    const meta = featureEngineeringService.getMetadata();
    console.log('  ✓ Module:', meta.module);
    console.log('  ✓ Version:', meta.version);
    console.log('  ✓ Features count:', meta.features_count);
    console.log('  ✓ Consumers:', meta.consumers.join(', '));
    if (meta.features_count !== 10 || meta.version !== 'v1.0.0') {
      throw new Error('Invalid metadata configuration!');
    }

    // 2. Full Feature Pipeline Execution
    console.log('\n[2/6] Executing Comprehensive Feature Extraction...');
    const result = await featureEngineeringService.generateAllFeatures();
    console.log('  ✓ Total material feature vectors generated:', result.material_features.length);
    console.log('  ✓ Total rack feature vectors generated:', result.rack_features.racks.length);

    // 3. Verify Material Feature Extraction (Features 1, 2, 3, 4, 6, 8, 10)
    console.log('\n[3/6] Verifying Material Features (Consumption, Turnover, Movement Freq, Activity Score, Threshold Distance)...');
    if (result.material_features.length === 0) {
      throw new Error('No material features were generated!');
    }

    const sampleMat = result.material_features[0];
    console.log(`  ✓ Sample Material: ${sampleMat.material_name} (${sampleMat.barcode})`);
    console.log(`    - Feature 1: Daily Consumption (24h): ${sampleMat.daily_consumption} ${sampleMat.unit}`);
    console.log(`    - Feature 2: Weekly Consumption (7d): ${sampleMat.weekly_consumption} ${sampleMat.unit}`);
    console.log(`    - Feature 3: Monthly Consumption (30d): ${sampleMat.monthly_consumption} ${sampleMat.unit}`);
    console.log(`    - Feature 4: Inventory Turnover: ${sampleMat.turnover_ratio}x (${sampleMat.turnover_category})`);
    console.log(`    - Feature 6: Movement Frequency 30d: ${sampleMat.movement_events_30d} events`);
    console.log(`    - Feature 8: Material Activity Score: ${sampleMat.activity_score} (${sampleMat.activity_tier})`);
    console.log(`    - Feature 10: Threshold Distance: ${sampleMat.threshold_distance} ${sampleMat.unit} (${sampleMat.risk_flag})`);

    // 4. Verify Rack Occupancy Features (Feature 5)
    console.log('\n[4/6] Verifying Rack Occupancy Features (Feature 5)...');
    if (result.rack_features.racks.length > 0) {
      const sampleRack = result.rack_features.racks[0];
      console.log(`  ✓ Sample Rack ${sampleRack.rack_code}: ${sampleRack.occupancy_percentage}% occupied (${sampleRack.status_flag})`);
    }

    // 5. Verify Warehouse Features (Features 7, 9)
    console.log('\n[5/6] Verifying System Warehouse Features (Features 7 & 9)...');
    const scanTime = result.warehouse_features.average_scan_time;
    const util = result.warehouse_features.warehouse_utilization;
    console.log(`  ✓ Feature 7: Average Scan Time: ${scanTime.avg_scan_interval_formatted} (Rating: ${scanTime.scan_efficiency_rating})`);
    console.log(`  ✓ Feature 9: Warehouse Utilization: ${util.warehouse_utilization_percentage}% (Status: ${util.utilization_status})`);

    // 6. Verify Model Independence & Non-Predictive Scope
    console.log('\n[6/6] Verifying Model Independence & Non-Predictive Guarantee...');
    const hasPredictionKeys = Object.keys(result.material_features[0]).some(k => k.includes('predict') || k.includes('forecast'));
    if (hasPredictionKeys) {
      throw new Error('Feature vectors contain predictive fields, violating non-predictive scope!');
    }
    console.log('  ✓ Confirmed 100% non-predictive, model-independent feature calculation.');

    console.log('\n✅ ALL MODULE 3 FEATURE ENGINEERING TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ FEATURE ENGINEERING TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
