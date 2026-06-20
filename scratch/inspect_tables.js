import db from '../backend/config/db.js';

async function inspect() {
  try {
    const [qrCodesDesc] = await db.query("DESCRIBE qr_codes");
    console.log("--- DESCRIBE qr_codes ---");
    console.table(qrCodesDesc);

    const [qrHistoryDesc] = await db.query("DESCRIBE qr_history");
    console.log("--- DESCRIBE qr_history ---");
    console.table(qrHistoryDesc);

    const [materialsDesc] = await db.query("DESCRIBE materials");
    console.log("--- DESCRIBE materials ---");
    console.table(materialsDesc);

    db.end();
  } catch (err) {
    console.error(err);
    db.end();
  }
}

inspect();
