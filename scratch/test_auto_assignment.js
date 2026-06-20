const port = process.env.PORT || 5000;
const baseURL = `http://localhost:${port}/api`;

async function testAutoAssignment() {
  const email = `test_assign_${Date.now()}@example.com`;
  const password = 'TestPassword123';
  const name = 'Scanner Validator';

  try {
    // 1. Register and Login to get Auth Token (Role: manager)
    console.log('Registering user...');
    await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'manager' })
    });

    console.log('Logging in...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    if (!token) throw new Error('Could not retrieve login token');

    // 2. Fetch current racks to see which ones are empty
    console.log('\nFetching current racks...');
    const racksResponse = await fetch(`${baseURL}/racks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const racksData = await racksResponse.json();
    console.log('Racks Count:', racksData.results || 0);

    let emptyRacks = (racksData.racks || []).filter(r => parseFloat(r.quantity) === 0);
    console.log('Empty Racks available:', emptyRacks.map(r => r.rack_code));

    let targetRack;
    if (emptyRacks.length === 0) {
      targetRack = `RACK-TEST-${Date.now()}`;
      console.log('No empty racks found. Creating a temporary empty rack for test:', targetRack);
      const createResponse = await fetch(`${baseURL}/racks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rack_code: targetRack,
          quantity: 0,
          max_capacity: 100,
          threshold_limit: 10
        })
      });
      const createData = await createResponse.json();
      console.log('Rack creation status:', createResponse.status, createData);
    } else {
      targetRack = emptyRacks[0].rack_code;
    }

    // Create a second empty rack to test Case B (Auto-assignment)
    const autoRackCode = `RACK-AUTO-${Date.now()}`;
    console.log('Creating second empty rack for auto-assignment test:', autoRackCode);
    const createAutoResponse = await fetch(`${baseURL}/racks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        rack_code: autoRackCode,
        quantity: 0,
        max_capacity: 100,
        threshold_limit: 10
      })
    });
    const createAutoData = await createAutoResponse.json();
    console.log('Second Rack creation status:', createAutoResponse.status, createAutoData);

    // 3. Test Case A: Scan QR WITH rack_code
    console.log('\n--- Test Case A: Scan QR WITH rack_code ---');
    const scanPayloadA = {
      material_name: 'Assigned Paint Blue',
      quantity: 15,
      batch_number: 'B-ASSIGN-A',
      manufacturing_date: '2026-06-12',
      rack_code: targetRack,
      barcode_id: `BARCODE-A-${Date.now()}`
    };

    console.log('Sending scan request for:', targetRack);
    const scanResponseA = await fetch(`${baseURL}/scanner/auto-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(scanPayloadA)
    });
    const scanDataA = await scanResponseA.json();
    console.log('Scan A Response Status:', scanResponseA.status);
    console.log('Scan A Response Data:', scanDataA);

    // 4. Test Case B: Scan QR WITHOUT rack_code (Auto assignment)
    console.log('\n--- Test Case B: Scan QR WITHOUT rack_code (Auto-Assign) ---');
    const scanPayloadB = {
      material_name: 'Auto Assigned Paint Red',
      quantity: 25,
      batch_number: 'B-ASSIGN-B',
      manufacturing_date: '2026-06-12',
      barcode_id: `BARCODE-B-${Date.now()}`
    };

    console.log('Sending scan request (rack_code omitted)...');
    const scanResponseB = await fetch(`${baseURL}/scanner/auto-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(scanPayloadB)
    });
    const scanDataB = await scanResponseB.json();
    console.log('Scan B Response Status:', scanResponseB.status);
    console.log('Scan B Response Data:', scanDataB);

    // 5. Final check: Fetch all racks to see if updates occurred correctly
    console.log('\nFetching racks after test...');
    const finalRacksRes = await fetch(`${baseURL}/racks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const finalRacksData = await finalRacksRes.json();
    const updatedRackA = finalRacksData.racks.find(r => r.rack_code === targetRack);
    const updatedRackB = finalRacksData.racks.find(r => r.rack_code === scanDataB.assigned_rack);

    console.log('\n--- Final Verification ---');
    console.log('Rack A Details (Explicit):', {
      rack_code: updatedRackA?.rack_code,
      material_name: updatedRackA?.material_name,
      quantity: updatedRackA?.quantity,
      occupancy_percentage: updatedRackA?.occupancy_percentage
    });
    console.log('Rack B Details (Auto-assigned):', {
      rack_code: updatedRackB?.rack_code,
      material_name: updatedRackB?.material_name,
      quantity: updatedRackB?.quantity,
      occupancy_percentage: updatedRackB?.occupancy_percentage
    });

    if (scanDataB.assigned_rack && updatedRackB && parseFloat(updatedRackB.quantity) === 25) {
      console.log('\nSUCCESS: Auto rack assignment verified successfully.');
    } else {
      console.log('\nFAILURE: Auto rack assignment verification failed.');
    }

  } catch (error) {
    console.error('Test run encountered error:', error);
  }
}

testAutoAssignment();
