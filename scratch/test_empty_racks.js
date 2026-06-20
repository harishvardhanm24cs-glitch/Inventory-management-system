const port = process.env.PORT || 5000;
const baseURL = `http://localhost:${port}/api`;

async function runTests() {
  const email = `test_empty_racks_${Date.now()}@example.com`;
  const password = 'TestPassword123';
  const name = 'Empty Rack Tester';
  
  const createdRackIds = [];
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

    console.log('=== Step 2: Creating Test Racks ===');
    // Rack 1: EMPTY (quantity: 0)
    const rackCodeEmpty = `RACK-EMPTY-${Date.now()}`;
    console.log(`Creating Empty Rack: ${rackCodeEmpty}...`);
    const r1Res = await fetch(`${baseURL}/racks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rack_code: rackCodeEmpty,
        quantity: 0.00,
        max_capacity: 150.00,
        threshold_limit: 10.00
      })
    });
    const r1Data = await r1Res.json();
    if (!r1Res.ok) throw new Error(`Failed to create Empty Rack: ${JSON.stringify(r1Data)}`);
    createdRackIds.push(r1Data.rack.id);

    // Rack 2: NOT EMPTY (quantity: 40)
    const rackCodeNotEmpty = `RACK-FULL-${Date.now()}`;
    console.log(`Creating Non-Empty Rack: ${rackCodeNotEmpty}...`);
    const r2Res = await fetch(`${baseURL}/racks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rack_code: rackCodeNotEmpty,
        material_name: 'Test Paint Material',
        batch_number: 'B-101',
        quantity: 40.00,
        max_capacity: 100.00,
        threshold_limit: 10.00
      })
    });
    const r2Data = await r2Res.json();
    if (!r2Res.ok) throw new Error(`Failed to create Non-Empty Rack: ${JSON.stringify(r2Data)}`);
    createdRackIds.push(r2Data.rack.id);
    console.log('Racks created successfully.\n');

    console.log('=== Step 3: Fetching Empty Racks Endpoint ===');
    const emptyRacksRes = await fetch(`${baseURL}/racks/empty`, {
      headers: authHeaders
    });
    const emptyRacksData = await emptyRacksRes.json();
    console.log('Response Status:', emptyRacksRes.status);
    console.log('Found empty racks count:', emptyRacksData.results);

    const emptyRackCodes = (emptyRacksData.racks || []).map(r => r.rack_code);
    console.log('Empty Rack Codes in DB:', emptyRackCodes);

    const hasEmpty = emptyRackCodes.includes(rackCodeEmpty);
    const hasFull = emptyRackCodes.includes(rackCodeNotEmpty);

    if (hasEmpty && !hasFull) {
      console.log('✓ GET /api/racks/empty returns empty racks and excludes non-empty ones. PASSED!\n');
    } else {
      throw new Error(`Test failed: Empty rack included: ${hasEmpty}, Full rack included: ${hasFull}`);
    }

    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY! ===');

  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  } finally {
    if (token) {
      console.log('=== Cleanup: Deleting Test Racks ===');
      for (const rackId of createdRackIds) {
        try {
          console.log(`Deleting Rack ID: ${rackId}...`);
          await fetch(`${baseURL}/racks/${rackId}`, { method: 'DELETE', headers: authHeaders });
        } catch (e) {
          console.error(`Cleanup failed for rack ${rackId}:`, e.message);
        }
      }
    }
  }
}

runTests();
