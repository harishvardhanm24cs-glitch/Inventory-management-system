import jwt from 'jsonwebtoken';
import db from '../backend/config/db.js';

// Setup JWT
const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;

async function runTest() {
  console.log('--- STARTING QR AUTOMATION TEST ---');
  
  // 1. Clean up old test data from database
  console.log('Cleaning up old test data...');
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode LIKE 'TP%')");
  await db.query("DELETE FROM materials WHERE barcode LIKE 'TP%'");
  await db.query("DELETE FROM qr_codes WHERE barcode_id LIKE 'TP%'");
  // Set rack TP-A1 to 0 quantity
  await db.query("UPDATE racks SET quantity = 0, material_name = NULL, batch_number = NULL WHERE rack_code = 'TP-A1'");
  
  // Create rack TP-A1 if not exists
  const [existingRacks] = await db.query("SELECT id FROM racks WHERE rack_code = 'TP-A1'");
  if (existingRacks.length === 0) {
    await db.query("INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity) VALUES ('TP-A1', 100.00, 10.00, 0.00)");
  }

  // 2. Call Bulk QR Generation API
  console.log('\nGenerating QR code via API...');
  const genResponse = await fetch('http://localhost:5000/api/qr/bulk-generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      material_name: 'Test Paint Product',
      quantity: 1, // 1 label
      units: 25.50, // 25.5 KG
      rack_code: 'TP-A1'
    })
  });
  
  const genResult = await genResponse.json();
  console.log('Generation Response:', genResult);
  
  if (!genResult.success || genResult.data.length === 0) {
    console.error('QR Generation failed!');
    process.exit(1);
  }
  
  const generatedBarcode = genResult.data[0].barcode_id;
  console.log(`Generated Barcode ID: ${generatedBarcode}`);

  // 3. Verify database state after generation (should be unused in qr_codes, not in materials)
  console.log('\nChecking database state after generation...');
  const [qrRows] = await db.query("SELECT * FROM qr_codes WHERE barcode_id = ?", [generatedBarcode]);
  console.log(`qr_codes status: ${qrRows[0]?.status} (expected: unused)`);
  
  const [matRows] = await db.query("SELECT * FROM materials WHERE barcode = ?", [generatedBarcode]);
  console.log(`materials row count: ${matRows.length} (expected: 0)`);
  
  if (qrRows[0]?.status !== 'unused' || matRows.length !== 0) {
    console.error('Database state verification after generation failed!');
    process.exit(1);
  }

  // 4. Scan the QR code (Auto Store API)
  console.log('\nScanning QR code (first time) via Auto Store API...');
  const scanResponse = await fetch('http://localhost:5000/api/scanner/auto-store', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode_id: generatedBarcode,
      material_name: 'Test Paint Product',
      quantity: 25.50,
      rack_code: 'TP-A1',
      batch_number: 'B-TEST-001'
    })
  });
  
  const scanResult = await scanResponse.json();
  console.log('Scan Response:', scanResult);
  
  if (!scanResult.success) {
    console.error('First scan failed!');
    process.exit(1);
  }

  // 5. Verify database state after scan (should be used in qr_codes, material exists, rack occupancy updated)
  console.log('\nChecking database state after scanning...');
  const [qrRows2] = await db.query("SELECT * FROM qr_codes WHERE barcode_id = ?", [generatedBarcode]);
  console.log(`qr_codes status: ${qrRows2[0]?.status} (expected: used)`);
  
  const [matRows2] = await db.query("SELECT * FROM materials WHERE barcode = ?", [generatedBarcode]);
  console.log(`materials quantity: ${matRows2[0]?.quantity} KG (expected: 25.50)`);
  
  const [rackRows] = await db.query("SELECT * FROM racks WHERE rack_code = 'TP-A1'");
  console.log(`rack status: quantity = ${rackRows[0]?.quantity} KG, status = ${rackRows[0]?.status}`);
  
  const [txRows] = await db.query("SELECT * FROM transactions WHERE material_id = ?", [matRows2[0]?.id]);
  console.log(`transactions logged: ${txRows.length} (expected: 1)`);

  if (qrRows2[0]?.status !== 'used' || parseFloat(matRows2[0]?.quantity) !== 25.50 || parseFloat(rackRows[0]?.quantity) !== 25.50 || txRows.length !== 1) {
    console.error('Database state verification after scanning failed!');
    process.exit(1);
  }

  // 6. Scan the QR code a second time (Duplicate scan test)
  console.log('\nScanning the same QR code again (duplicate scan)...');
  const scanResponse2 = await fetch('http://localhost:5000/api/scanner/auto-store', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode_id: generatedBarcode,
      material_name: 'Test Paint Product',
      quantity: 25.50,
      rack_code: 'TP-A1',
      batch_number: 'B-TEST-001'
    })
  });
  
  const scanResult2 = await scanResponse2.json();
  console.log('Duplicate Scan Response:', scanResult2);
  
  if (scanResult2.success === false && scanResult2.status === 'used' && scanResult2.message === 'This QR has already been processed.') {
    console.log('✓ Success: Duplicate scan was correctly blocked with warning: "This QR has already been processed."');
  } else {
    console.error('Verification failed: Duplicate scan was not blocked correctly!');
    process.exit(1);
  }

  console.log('\n--- ALL AUTOMATION TESTS PASSED SUCCESSFULLY! ---');
  db.end();
  process.exit(0);
}

runTest().catch(err => {
  console.error('Unhandled test error:', err);
  db.end();
  process.exit(1);
});
