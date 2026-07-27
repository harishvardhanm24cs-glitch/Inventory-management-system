import db from '../backend/config/db.js';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';
const token = jwt.sign({ id: 1, email: 'admin@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;

async function captureLiveApis() {
  console.log('=== CAPTURING LIVE API RESPONSES ===\n');

  try {
    // 1. Fetch /api/racks
    const rRacks = await fetch(`${BASE_URL}/racks`, { headers: { 'Authorization': authHeader } });
    const jsonRacks = await rRacks.json();

    // 2. Fetch /api/rack-inventory
    const rRackInv = await fetch(`${BASE_URL}/rack-inventory`, { headers: { 'Authorization': authHeader } });
    const jsonRackInv = await rRackInv.json();

    // 3. Fetch /api/digital-twin
    const rDT = await fetch(`${BASE_URL}/digital-twin`, { headers: { 'Authorization': authHeader } });
    const jsonDT = await rDT.json();

    console.log('--- GET /api/racks Response (Target Rack E3 / Cherry Red) ---');
    const rackE3 = jsonRacks?.racks?.find(r => r.rack_code === 'E3' || r.material_name === 'Cherry Red');
    console.log(JSON.stringify(rackE3, null, 2));

    console.log('\n--- GET /api/rack-inventory Response (Target Rack E3 / Cherry Red) ---');
    const invE3 = jsonRackInv?.data?.find(r => r.rack_code === 'E3' || r.material_name === 'Cherry Red');
    console.log(JSON.stringify(invE3, null, 2));

    console.log('\n--- GET /api/digital-twin Response (Target Rack E3 / Cherry Red) ---');
    const dtE3 = jsonDT?.data?.find(r => r.rack_code === 'E3' || r.materials?.some(m => m.material_name === 'Cherry Red'));
    console.log(JSON.stringify(dtE3, null, 2));

  } catch (err) {
    console.error('Failed to capture API response:', err.message);
  } finally {
    await db.end();
  }
}

captureLiveApis();
