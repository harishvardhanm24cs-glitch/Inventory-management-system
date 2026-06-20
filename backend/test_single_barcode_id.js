import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './config/db.js';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function testBarcodeOnly() {
  console.log('Waiting 3 seconds for settlement...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('--- TESTING SCAN WITH ONLY barcode_id (PI020) ---');

  // Reset database state for PI020
  await db.query("UPDATE qr_codes SET status = 'unused', scanned_at = NULL, scanned_by = NULL WHERE barcode_id = 'PI020'");
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = 'PI020')");
  await db.query("DELETE FROM qr_history WHERE barcode_id = 'PI020'");
  await db.query("DELETE FROM materials WHERE barcode = 'PI020'");

  console.log('Sending payload: { "barcode_id": "PI020" }');
  
  const res = await fetch(`${BASE_URL}/scanner/auto-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode_id: 'PI020'
    })
  });

  console.log(`Response Status: ${res.status}`);
  const json = await res.json();
  console.log('Response body:', json);

  // Check state in DB
  const [[qr]] = await db.query("SELECT barcode_id, status FROM qr_codes WHERE barcode_id = 'PI020'");
  console.log('QR Code status in DB:', qr);

  const [mats] = await db.query("SELECT barcode, material_name, quantity FROM materials WHERE barcode = 'PI020'");
  console.log('Material created in DB:', mats);

  if (res.status === 200 && json.success && json.status === 'unused' && qr.status === 'unused' && mats.length > 0) {
    console.log('✓ SUCCESS: Inward scan with only barcode_id succeeded and status remained unused!');
  } else {
    console.error('❌ FAILURE: Inward scan failed or status was not unused!');
  }

  await db.end();
  process.exit(0);
}

testBarcodeOnly().catch(async err => {
  console.error(err);
  await db.end();
});
