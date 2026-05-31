require('dotenv').config();
const mysql = require('mysql2/promise');

const setupDatabase = async () => {
  console.log('🔌 Connecting to MySQL Server...');
  
  try {
    // Connect without a specific database to create it if it doesn't exist
    const pool = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
    });

    const dbName = process.env.DB_NAME || 'rm_system';
    console.log(`📦 Creating/Verifying database: ${dbName}...`);
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await pool.query(`USE \`${dbName}\``);

    console.log('👤 Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('manager', 'engineer', 'worker') NOT NULL DEFAULT 'worker',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('🏗️ Creating materials table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode VARCHAR(100) NOT NULL UNIQUE,
        material_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        threshold_limit DECIMAL(10, 2) DEFAULT 10.00,
        unit VARCHAR(50) DEFAULT 'kg',
        batch_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('📊 Creating transactions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL,
        user_id INT NOT NULL,
        type ENUM('inward', 'outward') NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        previous_stock DECIMAL(10, 2) NOT NULL,
        new_stock DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('⚠️ Creating alerts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL,
        message VARCHAR(255) NOT NULL,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database setup complete! All tables are ready. 🎉');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
};

setupDatabase();
