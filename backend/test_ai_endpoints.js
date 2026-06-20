import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './config/db.js';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function testAiEndpoints() {
  console.log('--- STARTING PREDICTIVE AI ENDPOINTS TEST ---');
  
  // 1. Test GET /api/ai/predictions
  console.log('\n--- 1. Testing GET /api/ai/predictions ---');
  let response = await fetch(`${BASE_URL}/ai/predictions`, {
    headers: { 'Authorization': authHeader }
  });
  let result = await response.json();
  console.log('Status:', response.status);
  if (response.status !== 200 || result.status !== 'success' || !Array.isArray(result.data)) {
    console.error('❌ Failure: Predictions endpoint failed validation!', result);
    process.exit(1);
  }
  console.log('✓ Predictions payload active. First item:', result.data[0]);

  // 2. Test GET /api/ai/reorder-recommendations
  console.log('\n--- 2. Testing GET /api/ai/reorder-recommendations ---');
  response = await fetch(`${BASE_URL}/ai/reorder-recommendations`, {
    headers: { 'Authorization': authHeader }
  });
  result = await response.json();
  console.log('Status:', response.status);
  if (response.status !== 200 || result.status !== 'success' || !Array.isArray(result.data)) {
    console.error('❌ Failure: Reorder recommendations endpoint failed validation!', result);
    process.exit(1);
  }
  console.log('✓ Reorder recommendations payload active. Count:', result.data.length);

  // 3. Test GET /api/ai/risk-analysis
  console.log('\n--- 3. Testing GET /api/ai/risk-analysis ---');
  response = await fetch(`${BASE_URL}/ai/risk-analysis`, {
    headers: { 'Authorization': authHeader }
  });
  result = await response.json();
  console.log('Status:', response.status);
  if (response.status !== 200 || result.status !== 'success' || !Array.isArray(result.data)) {
    console.error('❌ Failure: Risk analysis endpoint failed validation!', result);
    process.exit(1);
  }
  console.log('✓ Risk analysis payload active. Count:', result.data.length);

  console.log('\n--- ALL PREDICTIVE AI ENDPOINTS TESTED SUCCESSFULLY ---');
  await db.end();
  process.exit(0);
}

testAiEndpoints().catch(async err => {
  console.error('❌ Test execution failed:', err);
  await db.end();
  process.exit(1);
});
