import db from './config/db.js';

async function checkColumns() {
  console.log('--- Starting Materials Table Column Verification ---');
  const connection = await db.getConnection();
  try {
    const [columns] = await connection.query('DESCRIBE materials');
    console.log('Columns in materials table:');
    columns.forEach(c => {
      console.log(`- ${c.Field} (${c.Type})`);
    });
    const colNames = columns.map(c => c.Field);
    if (colNames.includes('qr_data')) {
      console.log('\n>>> SUCCESS: qr_data column is present! <<<');
    } else {
      console.error('\n❌ FAILURE: qr_data column is missing!');
    }
  } catch (error) {
    console.error('\n❌ DESCRIBE failed:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

checkColumns();
