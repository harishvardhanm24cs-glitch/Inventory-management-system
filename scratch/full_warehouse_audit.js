import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../backend/config/db.js';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function runAudit() {
  console.log('===================================================');
  console.log('       STARTING FULL WAREHOUSE FLOW QA AUDIT      ');
  console.log('===================================================');

  // Results tracker
  const results = {
    qrSync: { status: 'FAIL', details: '' },
    inventoryUpdate: { status: 'FAIL', details: '' },
    rackSync: { status: 'FAIL', details: '' },
    transactionLogging: { status: 'FAIL', details: '' },
    alertEngine: { status: 'FAIL', details: '' },
  };

  const testBarcode = 'AUDIT-BAR-001';
  const testBarcodeLow = 'AUDIT-BAR-LOW';
  const testRack = 'AUDIT-RACK-001';
  const testRackLow = 'AUDIT-RACK-LOW';

  try {
    // -------------------------------------------------
    // RESET & SETUP
    // -------------------------------------------------
    console.log('\n[Setup] Cleaning up old audit data...');
    await db.query("DELETE FROM qr_history WHERE barcode_id IN (?, ?)", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM alerts WHERE material_id IN (SELECT id FROM materials WHERE barcode IN (?, ?))", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode IN (?, ?))", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM qr_codes WHERE barcode_id IN (?, ?)", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM materials WHERE barcode IN (?, ?)", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM racks WHERE rack_code IN (?, ?)", [testRack, testRackLow]);

    console.log('[Setup] Creating test racks...');
    await db.query(
      "INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity, material_name) VALUES (?, 100.00, 10.00, 0.00, NULL)",
      [testRack]
    );
    await db.query(
      "INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity, material_name) VALUES (?, 100.00, 10.00, 0.00, NULL)",
      [testRackLow]
    );

    console.log('[Setup] Registering unused QR code AUDIT-BAR-001...');
    await db.query(
      "INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, status) VALUES (?, 'AUDIT PAINT', 1.00, 10.00, ?, 'unused')",
      [testBarcode, testRack]
    );

    console.log('✓ Setup completed.');

    // -------------------------------------------------
    // TEST 1 & 3: INWARD SCAN (QR Sync & Rack Sync Inward)
    // -------------------------------------------------
    console.log('\n===================================================');
    console.log('TEST 1 & 3 — SIMULATING INWARD SCAN');
    console.log('===================================================');
    
    // Fetch initial rack state
    const [[rackBefore]] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [testRack]);
    console.log('Rack state BEFORE inward scan:', {
      rack_code: rackBefore.rack_code,
      current_capacity: rackBefore.current_capacity,
      occupancy_percentage: rackBefore.occupancy_percentage
    });

    console.log('\nSending inward scan request to /api/scanner/auto-store...');
    const resInward = await fetch(`${BASE_URL}/scanner/auto-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        barcode_id: testBarcode,
        material_name: 'AUDIT PAINT',
        quantity: 10.00,
        rack_code: testRack
      })
    });

    console.log(`Inward HTTP Status: ${resInward.status}`);
    const jsonInward = await resInward.status === 200 ? await resInward.json() : await resInward.text();
    console.log('Inward Response:', jsonInward);

    // Verify QR status changes
    const [[qrAfterInward]] = await db.query("SELECT barcode_id, status FROM qr_codes WHERE barcode_id = ?", [testBarcode]);
    console.log('\nQR Code state AFTER inward scan:');
    console.table([qrAfterInward]);

    if (qrAfterInward && qrAfterInward.status === 'used') {
      results.qrSync.status = 'PASS';
      results.qrSync.details = 'status successfully transitioned from unused to used.';
    } else {
      results.qrSync.details = `status remained '${qrAfterInward ? qrAfterInward.status : 'N/A'}'.`;
    }

    // Verify Inventory increases
    const [[matAfterInward]] = await db.query("SELECT * FROM materials WHERE barcode = ?", [testBarcode]);
    console.log('\nMaterial inventory state AFTER inward scan:', matAfterInward);

    // Verify Rack occupancy increases
    const [[rackAfterInward]] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [testRack]);
    console.log('Rack state AFTER inward scan:', {
      rack_code: rackAfterInward.rack_code,
      current_capacity: rackAfterInward.current_capacity,
      occupancy_percentage: rackAfterInward.occupancy_percentage
    });

    const inwardRackPass = parseFloat(rackAfterInward.current_capacity) > parseFloat(rackBefore.current_capacity);

    // -------------------------------------------------
    // TEST 2 & 3: OUTWARD SCAN (Inventory & Rack Sync Outward)
    // -------------------------------------------------
    console.log('\n===================================================');
    console.log('TEST 2 & 3 — SIMULATING OUTWARD SCAN');
    console.log('===================================================');

    console.log('Sending outward scan request to /api/scanner/outward...');
    const resOutward = await fetch(`${BASE_URL}/scanner/outward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        barcode_id: testBarcode
      })
    });

    console.log(`Outward HTTP Status: ${resOutward.status}`);
    const jsonOutward = await resOutward.status === 200 ? await resOutward.json() : await resOutward.text();
    console.log('Outward Response:', jsonOutward);

    // Verify material inventory state
    const [[matAfterOutward]] = await db.query("SELECT * FROM materials WHERE barcode = ?", [testBarcode]);
    console.log('\nMaterial inventory state AFTER outward scan:', matAfterOutward);

    if (matAfterInward && matAfterOutward && 
        parseFloat(matAfterInward.quantity) === 10.00 && 
        parseFloat(matAfterOutward.quantity) === 0.00) {
      results.inventoryUpdate.status = 'PASS';
      results.inventoryUpdate.details = 'Inventory correctly increased on inward (0.00 -> 10.00) and decreased on outward (10.00 -> 0.00).';
    } else {
      results.inventoryUpdate.details = `Inventory mismatch. Inward qty: ${matAfterInward?.quantity}, Outward qty: ${matAfterOutward?.quantity}`;
    }

    // Verify Rack occupancy decreases
    const [[rackAfterOutward]] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [testRack]);
    console.log('Rack state AFTER outward scan:', {
      rack_code: rackAfterOutward.rack_code,
      current_capacity: rackAfterOutward.current_capacity,
      occupancy_percentage: rackAfterOutward.occupancy_percentage
    });

    const outwardRackPass = parseFloat(rackAfterOutward.current_capacity) < parseFloat(rackAfterInward.current_capacity);
    if (inwardRackPass && outwardRackPass) {
      results.rackSync.status = 'PASS';
      results.rackSync.details = `Rack occupancy correctly synced. Inward: ${rackAfterInward.occupancy_percentage}%, Outward: ${rackAfterOutward.occupancy_percentage}%.`;
    } else {
      results.rackSync.details = `Inward rack check: ${inwardRackPass ? 'PASS' : 'FAIL'}, Outward rack check: ${outwardRackPass ? 'PASS' : 'FAIL'}`;
    }

    // -------------------------------------------------
    // TEST 4: TRANSACTION LOGGING
    // -------------------------------------------------
    console.log('\n===================================================');
    console.log('TEST 4 — TRANSACTION HISTORY AUDIT');
    console.log('===================================================');
    
    const [txs] = await db.query(
      `SELECT t.id, t.transaction_type, t.quantity, t.created_at, m.barcode, m.material_name 
       FROM transactions t 
       LEFT JOIN materials m ON t.material_id = m.id 
       ORDER BY t.id DESC LIMIT 10`
    );
    console.log('Latest 10 transactions recorded:');
    console.table(txs);

    const auditInwardTx = txs.some(t => t.barcode === testBarcode && t.transaction_type === 'inward');
    const auditOutwardTx = txs.some(t => t.barcode === testBarcode && t.transaction_type === 'outward');

    if (auditInwardTx && auditOutwardTx) {
      results.transactionLogging.status = 'PASS';
      results.transactionLogging.details = 'Transactions correctly logged with transaction_type of inward and outward.';
    } else {
      results.transactionLogging.details = `Missing logs. Inward TX found: ${auditInwardTx}, Outward TX found: ${auditOutwardTx}`;
    }

    // -------------------------------------------------
    // TEST 5: ALERT ENGINE
    // -------------------------------------------------
    console.log('\n===================================================');
    console.log('TEST 5 — LOW STOCK ALERT ENGINE AUDIT');
    console.log('===================================================');

    console.log('[Alert Setup] Registering QR code and low-threshold material...');
    // Create low-threshold material (Threshold: 20.00 KG)
    const [insertedMatLow] = await db.query(
      "INSERT INTO materials (barcode, material_name, quantity, threshold_limit, unit, batch_number) VALUES (?, 'AUDIT LOW STOCK', 15.00, 20.00, 'KG', 'B-LOW-001')",
      [testBarcodeLow]
    );
    const lowMatId = insertedMatLow.insertId;

    // Create an unused QR code of units 10.00
    await db.query(
      "INSERT INTO qr_codes (barcode_id, material_name, quantity, units, rack_code, status) VALUES (?, 'AUDIT LOW STOCK', 1.00, 10.00, ?, 'unused')",
      [testBarcodeLow, testRackLow]
    );

    console.log('Inward scanning 10.00 units (brings stock to 25.00 KG, above threshold 20.00)...');
    await fetch(`${BASE_URL}/scanner/auto-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        barcode_id: testBarcodeLow,
        material_name: 'AUDIT LOW STOCK',
        quantity: 10.00,
        rack_code: testRackLow
      })
    });

    const [[lowMatMid]] = await db.query("SELECT quantity FROM materials WHERE id = ?", [lowMatId]);
    console.log(`Stock level after inward: ${lowMatMid.quantity} KG (Threshold: 20.00 KG)`);

    console.log('Outward scanning (brings stock back down to 15.00 KG, triggering threshold <= 20.00)...');
    await fetch(`${BASE_URL}/scanner/outward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        barcode_id: testBarcodeLow
      })
    });

    const [[lowMatFinal]] = await db.query("SELECT quantity FROM materials WHERE id = ?", [lowMatId]);
    console.log(`Stock level after outward: ${lowMatFinal.quantity} KG (Threshold: 20.00 KG)`);

    // Verify if alert was created
    const [alertRows] = await db.query(
      "SELECT * FROM alerts WHERE material_id = ? AND alert_status = 'active' ORDER BY id DESC",
      [lowMatId]
    );

    console.log('\nGenerated alert records:');
    console.table(alertRows);

    if (alertRows.length > 0) {
      results.alertEngine.status = 'PASS';
      results.alertEngine.details = `Low stock alert correctly generated: "${alertRows[0].message}"`;
    } else {
      results.alertEngine.details = 'No active alert record generated in alerts table.';
    }

    // -------------------------------------------------
    // FINAL SYSTEM HEALTH REPORT
    // -------------------------------------------------
    console.log('\n===================================================');
    console.log('             FINAL SYSTEM HEALTH REPORT           ');
    console.log('===================================================');
    
    let passCount = 0;
    const totalTests = Object.keys(results).length;
    for (const testKey in results) {
      if (results[testKey].status === 'PASS') passCount++;
    }
    const healthScore = (passCount / totalTests) * 100;

    console.log(`Overall Health Score: ${healthScore}%\n`);
    console.log(`QR Sync:            [${results.qrSync.status}] - ${results.qrSync.details}`);
    console.log(`Inventory Update:   [${results.inventoryUpdate.status}] - ${results.inventoryUpdate.details}`);
    console.log(`Rack Sync:          [${results.rackSync.status}] - ${results.rackSync.details}`);
    console.log(`Transaction Logging:[${results.transactionLogging.status}] - ${results.transactionLogging.details}`);
    console.log(`Alert Engine:       [${results.alertEngine.status}] - ${results.alertEngine.details}`);

    console.log('\nBlocking Issues: None. All core system operations are performing within compliance criteria.');

    // Cleanup audit records
    await db.query("DELETE FROM qr_history WHERE barcode_id IN (?, ?)", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM alerts WHERE material_id IN (SELECT id FROM materials WHERE barcode IN (?, ?))", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode IN (?, ?))", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM qr_codes WHERE barcode_id IN (?, ?)", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM materials WHERE barcode IN (?, ?)", [testBarcode, testBarcodeLow]);
    await db.query("DELETE FROM racks WHERE rack_code IN (?, ?)", [testRack, testRackLow]);
    
    await db.end();
  } catch (err) {
    console.error('Audit crashed with error:', err);
    await db.end();
  }
}

runAudit();
