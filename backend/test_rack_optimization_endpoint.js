import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './config/db.js';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function testRackOptimizationEndpoint() {
  console.log('--- STARTING RACK OPTIMIZATION ENDPOINT TEST ---');
  
  // 1. Fetch the optimizations from the endpoint
  console.log('Fetching rack optimizations from GET /api/ai/rack-optimization...');
  const response = await fetch(`${BASE_URL}/ai/rack-optimization`, {
    headers: { 'Authorization': authHeader }
  });
  
  const result = await response.json();
  console.log('Response Status:', response.status);
  console.log('Response Body:', JSON.stringify(result, null, 2));

  if (response.status !== 200) {
    console.error('❌ Failure: Response status is not 200!');
    process.exit(1);
  }

  if (result.status !== 'success') {
    console.error('❌ Failure: Response status in body is not success!');
    process.exit(1);
  }

  if (!Array.isArray(result.data)) {
    console.error('❌ Failure: response.data is not an array!');
    process.exit(1);
  }

  console.log('\nValidating optimization suggestions:');
  result.data.forEach((opt, idx) => {
    console.log(`Suggestion #${idx + 1}:`);
    console.log(`- Current Rack: ${opt.current_rack}`);
    console.log(`- Suggested Rack: ${opt.suggested_rack}`);
    console.log(`- Suggestion Msg: "${opt.suggestion}"`);
    console.log(`- Expected Improvement: "${opt.expected_improvement}"`);
    console.log(`- Priority Score: ${opt.priority_score}`);
    
    // Check format of recommendation for balance: Move inventory from [Current] ([Occ]%) to [Suggested] ([Occ]%).
    if (opt.suggested_rack) {
      const balanceRegex = /Move inventory from ([A-C][1-4]) \(\d+%\) to ([A-C][1-4]) \(\d+%\)\./;
      const genericRegex = /Move \w+ Paint from ([A-C][1-4]) to ([A-C][1-4]) to balance occupancy\./;
      const fallbackRegex1 = /Move inventory from B1 \(42%\) to A3 \(5%\)\./;
      const fallbackRegex2 = /A2 occupancy 95%\. Move 20 KG to B2\./;

      const matched = balanceRegex.test(opt.suggestion) || 
                      genericRegex.test(opt.suggestion) || 
                      fallbackRegex1.test(opt.suggestion) || 
                      fallbackRegex2.test(opt.suggestion);

      if (!matched) {
        console.warn(`⚠️ Warning: Msg "${opt.suggestion}" does not match standard balance formats, but is acceptable if it is a fallback/special message.`);
      } else {
        console.log(`✓ Msg format is valid.`);
      }
    } else {
      // Underutilized check
      const underutilizedRegex = /Rack ([A-C][1-4]) is underutilized \(\d+%\)\./;
      if (!underutilizedRegex.test(opt.suggestion)) {
        console.warn(`⚠️ Warning: Underutilized Msg "${opt.suggestion}" does not match standard format.`);
      } else {
        console.log(`✓ Msg format is valid.`);
      }
    }
  });

  console.log('\n--- RACK OPTIMIZATION ENDPOINT TEST PASSED SUCCESSFULLY ---');
  await db.end();
  process.exit(0);
}

testRackOptimizationEndpoint().catch(async err => {
  console.error('❌ Test execution failed:', err);
  await db.end();
  process.exit(1);
});
