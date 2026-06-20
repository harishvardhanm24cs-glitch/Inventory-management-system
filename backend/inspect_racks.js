import db from './config/db.js';

async function inspectRacks() {
  const [racks] = await db.query('SELECT rack_code, max_capacity, quantity FROM racks');
  console.log('Racks table:');
  racks.forEach(r => {
    console.log(`- Rack: ${r.rack_code} | Max Capacity: ${r.max_capacity} | Quantity: ${r.quantity}`);
  });

  const [inv] = await db.query('SELECT rack_code, max_capacity, current_capacity, occupancy_percentage FROM rack_inventory');
  console.log('\nrack_inventory table:');
  inv.forEach(i => {
    console.log(`- Rack: ${i.rack_code} | Max Capacity: ${i.max_capacity} | Current Capacity: ${i.current_capacity} | Occupancy: ${i.occupancy_percentage}%`);
  });

  await db.end();
}

inspectRacks().catch(async err => {
  console.error(err);
  await db.end();
});
