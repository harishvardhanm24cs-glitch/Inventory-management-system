import db from '../backend/config/db.js';

async function seedData() {
  console.log('Seeding traffic data...');
  
  // 1. Delete any today's mock data for A2 to keep it clean and exact
  await db.query(`
    DELETE FROM qr_history 
    WHERE rack_code = 'A2' AND DATE(created_at) = CURDATE()
  `);
  
  // 2. Insert 42 movement logs for today
  console.log('Inserting 42 logs for Rack A2 today...');
  for (let i = 0; i < 42; i++) {
    await db.query(
      'INSERT INTO qr_history (barcode_id, material_name, action, rack_code, remarks) VALUES (?, ?, ?, ?, ?)',
      ['BAR-MOCK-A2', 'Red Paint', 'MOVED', 'A2', `Auto-simulation movement log #${i+1}`]
    );
  }
  
  console.log('Done! 42 movements successfully seeded for Rack A2 today.');
  
  // 3. Query back to verify
  const [res] = await db.query(`
    SELECT rack_code, COUNT(*) AS count
    FROM qr_history
    WHERE DATE(created_at) = CURDATE() AND rack_code = 'A2'
  `);
  console.log('Verification query results:', res);
  
  await db.end();
}

seedData().catch(async err => {
  console.error('Seeding failed:', err);
  await db.end();
});
