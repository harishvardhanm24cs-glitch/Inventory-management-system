const port = process.env.PORT || 5000;
const baseURL = `http://localhost:${port}/api`;

async function testMaterialLocator() {
  const email = `locator_test_${Date.now()}@example.com`;
  const password = 'LocatorPassword123';
  const name = 'Locator Tester';

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

    console.log('=== Step 2: Query GET /api/material-locator ===');
    // Fetch all (empty query)
    const responseAll = await fetch(`${baseURL}/material-locator`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('HTTP Status (All):', responseAll.status);
    const resultAll = await responseAll.json();
    console.log('All results count:', resultAll.data?.length);
    console.log('First result sample:', JSON.stringify(resultAll.data?.[0], null, 2));

    // Fetch matching query (e.g. Paint)
    const searchTerm = 'paint';
    console.log(`\n=== Step 3: Query GET /api/material-locator?search=${searchTerm} ===`);
    const responseSearch = await fetch(`${baseURL}/material-locator?search=${searchTerm}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('HTTP Status (Search):', responseSearch.status);
    const resultSearch = await responseSearch.json();
    console.log(`Results for "${searchTerm}":`, resultSearch.data?.length);
    console.log('Search response data payload:', JSON.stringify(resultSearch.data, null, 2));

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testMaterialLocator();
