import db from '../backend/config/db.js';

async function testTrace() {
  try {
    const barcode_id = 'PI020';
    
    // 1. Fetch QR code record and join with the user who scanned it
    const [qrRecords] = await db.query(
      `SELECT q.id, q.barcode_id, q.material_name, q.quantity, q.units, 
              COALESCE(q.rack_code, 'Not Assigned') AS rack_code, q.status, 
              q.scanned_at, u.name AS scanned_by_name, q.created_at,
              q.batch_number, q.manufacturing_date
       FROM qr_codes q
       LEFT JOIN users u ON q.scanned_by = u.id
       WHERE q.barcode_id = ?`,
      [barcode_id]
    );

    console.log("qrRecords:", qrRecords);

    // 2. Fetch transaction history of the associated material
    // We map barcode_id to materials.barcode
    const [materials] = await db.query(
      'SELECT id, quantity AS current_stock, unit FROM materials WHERE barcode = ?',
      [barcode_id]
    );

    console.log("materials:", materials);

    let transactions = [];
    let materialDetails = null;
    if (materials.length > 0) {
      materialDetails = materials[0];
      const materialId = materials[0].id;
      const [txs] = await db.query(
        `SELECT t.id, t.transaction_type, t.quantity, t.created_at, u.name AS user_name
         FROM transactions t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.material_id = ?
         ORDER BY t.created_at DESC`,
        [materialId]
      );
      transactions = txs;
    }

    console.log("materialDetails:", materialDetails);
    console.log("transactions count:", transactions.length);

    db.end();
  } catch (err) {
    console.error(err);
    db.end();
  }
}

testTrace();
