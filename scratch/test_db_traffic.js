import db from '../backend/config/db.js';

async function testQuery() {
  console.log('--- DB Traffic Query Test ---');
  
  // Query 1: Today's High Traffic Rack
  const [trafficResult] = await db.query(`
    SELECT rack_code, COUNT(*) AS count
    FROM qr_history
    WHERE DATE(created_at) = CURDATE()
      AND rack_code IS NOT NULL
      AND rack_code != ''
      AND rack_code != 'Not Assigned'
      AND rack_code != 'Unassigned'
    GROUP BY rack_code
    ORDER BY count DESC
    LIMIT 1
  `);
  console.log('Today high traffic query result:', trafficResult);

  // Query 2: All-time High Traffic Rack (Fallback)
  const [fallbackResult] = await db.query(`
    SELECT rack_code, COUNT(*) AS count
    FROM qr_history
    WHERE rack_code IS NOT NULL
      AND rack_code != ''
      AND rack_code != 'Not Assigned'
      AND rack_code != 'Unassigned'
    GROUP BY rack_code
    ORDER BY count DESC
    LIMIT 1
  `);
  console.log('Fallback/All-time query result:', fallbackResult);

  await db.end();
}

testQuery().catch(async err => {
  console.error(err);
  await db.end();
});
