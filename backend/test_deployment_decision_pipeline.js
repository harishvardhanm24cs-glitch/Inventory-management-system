import http from 'http';
import { aiBridgeService } from './services/aiBridgeService.js';
import express from 'express';
import aiRoutes from './routes/aiRoutes.js';

const PORT = 5002;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const app = express();
app.use(express.json());
app.use('/api/ai', aiRoutes);

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('TESTING MODULE 7A.5 DEPLOYMENT DECISION ENGINE');
  console.log('==================================================\n');

  let serverInstance = null;
  await new Promise((resolve) => {
    serverInstance = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server running on ${BASE_URL}`);
      resolve();
    });
  });

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName) {
    totalCount++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`✗ [FAIL] ${testName}`);
    }
  }

  try {
    
    console.log('\n--- 1. Testing Direct Python DecisionEngine ---');
    const evalRes = await aiBridgeService.executeAction('deployment_evaluate', {
      candidate_model: 'v1.1.0',
      production_model: 'v1.0.0'
    });

    assert(evalRes && (evalRes.status === 'SUCCESS' || evalRes.decision), 'Python DecisionEngine evaluates candidate model');
    const decision = evalRes.decision;
    assert(decision && decision.decision_id && (decision.decision === 'APPROVED' || decision.decision === 'REJECTED'), 'Decision payload contains decision_id and decision');
    assert(Array.isArray(decision.passed_rules), 'Passed rules is an array');

    
    console.log('\n--- 2. Testing GET /api/ai/deployment/policies ---');
    const polRes = await makeRequest('GET', '/api/ai/deployment/policies');
    assert(polRes.status === 200, 'GET /api/ai/deployment/policies returns HTTP 200');
    assert(polRes.data && (polRes.data.policies || polRes.data.data), 'Policies structure retrieved successfully');

    
    console.log('\n--- 3. Testing POST /api/ai/deployment/evaluate (Approval Flow) ---');
    const evalApiRes = await makeRequest('POST', '/api/ai/deployment/evaluate', {
      candidate_model: 'v1.1.0',
      production_model: 'v1.0.0',
      reviewer: 'AUTOMATED_TEST_SUITE'
    });
    assert(evalApiRes.status === 200, 'POST /api/ai/deployment/evaluate returns HTTP 200');
    const apiDecision = evalApiRes.data?.decision || evalApiRes.data;
    assert(apiDecision && apiDecision.decision_id, 'API returned valid decision structure');

    
    console.log('\n--- 4. Testing Candidate Rejection Flow (Failure Detection) ---');
    const rejectEvalRes = await aiBridgeService.executeAction('deployment_evaluate', {
      candidate_model: 'v0.9.0_flawed',
      production_model: 'v1.0.0',
      policies: {
        lower_mae: { enabled: true, metric: "mae", operator: "lt" },
        integrity_verified: { enabled: true, expected_value: "CORRUPTED" } 
      }
    });
    const rejectedDecision = rejectEvalRes?.decision;
    assert(rejectedDecision && rejectedDecision.decision === 'REJECTED', 'Engine correctly detects policy failure and issues REJECTED decision');
    assert(rejectedDecision?.failed_rules?.length > 0, 'Failed rules list contains failing policy details');

    
    console.log('\n--- 5. Testing POST /api/ai/deployment/override (Manual Override) ---');
    const targetDecId = apiDecision?.decision_id || 'DEC-20260728-TEST';
    const overrideRes = await makeRequest('POST', '/api/ai/deployment/override', {
      decision_id: targetDecId,
      override_action: 'REJECT',
      reviewer: 'TEST_ADMINISTRATOR',
      reason: 'Automated test manual rejection override validation'
    });
    assert(overrideRes.status === 200, 'POST /api/ai/deployment/override returns HTTP 200');
    const updatedDec = overrideRes.data?.decision || overrideRes.data;
    assert(updatedDec && updatedDec.decision === 'REJECTED', 'Manual override updated decision to REJECTED');
    assert(updatedDec && updatedDec.manual_override === true, 'Manual override flag set to true');

    
    console.log('\n--- 6. Testing GET /api/ai/deployment/decision ---');
    const getDecRes = await makeRequest('GET', `/api/ai/deployment/decision?decision_id=${targetDecId}`);
    assert(getDecRes.status === 200, 'GET /api/ai/deployment/decision returns HTTP 200');
    assert(getDecRes.data && getDecRes.data.status === 'SUCCESS', 'Specific decision retrieved by ID');

    
    console.log('\n--- 7. Testing GET /api/ai/deployment/history ---');
    const histRes = await makeRequest('GET', '/api/ai/deployment/history');
    assert(histRes.status === 200, 'GET /api/ai/deployment/history returns HTTP 200');
    assert(Array.isArray(histRes.data?.history || histRes.data), 'History endpoint returns decision records array');

    
    console.log('\n--- 8. Testing Prediction API Regression Safety ---');
    const statusRes = await makeRequest('GET', '/api/ai/model/status');
    assert(statusRes.status === 200, 'GET /api/ai/model/status remains HTTP 200');
    
    const predictRes = await makeRequest('POST', '/api/ai/predict', {
      current_stock: 50,
      quantity: 10,
      movement_type: 'INWARD'
    });
    assert(predictRes.status === 200, 'POST /api/ai/predict prediction API remains stable and untouched');

    console.log('\n==================================================');
    console.log(`TEST RESULTS: ${passedCount} / ${totalCount} ASSERTIONS PASSED`);
    console.log('==================================================\n');

    if (serverInstance) serverInstance.close();

    if (passedCount === totalCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    if (serverInstance) serverInstance.close();
    process.exit(1);
  }
}

runTests();
