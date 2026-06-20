const port = process.env.PORT || 5000;
const baseURL = `http://localhost:${port}/api`;

async function testRackInventory() {
  const email = `test_rack_inv_${Date.now()}@example.com`;
  const password = 'TestPassword123';
  const name = 'Rack Inv Tester';

  try {
    console.log('=== Step 1: Register and Login ===');
    console.log(`Registering user ${email}...`);
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
    const token = loginData.token;
    if (!token) throw new Error('Could not retrieve login token');
    console.log('Login successful.');

    console.log('=== Step 2: Fetching GET /api/rack-inventory ===');
    const response = await fetch(`${baseURL}/rack-inventory`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('HTTP Status:', response.status);
    const result = await response.json();
    console.log('API Response data structure keys:', Object.keys(result));
    console.log('Racks in data count:', result.data?.length);
    
    // Find A1 and A2
    const rackA1 = result.data?.find(r => r.rack_code === 'A1');
    const rackA2 = result.data?.find(r => r.rack_code === 'A2');

    console.log('\n=== Rack A1 Details in Response ===');
    console.log(JSON.stringify(rackA1, null, 2));

    console.log('\n=== Rack A2 Details in Response ===');
    console.log(JSON.stringify(rackA2, null, 2));

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testRackInventory();
