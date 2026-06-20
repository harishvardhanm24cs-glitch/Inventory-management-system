import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../backend/config/db.js';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function runAuditTest() {
  console.log('--- STARTING BULK QR INWARD AUDIT INTEGRATION TEST ---');
  
  // 1. Database Cleanup and Reset for PI003 (adjustStock test) and PI004 (autoStore test)
  console.log('\n[Step 1] Resetting database state for PI003 and PI004...');
  
  // Reset qr_codes status
  await db.query("UPDATE qr_codes SET status = 'unused', scanned_at = NULL, scanned_by = NULL WHERE barcode_id IN ('PI003', 'PI004')");
  
  // Delete existing transaction logs
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode IN ('PI003', 'PI004'))");
  
  // Delete existing QR history logs
  await db.query("DELETE FROM qr_history WHERE barcode_id IN ('PI003', 'PI004')");

  // Keep PI003 in materials, but reset its quantity to 30.00
  await db.query("UPDATE materials SET quantity = 30.00 WHERE barcode = 'PI003'");
  
  // Delete PI004 from materials to simulate initial inward of unregistered material
  await db.query("DELETE FROM materials WHERE barcode = 'PI004'");
  
  console.log('Database state initialized.');

  // Get material ID for PI003
  const [[pi003Mat]] = await db.query("SELECT id FROM materials WHERE barcode = 'PI003'");
  if (!pi003Mat) {
    console.error('❌ Error: PI003 material record not found in DB!');
    process.exit(1);
  }
  const pi003Id = pi003Mat.id;
  console.log(`PI003 material ID: ${pi003Id}`);

  // 2. Test autoStore (Path A) with PI004 (New barcode inward)
  console.log('\n[Step 2] Simulating autoStore scan for PI004 (New barcode)...');
  const resPI004 = await fetch(`${BASE_URL}/scanner/auto-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode_id: 'PI004',
      material_name: 'PINK',
      quantity: 30.00,
      rack_code: 'A2'
    })
  });
  console.log(`autoStore status (PI004): ${resPI004.status}`);
  const jsonPI004 = await resPI004.json();
  console.log('autoStore response:', jsonPI004);

  // 3. Test adjustStock (Path B) with PI003 (Existing barcode stock adjustment)
  console.log(`\n[Step 3] Simulating adjustStock scan for PI003 (Existing barcode, ID: ${pi003Id})...`);
  const resPI003 = await fetch(`${BASE_URL}/materials/${pi003Id}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      transaction_type: 'inward',
      quantity: 30.00
    })
  });
  console.log(`adjustStock status (PI003): ${resPI003.status}`);
  const jsonPI003 = await resPI003.json();
  console.log('adjustStock response:', jsonPI003);

  // 4. Verify Database State
  console.log('\n[Step 4] Verifying database states...');
  
  // Verify qr_codes status
  const [qrs] = await db.query("SELECT barcode_id, status FROM qr_codes WHERE barcode_id IN ('PI003', 'PI004')");
  console.log('QR codes status in DB:');
  console.table(qrs);
  
  const pi003Status = qrs.find(q => q.barcode_id === 'PI003')?.status;
  const pi004Status = qrs.find(q => q.barcode_id === 'PI004')?.status;
  
  if (pi003Status !== 'used' || pi004Status !== 'used') {
    console.error('❌ Failure: QR statuses were not updated to "used"!');
    process.exit(1);
  }
  console.log('✓ Success: QR statuses correctly updated to "used".');

  // Verify qr_history logs
  const [history] = await db.query("SELECT barcode_id, action, remarks FROM qr_history WHERE barcode_id IN ('PI003', 'PI004') ORDER BY id ASC");
  console.log('\nQR History logged:');
  console.table(history);

  const pi003History = history.filter(h => h.barcode_id === 'PI003');
  const pi004History = history.filter(h => h.barcode_id === 'PI004');

  if (pi003History.length < 2 || pi004History.length < 2) {
    console.error('❌ Failure: Missing SCANNED and/or INWARD history events!');
    process.exit(1);
  }
  console.log('✓ Success: SCANNED and INWARD history records logged.');

  // 5. Test duplicate inward prevention (PI004 autoStore path)
  console.log('\n[Step 5] Simulating duplicate autoStore scan for PI004 (expecting duplicate block)...');
  const resDupPI004 = await fetch(`${BASE_URL}/scanner/auto-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode_id: 'PI004',
      material_name: 'PINK',
      quantity: 30.00,
      rack_code: 'A2'
    })
  });
  const jsonDupPI004 = await resDupPI004.json();
  console.log('Duplicate response (autoStore):', jsonDupPI004);
  if (jsonDupPI004.status !== 'used' || jsonDupPI004.message !== 'This QR has already been processed.') {
    console.error('❌ Failure: Duplicate scan for PI004 was not blocked correctly!');
    process.exit(1);
  }
  console.log('✓ Success: Duplicate scan for PI004 was blocked.');

  // 6. Test duplicate inward prevention (PI003 adjustStock path)
  console.log('\n[Step 6] Simulating duplicate adjustStock scan for PI003 (expecting duplicate block)...');
  const resDupPI003 = await fetch(`${BASE_URL}/materials/${pi003Id}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      transaction_type: 'inward',
      quantity: 30.00
    })
  });
  const jsonDupPI003 = await resDupPI003.json();
  console.log('Duplicate response (adjustStock):', jsonDupPI003);
  if (jsonDupPI003.status !== 'used' || jsonDupPI003.message !== 'This QR has already been processed.') {
    console.error('❌ Failure: Duplicate scan for PI003 was not blocked correctly!');
    process.exit(1);
  }
  console.log('✓ Success: Duplicate scan for PI003 was blocked.');

  console.log('\n--- ALL AUDIT TESTS PASSED SUCCESSFULLY! ---');
  await db.end();
  process.exit(0);
}

runAuditTest().catch(async err => {
  console.error('❌ Test failed with error:', err);
  await db.end();
  process.exit(1);
});
