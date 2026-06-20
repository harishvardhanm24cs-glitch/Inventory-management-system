import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './config/db.js';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function runAlertTest() {
  console.log('Waiting for database migrations to settle (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n--- STARTING RACK ALERT ENGINE INTEGRATION TESTS ---');

  // Test setup names
  const testBarcode = 'ALERT-BARCODE-001';
  const testMatName = 'Alert Test Material';
  const testRackCode = 'RACK-ALERT-TEST-A1';

  // 1. Cleanup
  console.log('Cleaning up old test data...');
  await db.query("DELETE FROM alerts WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [testBarcode]);
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [testBarcode]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [testBarcode]);
  await db.query("DELETE FROM racks WHERE rack_code = ?", [testRackCode]);
  await db.query("DELETE FROM alerts WHERE message LIKE ?", [`%${testRackCode}%`]);

  // Create a test rack with max_capacity = 100
  console.log(`Creating test rack ${testRackCode} with capacity 100...`);
  await db.query(
    "INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity) VALUES (?, 100.00, 10.00, 0.00)",
    [testRackCode]
  );

  // 2. Create material (Stock is 15, which is above threshold 10)
  console.log('\n[Test 1] Creating material above threshold...');
  const createResponse = await fetch(`${BASE_URL}/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode: testBarcode,
      material_name: testMatName,
      quantity: 15.00,
      threshold_limit: 10.00,
      unit: 'KG',
      batch_number: 'B-ALERT-999'
    })
  });

  const createResult = await createResponse.json();
  if (createResponse.status !== 201 || !createResult.material) {
    console.error('❌ Failure: Material creation failed!', createResult);
    process.exit(1);
  }
  const materialId = createResult.material.id;
  console.log(`✓ Material created successfully. ID: ${materialId}`);

  // Fetch the rack code assigned to this material automatically
  const [assignedRacks] = await db.query("SELECT rack_code FROM racks WHERE material_name = ?", [testMatName]);
  if (assignedRacks.length === 0) {
    console.error('❌ Failure: Material was not assigned to any rack!');
    process.exit(1);
  }
  const assignedRack = assignedRacks[0].rack_code;
  console.log(`Material was auto-assigned to rack: ${assignedRack}`);

  // Check alerts table (Should be empty for this material)
  const [alerts1] = await db.query("SELECT * FROM alerts WHERE material_id = ? AND alert_status = 'active'", [materialId]);
  console.log(`Active alerts count (Expected: 0): ${alerts1.length}`);
  if (alerts1.length !== 0) {
    console.error('❌ Failure: Active alerts found unexpectedly!');
    process.exit(1);
  }
  console.log('✓ No active alerts created when quantity is above threshold');

  // 3. Adjust stock below threshold (Adjust to 5, which is < threshold 10)
  console.log('\n[Test 2] Adjusting stock below threshold (Outward 10)...');
  const outwardResponse = await fetch(`${BASE_URL}/materials/${materialId}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      transaction_type: 'outward',
      quantity: 10.00
    })
  });
  if (outwardResponse.status !== 200) {
    console.error('❌ Failure: Stock adjustment failed!', await outwardResponse.text());
    process.exit(1);
  }

  // Check alerts table (Should contain active low stock alert)
  const [alerts2] = await db.query(
    "SELECT * FROM alerts WHERE material_id = ? AND message LIKE 'Low Stock Warning%' AND alert_status = 'active'",
    [materialId]
  );
  console.log(`Active alerts count (Expected: 1): ${alerts2.length}`);
  if (alerts2.length !== 1) {
    console.error('❌ Failure: Active low stock alert not created!');
    process.exit(1);
  }
  console.log(`✓ Active alert: "${alerts2[0].message}"`);

  // 4. Adjust stock above threshold (Inward 10, total 15, which is >= threshold 10)
  console.log('\n[Test 3] Adjusting stock back above threshold (Inward 10)...');
  const inwardResponse = await fetch(`${BASE_URL}/materials/${materialId}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      transaction_type: 'inward',
      quantity: 10.00
    })
  });
  if (inwardResponse.status !== 200) {
    console.error('❌ Failure: Stock adjustment failed!');
    process.exit(1);
  }

  // Check alerts table (Alert should be resolved)
  const [alerts3] = await db.query("SELECT * FROM alerts WHERE material_id = ? AND alert_status = 'active'", [materialId]);
  const [resolvedAlerts3] = await db.query(
    "SELECT * FROM alerts WHERE material_id = ? AND message LIKE 'Low Stock Warning%' AND alert_status = 'resolved'",
    [materialId]
  );
  console.log(`Active alerts count (Expected: 0): ${alerts3.length}`);
  console.log(`Resolved alerts count (Expected: 1): ${resolvedAlerts3.length}`);
  if (alerts3.length !== 0 || resolvedAlerts3.length !== 1) {
    console.error('❌ Failure: Low stock alert was not resolved correctly!');
    process.exit(1);
  }
  console.log('✓ Low stock alert resolved successfully!');

  // DELETE FIRST MATERIAL TO FREE UP THE RACK
  console.log('\n[Test 3.5] Deleting first material to free up test rack...');
  const delete1Res = await fetch(`${BASE_URL}/materials/${materialId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader
    }
  });
  if (delete1Res.status !== 200) {
    console.error('❌ Failure: Deleting first material failed!', await delete1Res.text());
    process.exit(1);
  }
  console.log('✓ First material deleted successfully, rack freed.');

  // 5. Test Rack Occupancy Alert (> 90%)
  const testBarcode2 = 'ALERT-BARCODE-002';
  const testMatName2 = 'Alert Test Material 2';

  console.log(`\n[Test 4] Testing rack occupancy alert (>90%) for rack ${testRackCode}...`);
  // Update rack to be assigned to testMatName2 initially with 5.00 quantity
  await db.query(
    "UPDATE racks SET material_name = ?, quantity = 5.00 WHERE rack_code = ?",
    [testMatName2, testRackCode]
  );
  
  // Cleanup for mat 2
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [testBarcode2]);
  await db.query("DELETE FROM materials WHERE barcode = ?", [testBarcode2]);

  console.log('Creating second material Alert Test Material 2...');
  const createMat2Response = await fetch(`${BASE_URL}/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode: testBarcode2,
      material_name: testMatName2,
      quantity: 5.00,
      threshold_limit: 10.00,
      unit: 'KG',
      batch_number: 'B-ALERT-888'
    })
  });
  const mat2Result = await createMat2Response.json();
  const mat2Id = mat2Result.material.id;

  console.log(`Assigning 95.00 quantity to rack ${testRackCode}...`);
  const assignResponse = await fetch(`${BASE_URL}/racks/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      material_id: mat2Id,
      quantity: 90.00, // Mat 2 initial is 5, adding 90 makes it 95 total on the rack
      rack_code: testRackCode
    })
  });
  if (assignResponse.status !== 200) {
    console.error('❌ Failure: Rack assignment failed!', await assignResponse.text());
    process.exit(1);
  }

  // Query rack_inventory to check occupancy_percentage is 95%
  const [rackInv] = await db.query("SELECT occupancy_percentage FROM rack_inventory WHERE rack_code = ?", [testRackCode]);
  console.log(`Rack occupancy percentage: ${rackInv[0]?.occupancy_percentage}%`);

  // Check alerts table (Should contain active rack almost full alert)
  const [alerts4] = await db.query(
    "SELECT * FROM alerts WHERE message LIKE ? AND alert_status = 'active'",
    [`%Rack Almost Full: Rack ${testRackCode}%`]
  );
  console.log(`Active rack occupancy alerts count (Expected: 1): ${alerts4.length}`);
  if (alerts4.length !== 1) {
    console.error('❌ Failure: Active rack occupancy alert not created!');
    process.exit(1);
  }
  console.log(`✓ Active rack alert: "${alerts4[0].message}"`);

  // 6. Adjust quantity on the rack back <= 90%
  console.log('\n[Test 5] Lowering rack occupancy <= 90% (Outward stock adjustment)...');
  // Mat 2 is at 95.00, adjustStock outward 15.00 makes it 80.00 (80% occupancy)
  const outwardMat2Response = await fetch(`${BASE_URL}/materials/${mat2Id}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      transaction_type: 'outward',
      quantity: 15.00
    })
  });
  if (outwardMat2Response.status !== 200) {
    console.error('❌ Failure: Mat 2 outward adjustment failed!', await outwardMat2Response.text());
    process.exit(1);
  }

  const resBody = await outwardMat2Response.json();
  console.log('Outward Response Body:', resBody);

  const [rackDetails] = await db.query("SELECT * FROM racks WHERE rack_code = ?", [testRackCode]);
  console.log('Rack Details in DB after outward:', rackDetails[0]);

  const [rackInv2] = await db.query("SELECT occupancy_percentage FROM rack_inventory WHERE rack_code = ?", [testRackCode]);
  console.log(`Rack occupancy percentage after outward: ${rackInv2[0]?.occupancy_percentage}%`);

  // Check alerts table (Alert should be resolved)
  const [alerts5] = await db.query(
    "SELECT * FROM alerts WHERE message LIKE ? AND alert_status = 'active'",
    [`%Rack Almost Full: Rack ${testRackCode}%`]
  );
  const [resolvedAlerts5] = await db.query(
    "SELECT * FROM alerts WHERE message LIKE ? AND alert_status = 'resolved'",
    [`%Rack Almost Full: Rack ${testRackCode}%`]
  );
  console.log(`Active rack occupancy alerts count (Expected: 0): ${alerts5.length}`);
  console.log(`Resolved rack occupancy alerts count (Expected: 1): ${resolvedAlerts5.length}`);
  if (alerts5.length !== 0 || resolvedAlerts5.length !== 1) {
    console.error('❌ Failure: Rack occupancy alert was not resolved correctly!');
    process.exit(1);
  }
  console.log('✓ Rack occupancy alert resolved successfully!');

  // 7. Delete Material containing alert and verify ON DELETE SET NULL on material_id
  console.log('\n[Test 6] Deleting material to test ON DELETE SET NULL constraint...');
  const deleteResponse = await fetch(`${BASE_URL}/materials/${mat2Id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader
    }
  });
  if (deleteResponse.status !== 200) {
    console.error('❌ Failure: Material deletion failed!');
    process.exit(1);
  }

  // Verify that the alert is still in the database but material_id is now NULL
  const [alerts6] = await db.query(
    "SELECT * FROM alerts WHERE message LIKE ? AND material_id IS NULL",
    [`%Rack ${testRackCode}%`]
  );
  console.log(`Alerts with NULL material_id count (Expected: >= 1): ${alerts6.length}`);
  if (alerts6.length === 0) {
    console.error('❌ Failure: Alert record was deleted or material_id is not NULL!');
    process.exit(1);
  }
  console.log('✓ Alert was preserved with material_id = NULL on material deletion.');

  // 8. Verify Warehouse Stats includes new metrics
  console.log('\n[Test 7] Verifying /api/warehouse/stats returns the new QR and Alert metrics...');
  const statsResponse = await fetch(`${BASE_URL}/warehouse/stats`, {
    headers: {
      'Authorization': authHeader
    }
  });
  if (statsResponse.status !== 200) {
    console.error('❌ Failure: Fetching warehouse stats failed!');
    process.exit(1);
  }
  const statsData = await statsResponse.json();
  console.log('Warehouse stats payload keys:', Object.keys(statsData));
  console.log('Warehouse stats data keys:', Object.keys(statsData.data || {}));
  
  if (
    statsData.totalQrCodes === undefined ||
    statsData.usedQrCodes === undefined ||
    statsData.unusedQrCodes === undefined ||
    statsData.criticalAlertsCount === undefined ||
    statsData.totalInventory === undefined ||
    statsData.data.total_qr_codes === undefined ||
    statsData.data.used_qr_codes === undefined ||
    statsData.data.unused_qr_codes === undefined ||
    statsData.data.critical_alerts_count === undefined ||
    statsData.data.total_inventory === undefined
  ) {
    console.error('❌ Failure: Warehouse stats response is missing the new QR, Alert, or Inventory fields!', statsData);
    process.exit(1);
  }
  console.log('✓ All new warehouse analytics properties are present in the response!');

  // 9. Test QR Code Traceability End-to-End Flow
  console.log('\n[Test 8] Testing QR Code Traceability End-to-End Flow...');
  
  // 9a. Generate QR Code
  const qrGenResponse = await fetch(`${BASE_URL}/generate-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      material_name: 'Trace Test Paint',
      weight: 45.50,
      batch_number: 'B-TRACE-777',
      manufacturing_date: '2026-06-12',
      rack_code: testRackCode
    })
  });
  if (qrGenResponse.status !== 201) {
    console.error('❌ Failure: QR generation failed!', await qrGenResponse.text());
    process.exit(1);
  }
  const qrGenData = await qrGenResponse.json();
  const traceBarcode = qrGenData.barcode_id;
  console.log(`✓ Generated trace QR Code with Barcode: ${traceBarcode}`);

  // 9b. Trace immediately (should be unused and no transactions)
  const trace1Response = await fetch(`${BASE_URL}/qr/trace/${traceBarcode}`, {
    headers: { 'Authorization': authHeader }
  });
  const trace1Data = await trace1Response.json();
  console.log('Unused trace response:', trace1Data);
  if (
    trace1Data.data.qrCode.status !== 'unused' || 
    trace1Data.data.qrCode.scanned_by_name !== null ||
    trace1Data.data.transactions.length !== 0
  ) {
    console.error('❌ Failure: Initial QR trace has incorrect status or transactions!');
    process.exit(1);
  }
  console.log('✓ Initial trace shows "unused" and empty transaction ledger');

  // 9c. Perform scan / auto-store to mark it used
  console.log('Scanning QR via auto-store...');
  const autoStoreResponse = await fetch(`${BASE_URL}/scanner/auto-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      material_name: 'Trace Test Paint',
      quantity: 45.50,
      batch_number: 'B-TRACE-777',
      rack_code: testRackCode,
      barcode_id: traceBarcode
    })
  });
  if (autoStoreResponse.status !== 200) {
    console.error('❌ Failure: Auto store scan failed!', await autoStoreResponse.text());
    process.exit(1);
  }

  // 9d. Trace again (should be used, scanned_by_name = "User" or similar, and 1 inward transaction)
  const trace2Response = await fetch(`${BASE_URL}/qr/trace/${traceBarcode}`, {
    headers: { 'Authorization': authHeader }
  });
  const trace2Data = await trace2Response.json();
  console.log('Used trace response:', trace2Data);
  if (
    trace2Data.data.qrCode.status !== 'used' || 
    trace2Data.data.qrCode.scanned_by_name === null ||
    trace2Data.data.transactions.length !== 1 ||
    trace2Data.data.transactions[0].transaction_type !== 'inward'
  ) {
    console.error('❌ Failure: Scanned QR trace did not update status, scan user, or transactions correctly!');
    process.exit(1);
  }
  console.log(`✓ Used trace verified! Status is used, scanned by: "${trace2Data.data.qrCode.scanned_by_name}", scan timestamp: ${trace2Data.data.qrCode.scanned_at}`);
  console.log(`✓ Ledger contains inward transaction logged by: "${trace2Data.data.transactions[0].user_name}"`);

  // Cleanup trace data
  const [createdMaterials] = await db.query('SELECT id FROM materials WHERE barcode = ?', [traceBarcode]);
  if (createdMaterials.length > 0) {
    const traceMatId = createdMaterials[0].id;
    await db.query('DELETE FROM transactions WHERE material_id = ?', [traceMatId]);
    await db.query('DELETE FROM materials WHERE id = ?', [traceMatId]);
  }
  await db.query('DELETE FROM qr_codes WHERE barcode_id = ?', [traceBarcode]);

  // 10. Test Digital Twin Warehouse API
  console.log('\n[Test 9] Testing Digital Twin Warehouse API...');
  const twinResponse = await fetch(`${BASE_URL}/digital-twin`, {
    headers: { 'Authorization': authHeader }
  });
  if (twinResponse.status !== 200) {
    console.error('❌ Failure: Fetching digital twin failed!', await twinResponse.text());
    process.exit(1);
  }
  const twinResult = await twinResponse.json();
  console.log('Digital Twin payload sample:', twinResult.data?.[0]);
  if (
    !Array.isArray(twinResult.data) ||
    twinResult.data.length === 0 ||
    twinResult.data[0].rack_code === undefined ||
    twinResult.data[0].rack_name === undefined ||
    twinResult.data[0].current_capacity === undefined ||
    twinResult.data[0].max_capacity === undefined ||
    twinResult.data[0].occupancy_percentage === undefined ||
    twinResult.data[0].status_color === undefined ||
    twinResult.data[0].material_count === undefined ||
    twinResult.data[0].materials === undefined
  ) {
    console.error('❌ Failure: Digital Twin API response structure is invalid!', twinResult);
    process.exit(1);
  }
  console.log('✓ Digital Twin API response contains all required fields!');

  // Clean up mat 2 and test mat
  await db.query("DELETE FROM alerts WHERE id IN (?)", [alerts6.map(a => a.id)]);
  await db.query("DELETE FROM materials WHERE id = ?", [materialId]);
  await db.query("DELETE FROM racks WHERE rack_code = ?", [testRackCode]);

  console.log('\n--- ALL RACK ALERT ENGINE INTEGRATION TESTS PASSED SUCCESSFULLY! ---');

  // Add 1 second delay to ensure nodemailer or database processes complete cleanly before process exit
  await new Promise(resolve => setTimeout(resolve, 1000));
  await db.end();
  process.exit(0);
}

runAlertTest().catch(async err => {
  console.error('❌ Test execution failed:', err);
  await db.end();
  process.exit(1);
});
