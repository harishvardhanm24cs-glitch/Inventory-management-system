import db from '../backend/config/db.js';

async function updateCapacities() {
  try {
    console.log('Updating A1 and A2 max_capacity to 500.00...');
    
    // Update racks table
    const [resRacks] = await db.query(
      "UPDATE racks SET max_capacity = 500.00 WHERE rack_code IN ('A1', 'A2')"
    );
    console.log('racks update result:', resRacks.info || resRacks);

    // Update rack_inventory table
    const [resInv] = await db.query(
      "UPDATE rack_inventory SET max_capacity = 500.00, occupancy_percentage = (current_capacity / 500.00) * 100 WHERE rack_code IN ('A1', 'A2')"
    );
    console.log('rack_inventory update result:', resInv.info || resInv);

    // Verify
    const [racks] = await db.query("SELECT rack_code, max_capacity FROM racks WHERE rack_code IN ('A1', 'A2')");
    console.log('Current racks table values:', racks);

    const [inv] = await db.query("SELECT rack_code, max_capacity, occupancy_percentage FROM rack_inventory WHERE rack_code IN ('A1', 'A2')");
    console.log('Current rack_inventory table values:', inv);

    db.end();
  } catch (err) {
    console.error(err);
    db.end();
  }
}

updateCapacities();
