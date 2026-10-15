import db from './config/db.js';
import { aiDataCollectionService } from './services/aiDataCollectionService.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING MODULE 7A.1 CONTINUOUS DATA COLLECTION TESTS');
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
    
    console.log('--- TEST 1: Valid Transaction Capture ---');
    const testTs = new Date().toISOString();
    const result1 = await aiDataCollectionService.captureTransaction({
      material_id: 1,
      quantity: 45.5,
      movement_type: 'INWARD',
      timestamp: testTs
    });

    assert(result1.success === true, 'Valid transaction captured successfully');
    assert(result1.hash_signature !== undefined, 'Generated hash signature exists');
    assert(result1.features && result1.features.inventory_health_score !== undefined, 'Extracted feature vector includes inventory_health_score');

    
    console.log('\n--- TEST 2: Validation Failure Rejection ---');
    const result2 = await aiDataCollectionService.captureTransaction({
      material_id: -99, 
      quantity: -5.0,   
      movement_type: 'INVALID_TYPE'
    });

    assert(result2.success === false, 'Invalid transaction rejected by validator');
    assert(result2.message.includes('Validation Failed'), 'Rejection message contains Validation Failed');

    
    console.log('\n--- TEST 3: Duplicate Transaction Detection ---');
    const result3 = await aiDataCollectionService.captureTransaction({
      material_id: 1,
      quantity: 45.5,
      movement_type: 'INWARD',
      timestamp: testTs 
    });

    assert(result3.success === false, 'Duplicate transaction detected and blocked');
    assert(result3.status === 'DUPLICATE', 'Status returns DUPLICATE');

    
    console.log('\n--- TEST 4: Collection Status API Telemetry ---');
    const status = await aiDataCollectionService.getCollectionStatus();
    assert(status.pipeline_status === 'HEALTHY', `Pipeline status is HEALTHY (got ${status.pipeline_status})`);
    assert(status.total_collected_records >= 1, `Total collected records >= 1 (got ${status.total_collected_records})`);
    assert(typeof status.validation_success_rate === 'number', 'Validation success rate is a number');

    
    console.log('\n--- TEST 5: Collection Statistics ---');
    const stats = await aiDataCollectionService.getCollectionStatistics();
    assert(stats.accepted_records >= 1, `Accepted records count >= 1 (got ${stats.accepted_records})`);
    assert(stats.duplicate_records >= 1, `Duplicate records count tracked (got ${stats.duplicate_records})`);

    
    console.log('\n--- TEST 6: Collection Logs ---');
    const logsRes = await aiDataCollectionService.getCollectionLogs();
    assert(logsRes.status === 'SUCCESS', 'Logs query returns SUCCESS status');
    assert(Array.isArray(logsRes.logs) && logsRes.logs.length > 0, 'Logs array is non-empty');

    
    console.log('\n--- TEST 7: Dataset CSV File Storage Verification ---');
    const csvPath = path.join(process.cwd(), 'ml_datasets', 'continuous_training_dataset.csv');
    const csvExists = fs.existsSync(csvPath);
    assert(csvExists, `Continuous dataset CSV file exists at ${csvPath}`);
    if (csvExists) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      assert(csvContent.includes('hash_signature'), 'CSV header contains hash_signature');
      assert(csvContent.includes('v2026.07'), 'CSV contains dataset_version v2026.07');
    }

    console.log('\n==================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('UNEXPECTED TEST ERROR:', err);
    await db.end();
    process.exit(1);
  }
}

runTests();
