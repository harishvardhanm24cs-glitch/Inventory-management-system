const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Immediately test connection and handle errors gracefully
const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ MySQL Connected: ${connection.config.host} (DB: ${connection.config.database})`);
    connection.release();
  } catch (error) {
    console.error(`❌ Error connecting to MySQL: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

connectDB();

module.exports = pool;
