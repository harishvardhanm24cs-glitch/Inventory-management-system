import db from '../backend/config/db.js';

async function checkHistory() {
  try {
    const [historyRows] = await db.query("SELECT * FROM qr_history WHERE barcode_id = ? ORDER BY id ASC", ['PI020']);
    console.log("--- HISTORY ROWS FOR PI020 ---");
    console.table(historyRows);

    db.end();
  } catch (err) {
    console.error(err);
    db.end();
  }
}

checkHistory();
