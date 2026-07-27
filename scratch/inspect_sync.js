import db from '../backend/config/db.js';

async function inspect() {
  console.log('=== MYSQL TRIGGERS ===');
  const [triggers] = await db.query("SHOW TRIGGERS");
  console.log(triggers);

  console.log('\n=== ALL MATERIALS ===');
  const [materials] = await db.query("SELECT id, barcode, material_name, quantity, unit, threshold_limit FROM materials ORDER BY id DESC LIMIT 20");
  console.table(materials);

  console.log('\n=== ALL RACKS ===');
  const [racks] = await db.query("SELECT id, rack_code, material_name, quantity, max_capacity, threshold_limit FROM racks ORDER BY id DESC LIMIT 20");
  console.table(racks);

  console.log('\n=== ALL RACK_INVENTORY ===');
  const [rackInv] = await db.query("SELECT id, rack_code, current_capacity, max_capacity, occupancy_percentage, material_name FROM rack_inventory ORDER BY id DESC LIMIT 20");
  console.table(rackInv);

  await db.end();
}

inspect().catch(err => {
  console.error(err);
  db.end();
});
