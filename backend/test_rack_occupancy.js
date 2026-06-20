import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './config/db.js';

dotenv.config();

// Setup JWT Auth Header
const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('Waiting for database migrations to settle (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('--- STARTING LIVE RACK OCCUPANCY INTEGRATION TESTS ---');
  
  // 1. Clean up any existing test data
  console.log('Cleaning up old test data...');
  const testBarcode = 'TEST-BARCODE-A1';
  const testMatName = 'Test Material A1';
  
  // Delete transactions for test materials
  await db.query("DELETE FROM transactions WHERE material_id IN (SELECT id FROM materials WHERE barcode = ?)", [testBarcode]);
  // Delete test materials
  await db.query("DELETE FROM materials WHERE barcode = ?", [testBarcode]);
  // Reset any racks assigned to our test material
  await db.query("UPDATE racks SET material_name = NULL, batch_number = NULL, quantity = 0.00 WHERE material_name = ?", [testMatName]);
  
  // Find or create a test rack
  const testRackCode = 'RACK-TEST-A1';
  const [existingRacks] = await db.query("SELECT id FROM racks WHERE rack_code = ?", [testRackCode]);
  if (existingRacks.length === 0) {
    console.log(`Creating test rack ${testRackCode}...`);
    await db.query("INSERT INTO racks (rack_code, max_capacity, threshold_limit, quantity) VALUES (?, 100.00, 10.00, 0.00)", [testRackCode]);
  } else {
    console.log(`Resetting test rack ${testRackCode}...`);
    await db.query("UPDATE racks SET material_name = NULL, batch_number = NULL, quantity = 0.00 WHERE rack_code = ?", [testRackCode]);
  }

  // Verify initial rack_inventory occupancy is 0%
  const [initialInv] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [testRackCode]);
  console.log(`Initial occupancy check for ${testRackCode} in rack_inventory:`);
  console.log(`- Current capacity: ${initialInv[0]?.current_capacity} (Expected: 0.00)`);
  console.log(`- Occupancy percentage: ${initialInv[0]?.occupancy_percentage}% (Expected: 0.00)`);
  if (parseFloat(initialInv[0]?.current_capacity) !== 0 || parseFloat(initialInv[0]?.occupancy_percentage) !== 0) {
    console.error('❌ Failure: Initial occupancy is not 0!');
    process.exit(1);
  }
  console.log('✓ Initial occupancy is 0%');

  // 2. Create material via POST /api/materials (Initial stock > 0)
  console.log('\nCreating test material via API...');
  const createResponse = await fetch(`${BASE_URL}/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      barcode: testBarcode,
      material_name: testMatName,
      quantity: 20.00,
      threshold_limit: 10.00,
      unit: 'KG',
      batch_number: 'B-TEST-123'
    })
  });

  const createResult = await createResponse.json();
  if (createResponse.status !== 201 || !createResult.material) {
    console.error('❌ Failure: Material creation failed!', createResult);
    process.exit(1);
  }

  const materialId = createResult.material.id;
  console.log(`✓ Material created successfully. ID: ${materialId}`);

  // 3. Verify Rack Sync: check if quantity & occupancy_percentage updated in rack_inventory
  // Find which rack the material was assigned to
  const [assignedRacks] = await db.query("SELECT * FROM racks WHERE material_name = ?", [testMatName]);
  if (assignedRacks.length === 0) {
    console.error('❌ Failure: Material was not assigned to any rack!');
    process.exit(1);
  }
  const assignedRackCode = assignedRacks[0].rack_code;
  const maxCapacity = parseFloat(assignedRacks[0].max_capacity) || 100.00;
  const expectedOcc1 = parseFloat(((20.00 / maxCapacity) * 100).toFixed(2));
  const expectedOcc2 = parseFloat(((35.00 / maxCapacity) * 100).toFixed(2));
  const expectedOcc3 = parseFloat(((25.00 / maxCapacity) * 100).toFixed(2));
  const expectedOcc4 = parseFloat(((50.00 / maxCapacity) * 100).toFixed(2));
  
  const expectedColor1 = expectedOcc1 > 80 ? 'RED' : expectedOcc1 > 40 ? 'YELLOW' : 'GREEN';
  const expectedColor4 = expectedOcc4 > 80 ? 'RED' : expectedOcc4 > 40 ? 'YELLOW' : 'GREEN';

  console.log(`Material assigned to rack: ${assignedRackCode}`);
  console.log(`- Rack status color: ${assignedRacks[0].status_color} (Expected: ${expectedColor1})`);
  if (assignedRacks[0].status_color !== expectedColor1) {
    console.error(`❌ Failure: Rack status color is not ${expectedColor1} at quantity 20.00.`);
    process.exit(1);
  }

  const [invCheck1] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [assignedRackCode]);
  console.log(`Verification 1: Check rack_inventory for ${assignedRackCode}:`);
  console.log(`- Current capacity: ${invCheck1[0]?.current_capacity} (Expected: 20.00)`);
  console.log(`- Occupancy percentage: ${invCheck1[0]?.occupancy_percentage}% (Expected: ${expectedOcc1})`);
  if (parseFloat(invCheck1[0]?.current_capacity) !== 20.00 || parseFloat(invCheck1[0]?.occupancy_percentage) !== expectedOcc1) {
    console.error('❌ Failure: Rack inventory occupancy did not sync correctly after material creation.');
    process.exit(1);
  }
  console.log(`✓ Rack inventory occupancy synchronized successfully to ${expectedOcc1}%`);

  // 4. Verify Rack API: check if occupancy_percentage is returned
  console.log('\nFetching racks via GET /api/racks...');
  const getRacksResponse = await fetch(`${BASE_URL}/racks`, {
    headers: { 'Authorization': authHeader }
  });
  const getRacksResult = await getRacksResponse.json();
  const rackApiRecord = getRacksResult.racks.find(r => r.rack_code === assignedRackCode);
  console.log('Rack API response record:');
  console.log(`- occupancy_percentage: ${rackApiRecord?.occupancy_percentage} (Expected: ${expectedOcc1})`);
  console.log(`- occupancyPercentage: ${rackApiRecord?.occupancyPercentage} (Expected: ${expectedOcc1})`);
  if (!rackApiRecord || parseFloat(rackApiRecord.occupancy_percentage) !== expectedOcc1) {
    console.error('❌ Failure: Rack API did not return correct occupancy percentage.');
    process.exit(1);
  }
  console.log('✓ Rack API returns correct occupancy percentage');

  // 5. Adjust Stock: Inward 15.00
  console.log('\nAdjusting stock: Inward 15.00...');
  const inwardResponse = await fetch(`${BASE_URL}/materials/${materialId}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      transaction_type: 'inward',
      quantity: 15.00
    })
  });
  const inwardResult = await inwardResponse.json();
  console.log('Inward Response Status:', inwardResponse.status);
  console.log('Inward Response Body:', inwardResult);
  console.log('Inward stock adjustment quantity:', inwardResult.material?.quantity);

  // Verify rack_inventory capacity is now 35.00
  const [invCheck2] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [assignedRackCode]);
  console.log(`Verification 2: Check rack_inventory for ${assignedRackCode}:`);
  console.log(`- Current capacity: ${invCheck2[0]?.current_capacity} (Expected: 35.00)`);
  console.log(`- Occupancy percentage: ${invCheck2[0]?.occupancy_percentage}% (Expected: ${expectedOcc2})`);
  if (parseFloat(invCheck2[0]?.current_capacity) !== 35.00 || parseFloat(invCheck2[0]?.occupancy_percentage) !== expectedOcc2) {
    console.error('❌ Failure: Rack inventory occupancy did not sync correctly after stock inward adjustment.');
    process.exit(1);
  }
  console.log(`✓ Rack inventory occupancy synchronized successfully to ${expectedOcc2}%`);

  // 6. Adjust Stock: Outward 10.00
  console.log('\nAdjusting stock: Outward 10.00...');
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
  const outwardResult = await outwardResponse.json();
  console.log('Outward stock adjustment quantity:', outwardResult.material?.quantity);

  // Verify rack_inventory capacity is now 25.00
  const [invCheck3] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [assignedRackCode]);
  console.log(`Verification 3: Check rack_inventory for ${assignedRackCode}:`);
  console.log(`- Current capacity: ${invCheck3[0]?.current_capacity} (Expected: 25.00)`);
  console.log(`- Occupancy percentage: ${invCheck3[0]?.occupancy_percentage}% (Expected: ${expectedOcc3})`);
  if (parseFloat(invCheck3[0]?.current_capacity) !== 25.00 || parseFloat(invCheck3[0]?.occupancy_percentage) !== expectedOcc3) {
    console.error('❌ Failure: Rack inventory occupancy did not sync correctly after stock outward adjustment.');
    process.exit(1);
  }
  console.log(`✓ Rack inventory occupancy synchronized successfully to ${expectedOcc3}%`);

  // 7. Update Material: Direct update to quantity 50.00
  console.log('\nUpdating material: set quantity directly to 50.00...');
  const updateResponse = await fetch(`${BASE_URL}/materials/${materialId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      quantity: 50.00
    })
  });
  const updateResult = await updateResponse.json();
  console.log('Direct update quantity:', updateResult.material?.quantity);

  // Verify rack_inventory capacity is now 50.00
  const [invCheck4] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [assignedRackCode]);
  console.log(`Verification 4: Check rack_inventory for ${assignedRackCode}:`);
  console.log(`- Current capacity: ${invCheck4[0]?.current_capacity} (Expected: 50.00)`);
  console.log(`- Occupancy percentage: ${invCheck4[0]?.occupancy_percentage}% (Expected: ${expectedOcc4})`);
  if (parseFloat(invCheck4[0]?.current_capacity) !== 50.00 || parseFloat(invCheck4[0]?.occupancy_percentage) !== expectedOcc4) {
    console.error('❌ Failure: Rack inventory occupancy did not sync correctly after direct material update.');
    process.exit(1);
  }
  
  const [rackCheck4] = await db.query("SELECT * FROM racks WHERE rack_code = ?", [assignedRackCode]);
  console.log(`- Rack status color: ${rackCheck4[0]?.status_color} (Expected: ${expectedColor4})`);
  if (rackCheck4[0]?.status_color !== expectedColor4) {
    console.error(`❌ Failure: Rack status color is not ${expectedColor4} at 50.00 KG quantity.`);
    process.exit(1);
  }
  console.log(`✓ Rack inventory occupancy synchronized successfully to ${expectedOcc4}% and status color is ${expectedColor4}`);

  // 8. Delete Material
  console.log('\nDeleting material...');
  const deleteResponse = await fetch(`${BASE_URL}/materials/${materialId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader
    }
  });
  const deleteResult = await deleteResponse.json();
  console.log('Delete response:', deleteResult.message);

  // Verify rack_inventory occupancy resets to 0% and rack is empty
  const [invCheck5] = await db.query("SELECT * FROM rack_inventory WHERE rack_code = ?", [assignedRackCode]);
  console.log(`Verification 5: Check rack_inventory for ${assignedRackCode}:`);
  console.log(`- Current capacity: ${invCheck5[0]?.current_capacity} (Expected: 0.00)`);
  console.log(`- Occupancy percentage: ${invCheck5[0]?.occupancy_percentage}% (Expected: 0.00)`);
  
  const [rackCheck5] = await db.query("SELECT * FROM racks WHERE rack_code = ?", [assignedRackCode]);
  console.log(`Verification 6: Check racks table for ${assignedRackCode}:`);
  console.log(`- Material name: ${rackCheck5[0]?.material_name} (Expected: NULL)`);
  console.log(`- Quantity: ${rackCheck5[0]?.quantity} (Expected: 0.00)`);

  if (parseFloat(invCheck5[0]?.current_capacity) !== 0 || parseFloat(invCheck5[0]?.occupancy_percentage) !== 0 || rackCheck5[0]?.material_name !== null || parseFloat(rackCheck5[0]?.quantity) !== 0) {
    console.error('❌ Failure: Rack occupancy or rack table details did not reset after material deletion.');
    process.exit(1);
  }
  console.log('✓ Rack details and occupancy successfully reset to 0% / NULL');

  console.log('\n--- ALL LIVE RACK OCCUPANCY SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  await db.end();
  process.exit(0);
}

runTest().catch(async err => {
  console.error('❌ Test execution failed:', err);
  await db.end();
  process.exit(1);
});
