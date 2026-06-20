import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './config/db.js';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function runOutwardTest() {
  console.log('Waiting for database migrations/servers to settle (3 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n--- STARTING OUTWARD SCAN ENGINE INTEGRATION TESTS ---');

  const testBarcode = 'OUTWARD-BAR-001';
  const testMatName = 'Outward Test Material';
  const testRackCode = 'RACK-OUTWARD-TEST-01';

  // 1. Cleanup
  console.log('Cleaning up old test data...');
  await db.query("DELETE FROM qr_history WHERE barcode_id = ?", [testBarcode]);
  await db.query("DELETE FROM alerts WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [testBarcode]);
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [testBarcode]);
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [testBarcode]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [testBarcode]);
  await db.query("DELETE FROM racks WHERE rack_code = ?", [testRackCode]);

  // Create a test rack
  console.log(`Creating test rack ${testRackCode}...`);
  await db.query(
    "INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity, material_name) VALUES (?, 100.00, 10.00, 50.00, ?)",
    [testRackCode, testMatName]
  );

  // Create a test material
  console.log(`Creating test material ${testMatName}...`);
  const [insertMat] = await db.query(
    "INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number) VALUES (?, ?, 50.00, 25.00, 'KG', 'B-OUT-001')",
    [testBarcode, testMatName]
  );
  const materialId = insertMat.insertId;

  // Create a test QR code marked as 'used' (meaning inwarded) with units = 20.00 (weight)
  console.log(`Creating test QR code ${testBarcode} with units/weight = 20.00...`);
  await db.query(
    "INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, status) VALUES (?, ?, 1.00, 20.00, ?, 'used')",
    [testBarcode, testMatName, testRackCode]
  );

  // Verify DB state before test
  const [[dbMatBefore]] = await db.query("SELECT quantity FROM materials WHERE id = ?", [materialId]);
  const [[dbRackBefore]] = await db.query("SELECT quantity FROM racks WHERE rack_code = ?", [testRackCode]);
  console.log(`Initial stock levels - Material: ${dbMatBefore.quantity} KG, Rack: ${dbRackBefore.quantity} KG`);

  // Test 1: Invalid barcode ID
  console.log('\n[Test 1] Testing invalid barcode ID...');
  const resInvalid = await fetch(`${BASE_URL}/scanner/outward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ barcode_id: 'NON-EXISTENT-BARCODE' })
  });
  console.log(`Response Status (Expected: 404): ${resInvalid.status}`);
  const jsonInvalid = await resInvalid.json();
  console.log('Error message:', jsonInvalid.message);
  if (resInvalid.status !== 404) {
    console.error('❌ Failure: Expected 404 for invalid barcode.');
    process.exit(1);
  }
  console.log('✓ Invalid barcode check passed!');

  // Test 2: Unused barcode ID (cannot outward since it hasn't been scanned/inwarded)
  const unusedBarcode = 'OUTWARD-BAR-UNUSED';
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [unusedBarcode]);
  await db.query(
    "INSERT INTO qr_codes (barcode_id, material_name, quantity, units, status) VALUES (?, ?, 1.00, 10.00, 'unused')",
    [unusedBarcode, testMatName]
  );
  console.log('\n[Test 2] Testing unused barcode ID...');
  const resUnused = await fetch(`${BASE_URL}/scanner/outward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ barcode_id: unusedBarcode })
  });
  console.log(`Response Status (Expected: 400): ${resUnused.status}`);
  const jsonUnused = await resUnused.json();
  console.log('Error message:', jsonUnused.message);
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [unusedBarcode]);
  if (resUnused.status !== 400) {
    console.error('❌ Failure: Expected 400 for unused barcode.');
    process.exit(1);
  }
  console.log('✓ Unused barcode check passed!');

  // Test 3: Successful Outward Scan
  console.log('\n[Test 3] Testing successful outward scan of 20 KG...');
  const resSuccess = await fetch(`${BASE_URL}/scanner/outward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ barcode_id: testBarcode })
  });
  console.log(`Response Status (Expected: 200): ${resSuccess.status}`);
  const jsonSuccess = await resSuccess.json();
  console.log('Success payload:', jsonSuccess);
  if (resSuccess.status !== 200 || !jsonSuccess.success) {
    console.error('❌ Failure: Outward scan endpoint failed!', jsonSuccess);
    process.exit(1);
  }

  // Verify stock levels in database
  const [[dbMatAfter]] = await db.query("SELECT quantity FROM materials WHERE id = ?", [materialId]);
  const [[dbRackAfter]] = await db.query("SELECT quantity FROM racks WHERE rack_code = ?", [testRackCode]);
  console.log(`Updated stock levels - Material (Expected: 30): ${dbMatAfter.quantity} KG, Rack (Expected: 30): ${dbRackAfter.quantity} KG`);
  if (parseFloat(dbMatAfter.quantity) !== 30.00 || parseFloat(dbRackAfter.quantity) !== 30.00) {
    console.error('❌ Failure: Stock levels were not updated correctly in materials/racks table.');
    process.exit(1);
  }

  // Verify transaction record was created
  const [txs] = await db.query("SELECT * FROM transactions WHERE material_id = ? ORDER BY id DESC LIMIT 1", [materialId]);
  console.log(`Transaction count: ${txs.length}`);
  if (txs.length === 0 || txs[0].transaction_type !== 'outward' || parseFloat(txs[0].quantity) !== 20.00) {
    console.error('❌ Failure: Outward transaction record was not created correctly.', txs);
    process.exit(1);
  }
  console.log(`✓ Transaction logged: id=${txs[0].id}, type=${txs[0].transaction_type}, qty=${txs[0].quantity}`);

  // Verify qr_history was logged
  const [history] = await db.query("SELECT * FROM qr_history WHERE barcode_id = ? AND action = 'OUTWARD' ORDER BY id DESC", [testBarcode]);
  console.log(`QR History action 'OUTWARD' count: ${history.length}`);
  if (history.length !== 1) {
    console.error('❌ Failure: QR History action not logged correctly.');
    process.exit(1);
  }
  console.log(`✓ QR History logged: action=${history[0].action}, rack_code=${history[0].rack_code}, remarks="${history[0].remarks}"`);
  console.log('✓ Successful outward scan verified!');

  // Test 4: Repeated outward scan accumulation
  console.log('\n[Test 4] Testing repeated outward scan (expecting further stock reduction)...');
  const resDuplicate = await fetch(`${BASE_URL}/scanner/outward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ barcode_id: testBarcode })
  });
  console.log(`Response Status (Expected: 200): ${resDuplicate.status}`);
  const jsonDuplicate = await resDuplicate.json();
  console.log('Repeated scan response:', jsonDuplicate);
  if (resDuplicate.status !== 200 || !jsonDuplicate.success) {
    console.error('❌ Failure: Repeated outward scan failed!');
    process.exit(1);
  }
  
  // Verify stock levels in database after second outward scan
  const [[dbMatAfterSecond]] = await db.query("SELECT quantity FROM materials WHERE id = ?", [materialId]);
  const [[dbRackAfterSecond]] = await db.query("SELECT quantity FROM racks WHERE rack_code = ?", [testRackCode]);
  console.log(`Updated stock levels after second scan - Material (Expected: 10): ${dbMatAfterSecond.quantity} KG, Rack (Expected: 10): ${dbRackAfterSecond.quantity} KG`);
  if (parseFloat(dbMatAfterSecond.quantity) !== 10.00 || parseFloat(dbRackAfterSecond.quantity) !== 10.00) {
    console.error('❌ Failure: Repeated outward scan did not correctly deduct stock from materials/racks table.');
    process.exit(1);
  }
  console.log('✓ Repeated outward scan verified!');

  // Test 5: Negative stock prevention
  const negativeBarcode = 'OUTWARD-BAR-NEG';
  await db.query("DELETE FROM qr_history WHERE barcode_id = ?", [negativeBarcode]);
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [negativeBarcode]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [negativeBarcode]);
  
  // Create material with 30 KG
  await db.query(
    "INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit) VALUES (?, ?, 30.00, 10.00, 'KG')",
    [negativeBarcode, testMatName]
  );
  // Create QR code with 500 KG units
  await db.query(
    "INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, status) VALUES (?, ?, 1.00, 500.00, ?, 'used')",
    [negativeBarcode, testMatName, testRackCode]
  );

  console.log('\n[Test 5] Testing negative stock prevention (trying to outward 500 KG with current stock 30 KG)...');
  const resNegative = await fetch(`${BASE_URL}/scanner/outward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ barcode_id: negativeBarcode })
  });
  console.log(`Response Status (Expected: 400): ${resNegative.status}`);
  const jsonNegative = await resNegative.json();
  console.log('Error message:', jsonNegative.message);
  
  // Clean up Test 5
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [negativeBarcode]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [negativeBarcode]);

  if (resNegative.status !== 400) {
    console.error('❌ Failure: Allowed negative stock.');
    process.exit(1);
  }
  console.log('✓ Negative stock prevention passed!');

  // Test 6: Threshold check alert triggering
  // Current stock is 30.00 KG, threshold_limit is 25.00 KG.
  // Outward another 10.00 KG makes stock 20.00 KG which is < threshold (25.00 KG).
  console.log('\n[Test 6] Testing threshold check alert triggering...');
  const alertBarcode = 'OUTWARD-BAR-ALERT';
  await db.query("DELETE FROM qr_history WHERE barcode_id = ?", [alertBarcode]);
  await db.query("DELETE FROM alerts WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [alertBarcode]);
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [alertBarcode]);
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [alertBarcode]);
  // Re-verify rack exists and has enough capacity for Test 6
  await db.query(
    "INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity, material_name) VALUES (?, 100.00, 10.00, 50.00, ?) ON DUPLICATE KEY UPDATE quantity = 50.00, material_name = ?",
    [testRackCode, testMatName, testMatName]
  );

  // Create material with 30 KG and threshold 25 KG
  await db.query(
    "INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit) VALUES (?, ?, 30.00, 25.00, 'KG')",
    [alertBarcode, testMatName]
  );
  // Create QR code with 15 KG units (leaving 15 KG stock, which is below 25 KG)
  await db.query(
    "INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, status) VALUES (?, ?, 1.00, 15.00, ?, 'used')",
    [alertBarcode, testMatName, testRackCode]
  );

  const resAlert = await fetch(`${BASE_URL}/scanner/outward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ barcode_id: alertBarcode })
  });
  console.log(`Response Status (Expected: 200): ${resAlert.status}`);
  const jsonAlert = await resAlert.json();
  
  // Fetch material ID for alertBarcode
  const [[dbMatAlert]] = await db.query("SELECT id FROM materials WHERE barcode = ?", [alertBarcode]);

  // Check alerts table for new alert
  const [alerts] = await db.query(
    "SELECT * FROM alerts WHERE material_id = ? AND alert_status = 'active' AND message LIKE 'Low Stock Warning%'",
    [dbMatAlert.id]
  );
  console.log(`Active alerts count (Expected: 1): ${alerts.length}`);
  
  // Clean up Test 6
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [alertBarcode]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [alertBarcode]);

  if (resAlert.status !== 200) {
    console.error('❌ Failure: Failed to process outward scan for alert check.', jsonAlert);
    process.exit(1);
  }

  if (alerts.length !== 1) {
    console.error('❌ Failure: Low stock alert was not created.');
    process.exit(1);
  }
  console.log(`✓ Active Alert Created: "${alerts[0].message}"`);
  console.log('✓ Threshold alert check passed!');

  // 4. Cleanup at end
  console.log('\nCleaning up test data...');
  await db.query("DELETE FROM qr_history WHERE barcode_id = ?", [testBarcode]);
  await db.query("DELETE FROM alerts WHERE material_id = ?", [materialId]);
  await db.query("DELETE FROM transactions WHERE material_id = ?", [materialId]);
  await db.query("DELETE FROM qr_codes WHERE barcode_id = ?", [testBarcode]);
  await db.query("DELETE FROM materials WHERE id = ?", [materialId]);
  await db.query("DELETE FROM racks WHERE rack_code = ?", [testRackCode]);

  console.log('\n--- ALL OUTWARD SCAN INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  await db.end();
  process.exit(0);
}

runOutwardTest().catch(async err => {
  console.error('❌ Test execution failed:', err);
  await db.end();
  process.exit(1);
});
