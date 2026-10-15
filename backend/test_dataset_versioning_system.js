import db from './config/db.js';
import datasetVersioningService from './services/datasetVersioningService.js';
import fs from 'fs';

async function runModule7A2Tests() {
  console.log('==================================================');
  console.log('STARTING MODULE 7A.2 DATASET VERSIONING SYSTEM TESTS');
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
    const testVersionTag = `2026.08.001`;

    
    console.log('--- TEST 1: Snapshot Creation & Freezing ---');
    const snapshotRes = await datasetVersioningService.createDatasetSnapshot({
      version_tag: testVersionTag,
      dataset_name: `Test Snapshot Version ${testVersionTag}`,
      description: 'Automated test frozen snapshot dataset.',
      created_by: 'TEST_SUITE'
    });

    assert(snapshotRes.success === true, 'Dataset snapshot created successfully');
    assert(snapshotRes.dataset.dataset_version === testVersionTag, `Dataset version tag is ${testVersionTag}`);
    assert(snapshotRes.dataset.status === 'ACTIVE', 'Dataset initial status is ACTIVE');
    assert(snapshotRes.dataset.checksum && snapshotRes.dataset.checksum.length === 64, `Generated 64-char SHA-256 checksum (${snapshotRes.dataset.checksum.slice(0, 12)}...)`);
    assert(fs.existsSync(snapshotRes.dataset.snapshot_path), `Immutable physical file snapshot created at ${snapshotRes.dataset.snapshot_path}`);

    
    console.log('\n--- TEST 2: Dataset Registry & Selection Queries ---');
    const datasets = await datasetVersioningService.getDatasets();
    assert(Array.isArray(datasets) && datasets.length > 0, `Registry contains datasets (${datasets.length} versions found)`);

    const fetchedByVersion = await datasetVersioningService.getDatasetByVersion(testVersionTag);
    assert(fetchedByVersion !== null, `Successfully retrieved dataset by version tag (${testVersionTag})`);

    
    console.log('\n--- TEST 3: SHA-256 Integrity Checksum Verification ---');
    const integrityRes = await datasetVersioningService.verifyIntegrity(testVersionTag);
    assert(integrityRes.success === true, 'Integrity verification PASSED');
    assert(integrityRes.integrity_status === 'VERIFIED', 'Integrity status returns VERIFIED');
    assert(integrityRes.calculated_checksum === fetchedByVersion.checksum, 'Calculated checksum matches expected checksum');

    
    console.log('\n--- TEST 4: Dataset Selection for Training ---');
    const selectRes = await datasetVersioningService.selectDataset(testVersionTag, 'TEST_OPERATOR');
    assert(selectRes.success === true, 'Dataset selection succeeded');
    assert(selectRes.dataset.is_selected === 1 || selectRes.dataset.is_selected === true, 'Dataset is_selected flag set to true');

    const currentDs = await datasetVersioningService.getCurrentDataset();
    assert(currentDs !== null && currentDs.dataset_version === testVersionTag, `Current active dataset version resolved as ${testVersionTag}`);

    
    console.log('\n--- TEST 5: Secondary Version Creation ---');
    const secVersionTag = `2026.08.002`;
    const secSnapshotRes = await datasetVersioningService.createDatasetSnapshot({
      version_tag: secVersionTag,
      dataset_name: `Secondary Test Version ${secVersionTag}`,
      description: 'Secondary test dataset for archive lifecycle test.'
    });
    assert(secSnapshotRes.success === true, `Secondary snapshot ${secVersionTag} created`);

    
    console.log('\n--- TEST 6: Archive Dataset Lifecycle ---');
    const archiveRes = await datasetVersioningService.archiveDataset(secVersionTag, 'TEST_OPERATOR');
    assert(archiveRes.success === true, `Dataset version ${secVersionTag} archived successfully`);
    assert(archiveRes.dataset.status === 'ARCHIVED', 'Dataset status updated to ARCHIVED');
    assert(fs.existsSync(archiveRes.dataset.snapshot_path), `Archived snapshot file exists in archive directory`);

    
    const selectArchivedRes = await datasetVersioningService.selectDataset(secVersionTag);
    assert(selectArchivedRes.success === false, 'Cannot select archived dataset for training (blocked as expected)');

    
    console.log('\n--- TEST 7: Restore Dataset Lifecycle ---');
    const restoreRes = await datasetVersioningService.restoreDataset(secVersionTag, 'TEST_OPERATOR');
    assert(restoreRes.success === true, `Dataset version ${secVersionTag} restored successfully`);
    assert(restoreRes.dataset.status === 'ACTIVE', 'Dataset status restored to ACTIVE');

    
    console.log('\n--- TEST 8: Dataset Statistics & Analytics ---');
    const stats = await datasetVersioningService.getStatistics();
    assert(stats.total_datasets >= 2, `Statistics reports total datasets count (${stats.total_datasets})`);
    assert(stats.current_dataset_version === testVersionTag, `Statistics reports selected current version (${stats.current_dataset_version})`);
    assert(Array.isArray(stats.growth_trend), 'Statistics includes dataset growth trend timeline');

    
    console.log('\n--- TEST 9: Dataset Audit History Log Verification ---');
    const history = await datasetVersioningService.getHistory();
    assert(Array.isArray(history) && history.length > 0, `Dataset audit history contains entries (${history.length} events logged)`);
    assert(history.some(h => h.action === 'SNAPSHOT_FROZEN'), 'Audit history contains SNAPSHOT_FROZEN event');
    assert(history.some(h => h.action === 'SELECTED_FOR_TRAINING'), 'Audit history contains SELECTED_FOR_TRAINING event');
    assert(history.some(h => h.action === 'ARCHIVED'), 'Audit history contains ARCHIVED event');
    assert(history.some(h => h.action === 'RESTORED'), 'Audit history contains RESTORED event');

    console.log('\n==================================================');
    console.log(`MODULE 7A.2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('UNEXPECTED TEST ERROR:', err);
    await db.end();
    process.exit(1);
  }
}

runModule7A2Tests();
