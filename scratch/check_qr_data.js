import db from '../backend/config/db.js';

async function checkData() {
  try {
    const [historyRows] = await db.query("SELECT * FROM qr_history ORDER BY id DESC LIMIT 20");
    console.log("--- LATEST HISTORY ROWS ---");
    console.table(historyRows);

    const [qrCodes] = await db.query("SELECT * FROM qr_codes ORDER BY id DESC LIMIT 10");
    console.log("--- LATEST QR CODES ---");
    console.table(qrCodes);

    db.end();
  } catch (err) {
    console.error(err);
    db.end();
  }
}

checkData();
