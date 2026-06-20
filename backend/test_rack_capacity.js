/**
 * test_rack_capacity.js
 * End-to-end integration test for Rack Capacity Enforcement.
 */
import db from './config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'rm_secret_key';
const BASE_URL = 'http://localhost:5000/api';

const token = jwt.sign(
  { id: 1, role: 'manager', name: 'CapacityTestUser' },
  JWT_SECRET,
  { expiresIn: '1h' }
);
const authHeader = `Bearer ${token}`;

async function runTest() {
  console.log('=== STARTING RACK CAPACITY ENFORCEMENT TESTS ===\n');

  const testRack = 'RACK-CAP-TEST';
  const testBarcode = 'CAP-BARCODE-001';
  const testMatName = 'Capacity Test Paint';

  // 1. Reset/Create test rack in DB with max_capacity = 100
  console.log(`Resetting test state...`);
  await db.query('DELETE FROM audit_logs WHERE rack_code = ?', [testRack]);
  await db.query('DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)', [testBarcode]);
  await db.query('DELETE FROM qr_history WHERE barcode_id = ?', [testBarcode]);
  await db.query('DELETE FROM materials WHERE barcode = ?', [testBarcode]);
  await db.query('DELETE FROM racks WHERE rack_code = ?', [testRack]);
  await db.query('DELETE FROM qr_codes WHERE barcode_id = ?', [testBarcode]);

  console.log(`Creating test rack ${testRack} with max_capacity = 100.00...`);
  await db.query(
    'INSERT INTO racks (rack_code, material_name, batch_number, quantity, max_capacity, threshold_limit) VALUES (?, NULL, NULL, 0.00, 100.00, 10.00)',
    [testRack]
  );

  console.log(`Generating a QR code with units = 120.00...`);
  const qrRes = await fetch(`${BASE_URL}/generate-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      material_name: testMatName,
      weight: 120.00,
      batch_number: 'B-CAP-120',
      manufacturing_date: '2026-06-19',
      rack_code: testRack
    })
  });

  const qrJson = await qrRes.json();
  if (!qrJson.barcode_id) {
    throw new Error('Failed to generate test QR Code');
  }
  console.log(`✓ QR Code generated successfully: ${qrJson.barcode_id}`);

  // 2. Test Inward Scanner / Auto-Store with 120 KG (exceeding 100 max)
  console.log(`\n[Test 1] Scanning QR of 120 KG into 100 KG capacity rack...`);
  const storeRes = await fetch(`${BASE_URL}/scanner/auto-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode_id: qrJson.barcode_id,
      material_name: testMatName,
      quantity: 120.00,
      rack_code: testRack
    })
  });

  console.log(`Response Status: ${storeRes.status}`);
  const storeJson = await storeRes.json();
  console.log('Response Body:', storeJson);

  if (storeRes.status === 200 && storeJson.success === true) {
    console.log('✓ SUCCESS: Auto-store request succeeded under Unlimited Inventory Mode!');
  } else {
    throw new Error(`FAILURE: Auto-store request was rejected. Status: ${storeRes.status}`);
  }

  // 3. Verify database state (Commit verification)
  console.log('\n[Test 2] Verifying database changes were committed successfully...');
  
  const [[qrCheck]] = await db.query('SELECT status FROM qr_codes WHERE barcode_id = ?', [qrJson.barcode_id]);
  console.log(`- QR Code Status in DB: ${qrCheck?.status} (Expected: unused)`);
  if (qrCheck?.status !== 'unused') {
    throw new Error('FAILURE: QR Code status was not unused!');
  }

  const [matsCheck] = await db.query('SELECT id, quantity FROM materials WHERE barcode = ?', [qrJson.barcode_id]);
  console.log(`- Material Records in DB: ${matsCheck.length} (Expected: 1)`);
  if (matsCheck.length !== 1) {
    throw new Error('FAILURE: Material record was not inserted!');
  }
  if (parseFloat(matsCheck[0].quantity) !== 120.00) {
    throw new Error(`FAILURE: Material quantity is ${matsCheck[0].quantity} (Expected: 120.00)`);
  }

  const [[rackCheck]] = await db.query('SELECT quantity FROM racks WHERE rack_code = ?', [testRack]);
  console.log(`- Rack quantity in DB: ${rackCheck?.quantity} (Expected: 120.00)`);
  if (parseFloat(rackCheck?.quantity) !== 120.00) {
    throw new Error(`FAILURE: Rack quantity was not modified! Got: ${rackCheck?.quantity}`);
  }

  // 4. Verify no capacity blocked logs are written
  console.log('\n[Test 3] Verifying no capacity blocked audit logs were written...');
  const [logs] = await db.query('SELECT action_type, action_details FROM audit_logs WHERE rack_code = ? ORDER BY id DESC', [testRack]);
  const capBlockedLogs = logs.filter(l => l.action_type === 'Capacity Blocked');
  console.log(`- Capacity Blocked logs count for ${testRack}: ${capBlockedLogs.length} (Expected: 0)`);
  if (capBlockedLogs.length > 0) {
    throw new Error('FAILURE: Capacity blocked audit log was written!');
  }
  console.log('✓ SUCCESS: No capacity blocked audit logs found!');

  // 5. Test PUT /api/racks/:id overloading
  console.log(`\n[Test 4] Testing PUT /api/racks/:id allows overloading...`);
  const [[testRackRow]] = await db.query('SELECT id FROM racks WHERE rack_code = ?', [testRack]);
  const putRes = await fetch(`${BASE_URL}/racks/${testRackRow.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      quantity: 110.00
    })
  });
  const putJson = await putRes.json();
  console.log(`Response Status: ${putRes.status}`);
  console.log('Response Body:', putJson);
  if (putRes.status === 200) {
    console.log('✓ SUCCESS: PUT /racks/:id overloading succeeded!');
  } else {
    throw new Error(`FAILURE: PUT /racks/:id overload failed! Status: ${putRes.status}`);
  }

  // 6. Test PUT /api/rack-inventory/:rackCode overloading
  console.log(`\n[Test 5] Testing PUT /api/rack-inventory/:rackCode allows overloading...`);
  const putInvRes = await fetch(`${BASE_URL}/rack-inventory/${testRack}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      current_capacity: 120.00
    })
  });
  const putInvJson = await putInvRes.json();
  console.log(`Response Status: ${putInvRes.status}`);
  console.log('Response Body:', putInvJson);
  if (putInvRes.status === 200) {
    console.log('✓ SUCCESS: PUT /rack-inventory/:rackCode overloading succeeded!');
  } else {
    throw new Error(`FAILURE: PUT /rack-inventory/:rackCode overload failed! Status: ${putInvRes.status}`);
  }

  // Cleanup
  console.log('\nCleaning up test state...');
  await db.query('DELETE FROM audit_logs WHERE rack_code = ?', [testRack]);
  // Also clean up materials created under this test
  if (matsCheck.length > 0) {
    await db.query('DELETE FROM transactions WHERE material_id = ?', [matsCheck[0].id]);
    await db.query('DELETE FROM materials WHERE id = ?', [matsCheck[0].id]);
  }
  await db.query('DELETE FROM racks WHERE rack_code = ?', [testRack]);
  await db.query('DELETE FROM qr_codes WHERE barcode_id = ?', [qrJson.barcode_id]);

  console.log('\n--- ALL CAPACITY ENFORCEMENT INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  await db.end();
}

runTest().catch(async err => {
  console.error('Test encountered an error:', err);
  await db.end();
});
