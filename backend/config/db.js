import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rm_system',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verify the connection pool and set up required tables
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    
    // Create users table if it doesn't exist
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('manager', 'worker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createUsersTableQuery);
    console.log('Users table verified/created successfully');
    
    // Create materials table
    const createMaterialsTableQuery = `
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode VARCHAR(255) UNIQUE NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 0.00,
        threshold_limit DECIMAL(10,2) DEFAULT 0.00,
        unit VARCHAR(50) NOT NULL,
        batch_number VARCHAR(100),
        qr_data TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createMaterialsTableQuery);
    console.log('Materials table verified/created successfully');

    // Auto-migration check: add qr_data column if table already exists without it
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM materials');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('qr_data')) {
        console.log('Adding qr_data column to materials table...');
        await connection.query('ALTER TABLE materials ADD COLUMN qr_data TEXT DEFAULT NULL AFTER batch_number');
      }
    } catch (e) {
      console.error('Failed to run materials schema migration:', e.message);
    }

    // Create transactions table
    const createTransactionsTableQuery = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL,
        transaction_type ENUM('inward', 'outward') NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await connection.query(createTransactionsTableQuery);
    console.log('Transactions table verified/created successfully');

    // Create alerts table
    const createAlertsTableQuery = `
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL,
        message VARCHAR(255) NOT NULL,
        alert_status ENUM('active', 'resolved') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await connection.query(createAlertsTableQuery);
    console.log('Alerts table verified/created successfully');
    
    // Drop old racks table if it has incompatible columns
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM racks');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('threshold_limit') || !colNames.includes('batch_number')) {
        console.log('Old/incompatible racks table detected. Dropping to recreate...');
        await connection.query('DROP TABLE IF EXISTS racks');
      }
    } catch (e) {
      // Table doesn't exist yet, which is fine
    }

    // Create racks table
    const createRacksTableQuery = `
      CREATE TABLE IF NOT EXISTS racks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rack_code VARCHAR(100) NOT NULL UNIQUE,
        material_name VARCHAR(255) DEFAULT NULL,
        batch_number VARCHAR(100) DEFAULT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        max_capacity DECIMAL(10,2) NOT NULL DEFAULT 100.00,
        threshold_limit DECIMAL(10,2) NOT NULL DEFAULT 10.00,
        status ENUM('healthy', 'warning', 'critical', 'empty') NOT NULL DEFAULT 'empty',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createRacksTableQuery);
    console.log('Racks table verified/created successfully');

    // Create before_rack_insert trigger
    await connection.query('DROP TRIGGER IF EXISTS before_rack_insert');
    const createInsertTriggerQuery = `
      CREATE TRIGGER before_rack_insert
      BEFORE INSERT ON racks
      FOR EACH ROW
      BEGIN
        IF NEW.quantity = 0 THEN
          SET NEW.status = 'empty';
        ELSEIF NEW.quantity < NEW.threshold_limit THEN
          SET NEW.status = 'critical';
        ELSEIF NEW.quantity <= NEW.threshold_limit * 1.2 THEN
          SET NEW.status = 'warning';
        ELSE
          SET NEW.status = 'healthy';
        END IF;
      END;
    `;
    await connection.query(createInsertTriggerQuery);

    // Create before_rack_update trigger
    await connection.query('DROP TRIGGER IF EXISTS before_rack_update');
    const createUpdateTriggerQuery = `
      CREATE TRIGGER before_rack_update
      BEFORE UPDATE ON racks
      FOR EACH ROW
      BEGIN
        IF NEW.quantity = 0 THEN
          SET NEW.status = 'empty';
        ELSEIF NEW.quantity < NEW.threshold_limit THEN
          SET NEW.status = 'critical';
        ELSEIF NEW.quantity <= NEW.threshold_limit * 1.2 THEN
          SET NEW.status = 'warning';
        ELSE
          SET NEW.status = 'healthy';
        END IF;
      END;
    `;
    await connection.query(createUpdateTriggerQuery);
    console.log('Racks status triggers verified/created successfully');
    
    connection.release();
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
})();

export default pool;
