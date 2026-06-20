import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../backend/config/db.js';

dotenv.config({ path: '../backend/.env' });

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function runSimulation() {
  console.log('--- STARTING SIMULATION OF E2E TEST 4 ---');

  // 1. Setup temporary rack E2E-RACK-01
  await db.query("DELETE FROM racks WHERE rack_code = 'E2E-RACK-01'");
  await db.query("INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity) VALUES ('E2E-RACK-01', 200.00, 10.00, 0.00)");
  console.log('Temporary rack E2E-RACK-01 created.');

  // 2. Create test material
  const testBarcode = 'E2E-SIM-BAR-01';
  const testMatName = 'E2E-SIM-MAT-01';
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [testBarcode]);
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [testBarcode]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [testBarcode]);
  
  await db.query("INSERT INTO qr_codes (barcode_id, material_name, quantity, units, status) VALUES (?, ?, 1.00, 120.00, 'unused')", [testBarcode, testMatName]);

  // 3. Scan to auto-store (should allocate E2E-RACK-01)
  console.log('Sending auto-store scan request...');
  const storeRes = await fetch(`${BASE_URL}/scanner/auto-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode_id: testBarcode,
      rack_code: 'E2E-RACK-01',
      quantity: 120.00
    })
  });

  const storeJson = await storeRes.json();
  console.log('auto-store status:', storeRes.status);
  console.log('auto-store response:', storeJson);

  const [matRow] = await db.query("SELECT id FROM materials WHERE barcode = ?", [testBarcode]);
  const testMaterialId = matRow[0].id;
  console.log('Material ID:', testMaterialId);

  // 4. Fetch rack inventory BEFORE outward
  console.log('Fetching rack inventory before outward...');
  const invBeforeRes = await fetch(`${BASE_URL}/rack-inventory`, {
    headers: { 'Authorization': authHeader }
  });
  const invBeforeJson = await invBeforeRes.json();
  console.log('GET /rack-inventory (Before) status:', invBeforeRes.status);
  console.log('GET /rack-inventory (Before) body:', JSON.stringify(invBeforeJson));

  const beforeList = invBeforeJson.data || invBeforeJson.racks || invBeforeJson || [];
  const beforeItem = beforeList.find(r => r.rack_code === 'E2E-RACK-01');
  
  if (!beforeItem || beforeItem.current_capacity === undefined) {
    throw new Error("current_capacity missing from API response (Before)");
  }
  const beforeCapacity = Number(beforeItem.current_capacity);
  console.log('beforeCapacity:', beforeCapacity);

  // 5. Update stock: outward 80
  console.log('Sending stock update request...');
  const updateRes = await fetch(`${BASE_URL}/materials/${testMaterialId}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      transaction_type: 'outward',
      quantity: 80.00
    })
  });
  const updateJson = await updateRes.json();
  console.log('POST /stock status:', updateRes.status);
  console.log('POST /stock response:', updateJson);

  // Wait a moment for triggers and sync
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 6. Fetch rack inventory AFTER outward
  console.log('Fetching rack inventory after outward...');
  const invAfterRes = await fetch(`${BASE_URL}/rack-inventory`, {
    headers: { 'Authorization': authHeader }
  });
  const invAfterJson = await invAfterRes.json();
  console.log('GET /rack-inventory (After) status:', invAfterRes.status);
  console.log('GET /rack-inventory (After) body:', JSON.stringify(invAfterJson));

  const afterList = invAfterJson.data || invAfterJson.racks || invAfterJson || [];
  const afterItem = afterList.find(r => r.rack_code === 'E2E-RACK-01');

  if (!afterItem || afterItem.current_capacity === undefined) {
    throw new Error("current_capacity missing from API response (After)");
  }
  const afterCapacity = Number(afterItem.current_capacity);
  console.log('afterCapacity:', afterCapacity);

  const deducted = beforeCapacity - afterCapacity;
  console.log(`Deduction calculation: ${beforeCapacity} - ${afterCapacity} = ${deducted}`);

  if (deducted === 80) {
    console.log('✓ SUCCESS: E2E Test 4 Simulation Passed! Deducted exactly 80 KG.');
  } else {
    console.error(`❌ FAILURE: Deduction mismatch! Expected 80, got ${deducted}`);
  }

  // Cleanup
  await db.query("DELETE FROM racks WHERE rack_code = 'E2E-RACK-01'");
  await db.query("DELETE FROM transactions WHERE material_id = ?", [testMaterialId]);
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [testBarcode]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [testBarcode]);
  await db.end();
}

runSimulation().catch(async err => {
  console.error('Simulation failed:', err);
  await db.end();
});
