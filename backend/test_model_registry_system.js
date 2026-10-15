import db from './config/db.js';
import modelRegistryService from './services/modelRegistryService.js';
import fs from 'fs';

async function runModule7A3Tests() {
  console.log('==================================================');
  console.log('STARTING MODULE 7A.3 MODEL REGISTRY SYSTEM TESTS');
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
    const targetDatasetVersion = '2026.08.001';

    
    console.log('--- TEST 1: Initial Model Registration (v1.0.0) ---');
    const regRes1 = await modelRegistryService.registerModel({
      model_version: v1Tag,
      model_name: `GradientBoosting Demand Predictor ${v1Tag}`,
      algorithm: 'GradientBoostingRegressor',
      dataset_version: targetDatasetVersion,
      status: 'PRODUCTION',
      mae: 0.85,
      rmse: 1.12,
      r2_score: 0.94,
      cv_score: 0.92,
      sample_count: 1500,
      created_by: 'TEST_SUITE',
      description: 'Initial production model trained on verified snapshot dataset 2026.08.001'
    });

    assert(regRes1.success === true, 'Model v1.0.0 registered successfully');
    assert(regRes1.model.model_version === v1Tag, `Model version tag is ${v1Tag}`);
    assert(regRes1.model.status === 'PRODUCTION', 'Model initial status is PRODUCTION');
    assert(regRes1.model.dataset_version === targetDatasetVersion, `Linked to dataset version ${targetDatasetVersion}`);
    assert(regRes1.model.checksum && regRes1.model.checksum.length === 64, `Generated 64-char SHA-256 checksum (${regRes1.model.checksum.slice(0, 12)}...)`);
    assert(fs.existsSync(regRes1.model.artifact_path), `Physical binary artifact exists at ${regRes1.model.artifact_path}`);

    
    console.log('\n--- TEST 2: Candidate Model Registration (v1.1.0) ---');
    const regRes2 = await modelRegistryService.registerModel({
      model_version: v2Tag,
      model_name: `GradientBoosting Regressor Candidate ${v2Tag}`,
      algorithm: 'GradientBoostingRegressor',
      dataset_version: targetDatasetVersion,
      status: 'CANDIDATE',
      mae: 0.78,
      rmse: 1.02,
      r2_score: 0.96,
      cv_score: 0.94,
      sample_count: 2000,
      created_by: 'TEST_SUITE',
      description: 'Improved candidate model trained on 2026.08.001 dataset'
    });

    assert(regRes2.success === true, 'Model v1.1.0 registered successfully');
    assert(regRes2.model.status === 'CANDIDATE', 'Candidate model status is CANDIDATE');

    
    console.log('\n--- TEST 3: Registry Query & Active Production Model Resolution ---');
    const models = await modelRegistryService.getRegisteredModels();
    assert(Array.isArray(models) && models.length >= 2, `Registry returns model versions (count: ${models.length})`);

    const currentProd = await modelRegistryService.getCurrentProductionModel();
    assert(currentProd !== null && currentProd.model_version === v1Tag, `Current production model resolved as ${v1Tag}`);

    
    console.log('\n--- TEST 4: Model Promotion & Single PRODUCTION Rule Enforcement ---');
    const promoteRes = await modelRegistryService.promoteModel(v2Tag, 'TEST_ADMIN');
    assert(promoteRes.success === true, `Promoted model ${v2Tag} to PRODUCTION`);
    assert(promoteRes.model.status === 'PRODUCTION', `Model ${v2Tag} status updated to PRODUCTION`);

    const updatedProd = await modelRegistryService.getCurrentProductionModel();
    assert(updatedProd !== null && updatedProd.model_version === v2Tag, `Active production model updated to ${v2Tag}`);

    const oldModel = await modelRegistryService.getModelByVersion(v1Tag);
    assert(oldModel.status === 'CANDIDATE', `Former production model ${v1Tag} demoted to CANDIDATE status`);

    
    console.log('\n--- TEST 5: Archive Model Lifecycle Rules ---');
    
    const archiveProdRes = await modelRegistryService.archiveModel(v2Tag, 'TEST_ADMIN');
    assert(archiveProdRes.success === false, 'Blocked archiving of active PRODUCTION model as expected');

    
    const archiveCandRes = await modelRegistryService.archiveModel(v1Tag, 'TEST_ADMIN');
    assert(archiveCandRes.success === true, `Archived candidate model ${v1Tag}`);
    assert(archiveCandRes.model.status === 'ARCHIVED', `Model ${v1Tag} status set to ARCHIVED`);

    
    console.log('\n--- TEST 6: Model Registry Metrics & Analytics ---');
    const metrics = await modelRegistryService.getMetrics();
    assert(metrics.total_models >= 2, `Metrics reports total registered models count (${metrics.total_models})`);
    assert(metrics.active_production_version === v2Tag, `Metrics reports active production version (${metrics.active_production_version})`);

    
    console.log('\n--- TEST 7: Physical Artifact Storage Inspection ---');
    const artifacts = await modelRegistryService.getArtifacts();
    assert(Array.isArray(artifacts) && artifacts.length > 0, `Artifacts directory contains physical files (${artifacts.length} files found)`);

    
    console.log('\n--- TEST 8: Model Audit History Logging Verification ---');
    const history = await modelRegistryService.getHistory();
    assert(Array.isArray(history) && history.length > 0, `Model audit log contains entries (${history.length} events logged)`);
    assert(history.some(h => h.action === 'REGISTERED'), 'Audit history contains REGISTERED event');
    assert(history.some(h => h.action === 'PROMOTED'), 'Audit history contains PROMOTED event');
    assert(history.some(h => h.action === 'ARCHIVED'), 'Audit history contains ARCHIVED event');

    console.log('\n==================================================');
    console.log(`MODULE 7A.3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('UNEXPECTED TEST ERROR:', err);
    await db.end();
    process.exit(1);
  }
}

runModule7A3Tests();
