import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'manager' }, process.env.JWT_SECRET || 'rm_secret_key');
const authHeader = `Bearer ${token}`;
const BASE_URL = 'http://localhost:5000/api';

async function testScan() {
  console.log('--- Scanning PI001 ---');
  
  const payload = {
    barcode_id: 'PI001',
    material_name: 'PINK',
    quantity: 30.00,
    rack_code: 'A2'
  };

  const res = await fetch(`${BASE_URL}/scanner/auto-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(payload)
  });

  console.log(`Status: ${res.status}`);
  const json = await res.json();
  console.log('Response:', json);
}

testScan().catch(console.error);
