const port = process.env.PORT || 5000;
const baseURL = `http://localhost:${port}/api`;

async function runTests() {
  const email = `test_assign_api_${Date.now()}@example.com`;
  const password = 'TestPassword123';
  const name = 'API Tester';
  
  const createdRackIds = [];
  const createdMaterialIds = [];
  let authHeaders = {};
  let token = null;

  try {
    console.log('=== Step 1: User Registration & Login ===');
    console.log(`Registering user: ${email}...`);
    const regRes = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'manager' })
    });
    if (!regRes.ok) {
      throw new Error(`Registration failed: ${await regRes.text()}`);
    }

    console.log('Logging in...');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    if (!token) throw new Error('Could not retrieve login token');
    console.log('Login successful, token obtained.\n');

    authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    console.log('=== Step 2: Creating Test Materials & Racks ===');
    // Create Test Material 1 (unique name per run)
    const barcode1 = `BARCODE-CHEM-${Date.now()}`;
    const materialName1 = `Test Chemical X ${Date.now()}`;
    console.log(`Creating material 1: ${materialName1} (${barcode1})...`);
    const mat1Res = await fetch(`${baseURL}/materials`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        barcode: barcode1,
        material_name: materialName1,
        quantity: 50.00,
        threshold_limit: 5.00,
        unit: 'Liters',
        batch_number: 'B-CHEM-X'
      })
    });
    const mat1Data = await mat1Res.json();
    if (!mat1Res.ok) throw new Error(`Failed to create Material 1: ${JSON.stringify(mat1Data)}`);
    const materialId1 = mat1Data.material.id;
    createdMaterialIds.push(materialId1);
    console.log(`Material 1 created with ID: ${materialId1}\n`);

    // Create Test Material 2 (unique name per run)
    const barcode2 = `BARCODE-Y-${Date.now()}`;
    const materialName2 = `Different Chemical Y ${Date.now()}`;
    console.log(`Creating material 2: ${materialName2} (${barcode2})...`);
    const mat2Res = await fetch(`${baseURL}/materials`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        barcode: barcode2,
        material_name: materialName2,
        quantity: 30.00,
        threshold_limit: 5.00,
        unit: 'Liters',
        batch_number: 'B-CHEM-Y'
      })
    });
    const mat2Data = await mat2Res.json();
    const materialId2 = mat2Data.material.id;
    createdMaterialIds.push(materialId2);
    console.log(`Material 2 created with ID: ${materialId2}\n`);

    // Create Racks with different occupancies
    // Rack 1: RACK-LOW-1 (capacity: 100, current quantity: 10 of Test Chemical X -> 10% occupancy)
    const rackCodeLow = `RACK-LOW-${Date.now()}`;
    console.log(`Creating Rack 1 (10% occupancy): ${rackCodeLow}...`);
    const r1Res = await fetch(`${baseURL}/racks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rack_code: rackCodeLow,
        material_name: materialName1,
        batch_number: 'B-CHEM-X',
        quantity: 10.00,
        max_capacity: 100.00,
        threshold_limit: 5.00
      })
    });
    const r1Data = await r1Res.json();
    if (!r1Res.ok) throw new Error(`Failed to create Rack 1: ${JSON.stringify(r1Data)}`);
    createdRackIds.push(r1Data.rack.id);

    // Rack 2: RACK-HIGH-2 (capacity: 50, current quantity: 15 of Test Chemical X -> 30% occupancy)
    const rackCodeHigh = `RACK-HIGH-${Date.now()}`;
    console.log(`Creating Rack 2 (30% occupancy): ${rackCodeHigh}...`);
    const r2Res = await fetch(`${baseURL}/racks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rack_code: rackCodeHigh,
        material_name: materialName1,
        batch_number: 'B-CHEM-X',
        quantity: 15.00,
        max_capacity: 50.00,
        threshold_limit: 5.00
      })
    });
    const r2Data = await r2Res.json();
    if (!r2Res.ok) throw new Error(`Failed to create Rack 2: ${JSON.stringify(r2Data)}`);
    createdRackIds.push(r2Data.rack.id);
    console.log('Racks created successfully.\n');

    console.log('=== Step 3: Test Explicit Rack Assignment ===');
    console.log(`Assigning 5 units of Material 1 explicitly to ${rackCodeHigh}...`);
    const assignExplRes = await fetch(`${baseURL}/racks/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        material_id: materialId1,
        quantity: 5.00,
        rack_code: rackCodeHigh
      })
    });
    const assignExplData = await assignExplRes.json();
    console.log('Response Status:', assignExplRes.status);
    console.log('Response Data:', assignExplData);

    if (assignExplRes.ok && assignExplData.success && assignExplData.rack_code === rackCodeHigh) {
      console.log('✓ Explicit assignment test PASSED\n');
    } else {
      throw new Error(`Explicit assignment test FAILED: ${JSON.stringify(assignExplData)}`);
    }

    console.log('=== Step 4: Test Automatic Lowest-Occupancy Rack Assignment ===');
    // Fetch current racks before assigning to compute expected lowest occupancy rack dynamically
    const racksResBefore = await fetch(`${baseURL}/racks`, {
      headers: authHeaders
    });
    const racksDataBefore = await racksResBefore.json();
    const candidateRacks = (racksDataBefore.racks || []).filter(
      r => parseFloat(r.quantity) === 0 || r.material_name === materialName1
    );
    
    // Find candidate with lowest occupancy percentage
    let minOccupancy = Infinity;
    let expectedRackCodes = [];
    candidateRacks.forEach(r => {
      const occ = (parseFloat(r.quantity) || 0) / (parseFloat(r.max_capacity) || 100);
      if (occ < minOccupancy) {
        minOccupancy = occ;
        expectedRackCodes = [r.rack_code];
      } else if (occ === minOccupancy) {
        expectedRackCodes.push(r.rack_code);
      }
    });

    console.log(`Computed expected rack code(s) based on lowest occupancy (value: ${minOccupancy}): [${expectedRackCodes.join(', ')}]`);
    console.log(`Assigning 6 units of Material 1 automatically (no rack_code)...`);

    const assignAutoRes = await fetch(`${baseURL}/racks/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        material_id: materialId1,
        quantity: 6.00
      })
    });
    const assignAutoData = await assignAutoRes.json();
    console.log('Response Status:', assignAutoRes.status);
    console.log('Response Data:', assignAutoData);

    if (assignAutoRes.ok && assignAutoData.success && expectedRackCodes.includes(assignAutoData.rack_code)) {
      console.log(`✓ Auto assignment test PASSED (assigned to ${assignAutoData.rack_code})\n`);
    } else {
      throw new Error(`Auto assignment test FAILED. Expected one of: [${expectedRackCodes.join(', ')}], got: ${assignAutoData.rack_code}`);
    }

    const assignedRackCode = assignAutoData.rack_code;

    console.log('=== Step 5: Test Duplicate Request Prevention ===');
    console.log('Sending the exact same auto assignment request again immediately (within 5 seconds)...');
    const assignDupRes = await fetch(`${baseURL}/racks/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        material_id: materialId1,
        quantity: 6.00
      })
    });
    const assignDupData = await assignDupRes.json();
    console.log('Response Status:', assignDupRes.status);
    console.log('Response Data:', assignDupData);

    if (assignDupRes.ok && assignDupData.success && [rackCodeLow, rackCodeHigh].includes(assignDupData.rack_code) && assignDupData.message.includes('Duplicate')) {
      console.log(`✓ Duplicate assignment check PASSED (request successfully de-duplicated, returned valid rack_code: ${assignDupData.rack_code})\n`);
    } else {
      throw new Error(`Duplicate assignment test FAILED: ${JSON.stringify(assignDupData)}`);
    }

    console.log('=== Step 6: Test Conflict Detection (Same rack, different material) ===');
    console.log(`Trying to assign Material 2 (Different Chemical Y) explicitly to ${rackCodeLow} (which has Test Chemical X)...`);
    const assignConfRes = await fetch(`${baseURL}/racks/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        material_id: materialId2,
        quantity: 10.00,
        rack_code: rackCodeLow
      })
    });
    const assignConfData = await assignConfRes.json();
    console.log('Response Status (Expected 400):', assignConfRes.status);
    console.log('Response Data:', assignConfData);

    if (assignConfRes.status === 400 && assignConfData.status === 'error') {
      console.log('✓ Conflict detection test PASSED\n');
    } else {
      throw new Error(`Conflict detection test FAILED: status=${assignConfRes.status}, data=${JSON.stringify(assignConfData)}`);
    }

    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY! ===');

  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  } finally {
    if (token) {
      console.log('=== Cleanup: Deleting Test Racks & Materials ===');
      for (const rackId of createdRackIds) {
        try {
          console.log(`Deleting Rack ID: ${rackId}...`);
          await fetch(`${baseURL}/racks/${rackId}`, { method: 'DELETE', headers: authHeaders });
        } catch (e) {
          console.error(`Cleanup failed for rack ${rackId}:`, e.message);
        }
      }
      for (const matId of createdMaterialIds) {
        try {
          console.log(`Deleting Material ID: ${matId}...`);
          await fetch(`${baseURL}/materials/${matId}`, { method: 'DELETE', headers: authHeaders });
        } catch (e) {
          console.error(`Cleanup failed for material ${matId}:`, e.message);
        }
      }
    }
  }
}

runTests();
