import db from '../backend/config/db.js';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';
const token = jwt.sign({ id: 1, email: 'admin@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;

async function runAuditSimulation() {
  console.log('=== STARTING END-TO-END WAREHOUSE SYNCHRONIZATION AUDIT SIMULATION ===\n');

  // 1. Pick ONE existing material & barcode from DB
  const [existingMats] = await db.query(
    "SELECT m.id, m.barcode, m.material_name, m.quantity, m.unit, m.threshold_limit, q.rack_code, q.units, q.status AS qr_status " +
    "FROM materials m LEFT JOIN qr_codes q ON m.barcode = q.barcode_id " +
    "ORDER BY m.id DESC LIMIT 1"
  );

  if (existingMats.length === 0) {
    console.error('No materials found in database!');
    await db.end();
    return;
  }

  const mat = existingMats[0];
  console.log('Target Existing Material for Audit:', mat);

  const barcodeId = mat.barcode;
  const matName = mat.material_name;
  const initialMatQty = parseFloat(mat.quantity) || 0;
  
  // Find associated rack
  let targetRackCode = mat.rack_code;
  if (!targetRackCode) {
    const [rackRows] = await db.query("SELECT rack_code FROM racks WHERE material_name = ? LIMIT 1", [matName]);
    if (rackRows.length > 0) targetRackCode = rackRows[0].rack_code;
    else targetRackCode = 'A1';
  }

  // Get initial Rack State
  const [racksBefore] = await db.query("SELECT * FROM racks WHERE rack_code = ?", [targetRackCode]);
  const [invBefore] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [targetRackCode]);

  const initialRackQty = racksBefore.length > 0 ? parseFloat(racksBefore[0].quantity) || 0 : 0;
  const rackMaxCap = racksBefore.length > 0 ? parseFloat(racksBefore[0].max_capacity) || 999999999 : 999999999;
  const initialInvQty = invBefore.length > 0 ? parseFloat(invBefore[0].current_capacity) || 0 : 0;
  const initialOccupancy = invBefore.length > 0 ? parseFloat(invBefore[0].occupancy_percentage) || 0 : 0;

  console.log(`Initial Material Qty: ${initialMatQty} KG`);
  console.log(`Initial Rack Qty (racks table): ${initialRackQty} KG`);
  console.log(`Initial Rack Qty (rack_inventory table): ${initialInvQty} KG`);
  console.log(`Initial Occupancy % (rack_inventory): ${initialOccupancy}%`);

  // Ensure QR code exists and is valid for test or setup temporary test QR
  const [qrExists] = await db.query("SELECT * FROM qr_codes WHERE barcode_id = ?", [barcodeId]);
  if (qrExists.length === 0) {
    await db.query(
      "INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, status) VALUES (?, ?, 1.00, 100.00, ?, 'unused')",
      [barcodeId, matName, targetRackCode]
    );
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- SCAN 1: Inward Scan 100 kg ---
  console.log('\n--- SIMULATING INWARD SCAN 1 (100 kg) ---');
  let res1, json1;
  try {
    res1 = await fetch(`${BASE_URL}/scanner/auto-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({
        barcode_id: barcodeId,
        material_name: matName,
        quantity: 100.00,
        rack_code: targetRackCode
      })
    });
    json1 = await res1.json();
    console.log('Scan 1 HTTP Response:', res1.status, json1);
  } catch (err) {
    console.error('Scan 1 failed:', err.message);
  }

  await delay(1500);

  // Inspect state after Scan 1
  const [matAfter1] = await db.query("SELECT * FROM materials WHERE barcode = ?", [barcodeId]);
  const [rackAfter1] = await db.query("SELECT * FROM racks WHERE rack_code = ?", [targetRackCode]);
  const [invAfter1] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [targetRackCode]);
  const [txAfter1] = await db.query("SELECT * FROM transactions WHERE material_id = ? ORDER BY id DESC LIMIT 1", [mat.id]);

  const matQtyAfter1 = matAfter1.length > 0 ? parseFloat(matAfter1[0].quantity) || 0 : 0;
  const rackQtyAfter1 = rackAfter1.length > 0 ? parseFloat(rackAfter1[0].quantity) || 0 : 0;
  const invQtyAfter1 = invAfter1.length > 0 ? parseFloat(invAfter1[0].current_capacity) || 0 : 0;
  const occAfter1 = invAfter1.length > 0 ? parseFloat(invAfter1[0].occupancy_percentage) || 0 : 0;

  console.log(`State after Scan 1: Material Qty = ${matQtyAfter1} KG | Rack Qty = ${rackQtyAfter1} KG | Inv Qty = ${invQtyAfter1} KG | Occ = ${occAfter1}%`);

  // Wait for lock window (duplicate check is 5s, so we wait 5.5s or force query with distinct time/quantity if needed)
  console.log('Waiting 6s for duplicate prevention window to pass...');
  await delay(6000);

  // --- SCAN 2: Inward Scan 100 kg ---
  console.log('\n--- SIMULATING INWARD SCAN 2 (100 kg) ---');
  let res2, json2;
  try {
    res2 = await fetch(`${BASE_URL}/scanner/auto-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({
        barcode_id: barcodeId,
        material_name: matName,
        quantity: 100.00,
        rack_code: targetRackCode
      })
    });
    json2 = await res2.json();
    console.log('Scan 2 HTTP Response:', res2.status, json2);
  } catch (err) {
    console.error('Scan 2 failed:', err.message);
  }

  // Inspect state after Scan 2
  const [matAfter2] = await db.query("SELECT * FROM materials WHERE barcode = ?", [barcodeId]);
  const [rackAfter2] = await db.query("SELECT * FROM racks WHERE rack_code = ?", [targetRackCode]);
  const [invAfter2] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [targetRackCode]);
  const [txsAfter2] = await db.query("SELECT t.*, m.barcode FROM transactions t JOIN materials m ON t.material_id = m.id WHERE m.barcode = ? ORDER BY t.id DESC LIMIT 2", [barcodeId]);

  const matQtyAfter2 = matAfter2.length > 0 ? parseFloat(matAfter2[0].quantity) || 0 : 0;
  const rackQtyAfter2 = rackAfter2.length > 0 ? parseFloat(rackAfter2[0].quantity) || 0 : 0;
  const invQtyAfter2 = invAfter2.length > 0 ? parseFloat(invAfter2[0].current_capacity) || 0 : 0;
  const occAfter2 = invAfter2.length > 0 ? parseFloat(invAfter2[0].occupancy_percentage) || 0 : 0;

  console.log(`State after Scan 2: Material Qty = ${matQtyAfter2} KG | Rack Qty = ${rackQtyAfter2} KG | Inv Qty = ${invQtyAfter2} KG | Occ = ${occAfter2}%`);

  // --- API VERIFICATION ---
  console.log('\n--- TESTING DIGITAL TWIN & RACK VIEW APIs ---');
  let dtRes, rackInvRes, racksRes;
  try {
    const rDT = await fetch(`${BASE_URL}/digital-twin`, { headers: { 'Authorization': authHeader } });
    dtRes = await rDT.json();

    const rRackInv = await fetch(`${BASE_URL}/rack-inventory`, { headers: { 'Authorization': authHeader } });
    rackInvRes = await rRackInv.json();

    const rRacks = await fetch(`${BASE_URL}/racks`, { headers: { 'Authorization': authHeader } });
    racksRes = await rRacks.json();
  } catch (err) {
    console.error('API calls failed:', err.message);
  }

  console.log('Digital Twin API Status:', dtRes?.status, 'Racks count:', dtRes?.data?.length);
  console.log('Rack Inventory API Success:', rackInvRes?.success, 'Data count:', rackInvRes?.data?.length);
  console.log('Racks API Status:', racksRes?.status, 'Racks count:', racksRes?.racks?.length);

  // Inspect Digital Twin response for target rack
  const dtRack = dtRes?.data?.find(r => r.rack_code === targetRackCode);
  console.log('\nDigital Twin Target Rack Payload:', dtRack);

  // Inspect Rack Inventory response for target rack
  const riRack = rackInvRes?.data?.find(r => r.rack_code === targetRackCode);
  console.log('Rack Inventory Target Rack Payload:', riRack);

  // Inspect Racks response for target rack
  const rRack = racksRes?.racks?.find(r => r.rack_code === targetRackCode);
  console.log('Racks API Target Rack Payload:', rRack);

  // --- CLEANUP TEST TRANSACTIONS ---
  console.log('\n--- CLEANING UP TEMPORARY TEST TRANSACTIONS ---');
  // Revert material & rack quantities back to initial state
  await db.query("UPDATE materials SET quantity = ? WHERE barcode = ?", [initialMatQty, barcodeId]);
  await db.query("UPDATE racks SET quantity = ? WHERE rack_code = ?", [initialRackQty, targetRackCode]);
  await db.query("UPDATE rack_inventory SET current_capacity = ? WHERE rack_code = ?", [initialRackQty, targetRackCode]);

  // Remove test transactions created during audit
  if (txsAfter2.length > 0) {
    const txIds = txsAfter2.map(t => t.id);
    await db.query("DELETE FROM transactions WHERE id IN (?)", [txIds]);
    console.log(`Cleaned up temporary transactions: ${txIds.join(', ')}`);
  }

  console.log('Cleanup completed successfully.');
  await db.end();
}

runAuditSimulation().catch(err => {
  console.error('Audit simulation failed:', err);
  db.end();
});
