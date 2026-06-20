/**
 * test_rack_materials.js
 * Live verification script for GET /api/racks/:rackCode/materials
 * Generates a valid JWT, then hits each rack endpoint.
 */
import http from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'rm_secret_key';
const PORT = 5000;

// Generate a signed test token (same algorithm as the auth middleware)
const token = jwt.sign(
  { id: 1, role: 'manager', name: 'TestUser' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const rackCodes = ['A1', 'A2', 'B1', 'C3'];

function testRack(rackCode) {
  return new Promise((resolve) => {
    const options = {
      host: 'localhost',
      port: PORT,
      path: `/api/racks/${rackCode}/materials`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n========================================`);
        console.log(`GET /api/racks/${rackCode}/materials`);
        console.log(`HTTP Status : ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          console.log(`success     : ${parsed.success}`);
          console.log(`rack_code   : ${parsed.rack_code}`);
          console.log(`material_count: ${parsed.material_count}`);
          console.log(`total_weight: ${parsed.total_weight}`);
          console.log(`materials   : [${(parsed.materials || []).length} item(s)]`);
          if (parsed.message) console.log(`message     : ${parsed.message}`);
          const pass = res.statusCode === 200 && parsed.success === true;
          console.log(`RESULT      : ${pass ? '✅ PASS' : '❌ FAIL'}`);
        } catch (e) {
          console.log('Parse error:', e.message);
          console.log('Raw body:', data.substring(0, 500));
        }
        resolve();
      });
    });

    req.on('error', e => {
      console.log(`[${rackCode}] Connection error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

(async () => {
  console.log('=== Rack Materials API — Live Verification ===');
  console.log(`Server : http://localhost:${PORT}`);
  console.log(`Token  : (signed with JWT_SECRET)\n`);
  for (const code of rackCodes) {
    await testRack(code);
  }
  console.log('\n========================================');
  console.log('Verification complete.');
})();
