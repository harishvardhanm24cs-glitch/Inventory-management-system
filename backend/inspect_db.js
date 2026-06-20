import db from './config/db.js';

async function inspectDb() {
  console.log('--- DB INSPECTION ---');
  
  // 1. Check qr_codes starting with PI or TP
  const [qrs] = await db.query(
    "SELECT id, barcode_id, material_name, quantity, units, status, rack_code FROM qr_codes WHERE barcode_id LIKE 'PI%' OR barcode_id LIKE 'TP%'"
  );
  console.log(`Found ${qrs.length} QR codes matching PI% or TP%:`);
  qrs.forEach(q => {
    console.log(`  ID: ${q.id} | Barcode: ${q.barcode_id} | Name: ${q.material_name} | Qty: ${q.quantity} | Units: ${q.units} | Status: ${q.status} | Rack: ${q.rack_code}`);
  });

  // 2. Check materials starting with PI or TP
  const [mats] = await db.query(
    "SELECT id, barcode, material_name, quantity FROM materials WHERE barcode LIKE 'PI%' OR barcode LIKE 'TP%'"
  );
  console.log(`\nFound ${mats.length} materials matching PI% or TP%:`);
  mats.forEach(m => {
    console.log(`  ID: ${m.id} | Barcode: ${m.barcode} | Name: ${m.material_name} | Qty: ${m.quantity}`);
  });

  // 3. Check qr_history for PI%
  const [history] = await db.query(
    "SELECT id, barcode_id, action, rack_code, remarks FROM qr_history WHERE barcode_id LIKE 'PI%' OR barcode_id LIKE 'TP%' ORDER BY id DESC LIMIT 20"
  );
  console.log(`\nFound ${history.length} history records:`);
  history.forEach(h => {
    console.log(`  ID: ${h.id} | Barcode: ${h.barcode_id} | Action: ${h.action} | Rack: ${h.rack_code} | Remarks: ${h.remarks}`);
  });

  await db.end();
}

inspectDb().catch(async err => {
  console.error(err);
  await db.end();
});
