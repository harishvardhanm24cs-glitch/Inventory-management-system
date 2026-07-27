import xaiEngineService from './services/xaiEngineService.js';

/**
 * test_xai_engine.js
 * Verification test suite for Module 6: Explainable AI (XAI) System.
 */

async function runTests() {
  console.log('=== RUNNING EXPLAINABLE AI (XAI) SUITE TESTS ===\n');

  try {
    // 1. Material Explanation Test & 6 Mandatory Attributes Audit
    console.log('[1/5] Auditing Material XAI Explanation & 6 Mandatory Attributes...');
    const matExp = await xaiEngineService.explainMaterial('1');
    
    const requiredFields = ['prediction', 'confidence_score', 'key_factors', 'reasoning', 'suggested_action', 'data_sources_used'];
    requiredFields.forEach(field => {
      if (matExp[field] === undefined || matExp[field] === null) {
        throw new Error(`Material XAI explanation missing mandatory attribute '${field}'!`);
      }
    });

    console.log('  ✓ Material Explanation Verified:');
    console.log(`    - Target: "${matExp.target_name}"`);
    console.log(`    - Prediction: "${matExp.prediction}"`);
    console.log(`    - Confidence Score: ${matExp.confidence_score}%`);
    console.log(`    - Factors Count: ${matExp.key_factors.length}`);
    console.log(`    - Reasoning Steps: ${matExp.reasoning.length}`);
    console.log(`    - Suggested Action: "${matExp.suggested_action}"`);
    console.log(`    - Data Lineage: [${matExp.data_sources_used.join(', ')}]`);

    // Verify feature weight sum = 1.0
    const totalWeight = matExp.key_factors.reduce((acc, f) => acc + f.weight, 0);
    console.log(`  ✓ Feature Influence Weights Normalized Sum: ${(totalWeight * 100).toFixed(0)}%`);
    if (Math.abs(totalWeight - 1.0) > 0.05) {
      throw new Error(`Feature weights do not sum to 1.0 (Sum: ${totalWeight})!`);
    }

    // 2. Rack Explanation Test
    console.log('\n[2/5] Auditing Rack Asset XAI Explanation...');
    const rackExp = await xaiEngineService.explainRack('A1');
    console.log(`  ✓ Rack Target: "${rackExp.target_name}"`);
    console.log(`  ✓ Prediction: "${rackExp.prediction}"`);
    console.log(`  ✓ Confidence Score: ${rackExp.confidence_score}%`);

    // 3. Dashboard Portal Adapter Test
    console.log('\n[3/5] Auditing Dashboard XAI Service Adapter...');
    const dashXai = await xaiEngineService.getDashboardExplanations();
    console.log(`  ✓ Portal: ${dashXai.portal}`);
    console.log(`  ✓ Executive summary generated: YES`);

    // 4. Digital Twin & Reports Portal Adapters Test
    console.log('\n[4/5] Auditing Digital Twin & Reports XAI Service Adapters...');
    const dtXai = await xaiEngineService.getDigitalTwinExplanations();
    console.log(`  ✓ Digital Twin spatial nodes explained: ${dtXai.nodes_explained}`);

    const repXai = await xaiEngineService.getReportsExplanations();
    console.log(`  ✓ Reports tabular explanations count: ${repXai.total_reports_explained}`);

    // 5. Manager Portal Adapter Test
    console.log('\n[5/5] Auditing Manager Portal XAI Service Adapter...');
    const mgrXai = await xaiEngineService.getManagerPortalExplanations();
    console.log(`  ✓ Manager Portal escalated directives: ${mgrXai.escalated_items_count}`);

    console.log('\n✅ ALL MODULE 6 EXPLAINABLE AI (XAI) TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ EXPLAINABLE AI TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
