import db from './config/db.js';
import { aiDataCollectionService } from './services/aiDataCollectionService.js';
import datasetVersionService from './services/datasetVersionService.js';

async function runModule7A11Tests() {
  console.log('==================================================');
  console.log('STARTING MODULE 7A.1.1 DYNAMIC VERSIONING & VALIDATION REASON TESTS');
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
    
    console.log('--- TEST 1: Dynamic Dataset Versioning ---');
    const currentVersion = await datasetVersionService.getCurrentVersion();
    assert(typeof currentVersion === 'string' && currentVersion.length > 0, `Active version resolved: ${currentVersion}`);
    assert(!currentVersion.includes('hardcoded'), 'Version is dynamically generated');
    assert(/^\d{4}\.\d{2}\.\d{3}$/.test(currentVersion) || /^v?\d+/.test(currentVersion), `Version follows format YYYY.MM.XXX (${currentVersion})`);

    const versionMeta = await datasetVersionService.getVersionMetadata();
    assert(versionMeta.total_versions >= 1, `Total version count tracked: ${versionMeta.total_versions}`);

    
    console.log('\n--- TEST 2: Valid Transaction with Dynamic Dataset Version ---');
    const testTs = new Date().toISOString();
    const validRes = await aiDataCollectionService.captureTransaction({
      material_id: 2,
      quantity: 120.0,
      movement_type: 'INWARD',
      timestamp: testTs
    });

    assert(validRes.success === true, 'Valid transaction captured');
    assert(validRes.dataset_version === currentVersion, `Record receives active version tag (${validRes.dataset_version})`);
    assert(validRes.validation_status === 'VALIDATED', 'Validation status is VALIDATED');
    assert(validRes.validation_reason === null, 'Validation reason for valid record is null');

    
    console.log('\n--- TEST 3: Validation Reason - Negative Quantity ---');
    const invalidQtyRes = await aiDataCollectionService.captureTransaction({
      material_id: 2,
      quantity: -50.0,
      movement_type: 'INWARD'
    });

    assert(invalidQtyRes.success === false, 'Negative quantity rejected');
    assert(invalidQtyRes.validation_status === 'REJECTED', 'Status is REJECTED');
    assert(invalidQtyRes.validation_reason === 'Negative Quantity', `Reason logged as 'Negative Quantity' (got '${invalidQtyRes.validation_reason}')`);

    
    console.log('\n--- TEST 4: Validation Reason - Missing Material ID ---');
    const missingMatRes = await aiDataCollectionService.captureTransaction({
      quantity: 10.0,
      movement_type: 'INWARD'
    });

    assert(missingMatRes.success === false, 'Missing material_id rejected');
    assert(missingMatRes.validation_status === 'REJECTED', 'Status is REJECTED');
    assert(missingMatRes.validation_reason.includes('Missing Required Field'), `Reason logged as Missing Required Field (got '${missingMatRes.validation_reason}')`);

    
    console.log('\n--- TEST 5: Validation Reason - Duplicate Transaction ---');
    const dupRes = await aiDataCollectionService.captureTransaction({
      material_id: 2,
      quantity: 120.0,
      movement_type: 'INWARD',
      timestamp: testTs
    });

    assert(dupRes.success === false, 'Duplicate transaction blocked');
    assert(dupRes.validation_status === 'REJECTED', 'Status is REJECTED');
    assert(dupRes.validation_reason === 'Duplicate Transaction', `Reason logged as 'Duplicate Transaction' (got '${dupRes.validation_reason}')`);

    
    console.log('\n--- TEST 6: Database Schema & Record Audit ---');
    const [cols] = await db.query('SHOW COLUMNS FROM training_dataset');
    const colNames = cols.map(c => c.Field);
    assert(colNames.includes('validation_reason'), 'training_dataset table contains validation_reason column');
    assert(colNames.includes('dataset_version'), 'training_dataset table contains dataset_version column');

    const [dbRows] = await db.query('SELECT * FROM training_dataset WHERE hash_signature = ?', [validRes.hash_signature]);
    assert(dbRows.length === 1, 'Valid transaction row stored in MySQL');
    if (dbRows.length > 0) {
      assert(dbRows[0].dataset_version === currentVersion, `MySQL row contains dataset_version ${currentVersion}`);
      assert(dbRows[0].validation_status === 'VALIDATED', 'MySQL row validation_status is VALIDATED');
    }

    
    console.log('\n--- TEST 7: API Telemetry Status & Statistics ---');
    const status = await aiDataCollectionService.getCollectionStatus();
    assert(status.current_dataset_version === currentVersion, `Status API reports current dataset version ${status.current_dataset_version}`);
    assert(status.total_versions >= 1, `Status API reports total versions count`);
    assert(Array.isArray(status.top_validation_reasons), 'Status API returns top_validation_reasons array');

    const stats = await aiDataCollectionService.getCollectionStatistics();
    assert(stats.current_dataset_version === currentVersion, 'Statistics API returns current dataset version');
    assert(stats.accepted_records >= 1, 'Statistics API returns accepted records count');

    const logs = await aiDataCollectionService.getCollectionLogs();
    assert(logs.status === 'SUCCESS', 'Logs API returns SUCCESS');
    assert(logs.logs.some(l => l.dataset_version === currentVersion), 'Logs contain dynamic dataset version');

    console.log('\n==================================================');
    console.log(`MODULE 7A.1.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('UNEXPECTED TEST ERROR:', err);
    await db.end();
    process.exit(1);
  }
}

runModule7A11Tests();
