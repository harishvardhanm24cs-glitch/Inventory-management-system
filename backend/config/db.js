import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    
    
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
    
    
    const createMaterialsTableQuery = `
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode VARCHAR(255) UNIQUE NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(20,2) DEFAULT 0.00,
        threshold_limit DECIMAL(20,2) DEFAULT 0.00,
        unit VARCHAR(50) NOT NULL,
        batch_number VARCHAR(100),
        qr_data TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createMaterialsTableQuery);
    console.log('Materials table verified/created successfully');

    
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

    
    const createTransactionsTableQuery = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL,
        transaction_type ENUM('inward', 'outward') NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        user_id INT NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `;
    await connection.query(createTransactionsTableQuery);
    console.log('Transactions table verified/created successfully');

    
    const createAlertsTableQuery = `
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NULL,
        message VARCHAR(255) NOT NULL,
        alert_status ENUM('active', 'resolved') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `;
    await connection.query(createAlertsTableQuery);
    console.log('Alerts table verified/created successfully');

    
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM alerts');
      const materialIdCol = columns.find(c => c.Field === 'material_id');
      if (materialIdCol && materialIdCol.Null === 'NO') {
        console.log('Modifying alerts table to make material_id nullable...');
        try {
          const [fks] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'alerts' 
            AND COLUMN_NAME = 'material_id'
          `);
          if (fks.length > 0) {
            await connection.query(`ALTER TABLE alerts DROP FOREIGN KEY ${fks[0].CONSTRAINT_NAME}`);
          }
        } catch (fkErr) {
          console.warn('Could not drop foreign key constraint on alerts:', fkErr.message);
        }
        await connection.query('ALTER TABLE alerts MODIFY COLUMN material_id INT NULL');
        await connection.query('ALTER TABLE alerts ADD CONSTRAINT fk_alerts_material_id FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL');
        console.log('alerts table successfully migrated to nullable material_id');
      }
    } catch (e) {
      console.error('Failed to run alerts schema migration:', e.message);
    }
    
    
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM racks');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('threshold_limit') || !colNames.includes('batch_number') || !colNames.includes('status_color')) {
        console.log('Old/incompatible racks table detected. Dropping to recreate...');
        await connection.query('DROP TABLE IF EXISTS racks');
      }
    } catch (e) {
      
    }

    
    const createRacksTableQuery = `
      CREATE TABLE IF NOT EXISTS racks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rack_code VARCHAR(100) NOT NULL UNIQUE,
        material_name VARCHAR(255) DEFAULT NULL,
        batch_number VARCHAR(100) DEFAULT NULL,
        quantity DECIMAL(20,2) NOT NULL DEFAULT 0.00,
        max_capacity DECIMAL(20,2) NOT NULL DEFAULT 999999999.00,
        threshold_limit DECIMAL(20,2) NOT NULL DEFAULT 10.00,
        status ENUM('healthy', 'warning', 'critical', 'empty') NOT NULL DEFAULT 'empty',
        status_color ENUM('GREEN', 'YELLOW', 'RED') NOT NULL DEFAULT 'GREEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createRacksTableQuery);
    console.log('Racks table verified/created successfully');

    
    const createQrCodesTableQuery = `
      CREATE TABLE IF NOT EXISTS qr_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode_id VARCHAR(255) UNIQUE NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 0.00,
        units DECIMAL(10,2) DEFAULT 0.00,
        rack_code VARCHAR(100) DEFAULT NULL,
        qr_data TEXT DEFAULT NULL,
        status ENUM('unused', 'used') NOT NULL DEFAULT 'unused',
        scanned_at TIMESTAMP NULL DEFAULT NULL,
        scanned_by INT NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `;
    await connection.query(createQrCodesTableQuery);
    console.log('qr_codes table verified/created successfully');

    
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM qr_codes');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('status')) {
        console.log('Adding status column to qr_codes table...');
        await connection.query("ALTER TABLE qr_codes ADD COLUMN status ENUM('unused', 'used') NOT NULL DEFAULT 'unused' AFTER qr_data");
      }
      if (!colNames.includes('scanned_at')) {
        console.log('Adding scanned_at column to qr_codes table...');
        await connection.query("ALTER TABLE qr_codes ADD COLUMN scanned_at TIMESTAMP NULL DEFAULT NULL AFTER status");
      }
      if (!colNames.includes('scanned_by')) {
        console.log('Adding scanned_by column to qr_codes table...');
        await connection.query("ALTER TABLE qr_codes ADD COLUMN scanned_by INT NULL DEFAULT NULL AFTER scanned_at");
        await connection.query("ALTER TABLE qr_codes ADD CONSTRAINT fk_qr_codes_scanned_by FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL");
      }
    } catch (e) {
      console.error('Failed to run qr_codes schema migration:', e.message);
    }

    
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM transactions');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('user_id')) {
        console.log('Adding user_id column to transactions table...');
        await connection.query("ALTER TABLE transactions ADD COLUMN user_id INT NULL DEFAULT NULL AFTER quantity");
        await connection.query("ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
      }
    } catch (e) {
      console.error('Failed to run transactions schema migration:', e.message);
    }

    
    await connection.query('DROP TRIGGER IF EXISTS before_rack_insert');
    const createInsertTriggerQuery = `
      CREATE TRIGGER before_rack_insert
      BEFORE INSERT ON racks
      FOR EACH ROW
      BEGIN
        DECLARE occ_pct DECIMAL(10,2);
        SET occ_pct = IF(NEW.max_capacity > 0, (NEW.quantity / NEW.max_capacity) * 100, 0.00);

        IF NEW.quantity = 0 THEN
          SET NEW.status = 'empty';
        ELSEIF NEW.quantity < NEW.threshold_limit THEN
          SET NEW.status = 'critical';
        ELSEIF NEW.quantity <= NEW.threshold_limit * 1.2 THEN
          SET NEW.status = 'warning';
        ELSE
          SET NEW.status = 'healthy';
        END IF;

        IF occ_pct > 80 THEN
          SET NEW.status_color = 'RED';
        ELSEIF occ_pct > 40 THEN
          SET NEW.status_color = 'YELLOW';
        ELSE
          SET NEW.status_color = 'GREEN';
        END IF;
      END;
    `;
    await connection.query(createInsertTriggerQuery);

    
    await connection.query('DROP TRIGGER IF EXISTS before_rack_update');
    const createUpdateTriggerQuery = `
      CREATE TRIGGER before_rack_update
      BEFORE UPDATE ON racks
      FOR EACH ROW
      BEGIN
        DECLARE occ_pct DECIMAL(10,2);
        SET occ_pct = IF(NEW.max_capacity > 0, (NEW.quantity / NEW.max_capacity) * 100, 0.00);

        IF NEW.quantity = 0 THEN
          SET NEW.status = 'empty';
        ELSEIF NEW.quantity < NEW.threshold_limit THEN
          SET NEW.status = 'critical';
        ELSEIF NEW.quantity <= NEW.threshold_limit * 1.2 THEN
          SET NEW.status = 'warning';
        ELSE
          SET NEW.status = 'healthy';
        END IF;

        IF occ_pct > 80 THEN
          SET NEW.status_color = 'RED';
        ELSEIF occ_pct > 40 THEN
          SET NEW.status_color = 'YELLOW';
        ELSE
          SET NEW.status_color = 'GREEN';
        END IF;
      END;
    `;
    await connection.query(createUpdateTriggerQuery);
    console.log('Racks status triggers verified/created successfully');

    
    const createRackInventoryTableQuery = `
      CREATE TABLE IF NOT EXISTS rack_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rack_code VARCHAR(100) NOT NULL UNIQUE,
        zone_name VARCHAR(100) NULL DEFAULT 'Storage',
        material_name VARCHAR(255) NULL DEFAULT NULL,
        max_capacity DECIMAL(20,2) NOT NULL DEFAULT 999999999.00,
        current_capacity DECIMAL(20,2) NOT NULL DEFAULT 0.00,
        occupancy_percentage DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createRackInventoryTableQuery);
    console.log('rack_inventory table verified/created successfully');

    
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM rack_inventory');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('zone_name')) {
        console.log('Adding zone_name column to rack_inventory...');
        await connection.query("ALTER TABLE rack_inventory ADD COLUMN zone_name VARCHAR(100) NULL DEFAULT 'Storage' AFTER rack_code");
      }
      if (!colNames.includes('material_name')) {
        console.log('Adding material_name column to rack_inventory...');
        await connection.query("ALTER TABLE rack_inventory ADD COLUMN material_name VARCHAR(255) NULL DEFAULT NULL AFTER zone_name");
      }
    } catch (e) {
      console.error('Failed to run rack_inventory schema migration:', e.message);
    }

    
    const createQrHistoryTableQuery = `
      CREATE TABLE IF NOT EXISTS qr_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode_id VARCHAR(255) NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        action ENUM('GENERATED', 'SCANNED', 'INWARD', 'OUTWARD', 'MOVED', 'USED') NOT NULL,
        rack_code VARCHAR(100) DEFAULT NULL,
        quantity DECIMAL(20,2) DEFAULT NULL,
        user_name VARCHAR(255) NOT NULL DEFAULT 'System',
        remarks TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createQrHistoryTableQuery);
    console.log('qr_history table verified/created successfully');

    
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM qr_history');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('quantity')) {
        console.log('Adding quantity column to qr_history table...');
        await connection.query("ALTER TABLE qr_history ADD COLUMN quantity DECIMAL(20,2) NULL DEFAULT NULL AFTER rack_code");
      }
    } catch (e) {
      console.error('Failed to run qr_history schema migration:', e.message);
    }

    
    const createRackOverloadHistoryTableQuery = `
      CREATE TABLE IF NOT EXISTS rack_overload_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rack_code VARCHAR(100) NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        attempted_quantity DECIMAL(10,2) NOT NULL,
        current_quantity DECIMAL(10,2) NOT NULL,
        max_capacity DECIMAL(10,2) NOT NULL,
        suggested_rack VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createRackOverloadHistoryTableQuery);
    console.log('rack_overload_history table verified/created successfully');

    
    const createAuditLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(255) NOT NULL,
        material_name VARCHAR(255) NULL DEFAULT NULL,
        qr_code VARCHAR(255) NULL DEFAULT NULL,
        rack_code VARCHAR(255) NULL DEFAULT NULL,
        user_name VARCHAR(255) NULL DEFAULT NULL,
        action_details TEXT NULL DEFAULT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createAuditLogsTableQuery);
    console.log('audit_logs table verified/created successfully');

    
    await connection.query(`
      INSERT INTO rack_inventory (rack_code, max_capacity, current_capacity, occupancy_percentage, zone_name, material_name)
      SELECT 
        rack_code, 
        max_capacity, 
        quantity AS current_capacity, 
        IF(max_capacity > 0, (quantity / max_capacity) * 100, 0.00) AS occupancy_percentage,
        CASE 
          WHEN rack_code REGEXP '^C[0-9]+' THEN 'Dispatch'
          ELSE 'Storage'
        END AS zone_name,
        material_name
      FROM racks
      ON DUPLICATE KEY UPDATE
        max_capacity = VALUES(max_capacity),
        current_capacity = VALUES(current_capacity),
        occupancy_percentage = VALUES(occupancy_percentage),
        zone_name = VALUES(zone_name),
        material_name = VALUES(material_name)
    `);
    console.log('rack_inventory synchronized with existing racks');

    
    await connection.query('DROP TRIGGER IF EXISTS after_rack_insert');
    await connection.query(`
      CREATE TRIGGER after_rack_insert
      AFTER INSERT ON racks
      FOR EACH ROW
      BEGIN
        DECLARE occ_pct DECIMAL(10,2);
        DECLARE zone_val VARCHAR(100);
        SET occ_pct = IF(NEW.max_capacity > 0, (NEW.quantity / NEW.max_capacity) * 100, 0.00);
        IF NEW.rack_code REGEXP '^C[0-9]+' THEN
          SET zone_val = 'Dispatch';
        ELSE
          SET zone_val = 'Storage';
        END IF;
        INSERT INTO rack_inventory (rack_code, max_capacity, current_capacity, occupancy_percentage, zone_name, material_name)
        VALUES (NEW.rack_code, NEW.max_capacity, NEW.quantity, occ_pct, zone_val, NEW.material_name)
        ON DUPLICATE KEY UPDATE
          max_capacity = VALUES(max_capacity),
          current_capacity = VALUES(current_capacity),
          occupancy_percentage = VALUES(occupancy_percentage),
          zone_name = VALUES(zone_name),
          material_name = VALUES(material_name);
      END;
    `);

    await connection.query('DROP TRIGGER IF EXISTS after_rack_update');
    await connection.query(`
      CREATE TRIGGER after_rack_update
      AFTER UPDATE ON racks
      FOR EACH ROW
      BEGIN
        DECLARE occ_pct DECIMAL(10,2);
        DECLARE zone_val VARCHAR(100);
        SET occ_pct = IF(NEW.max_capacity > 0, (NEW.quantity / NEW.max_capacity) * 100, 0.00);
        IF NEW.rack_code REGEXP '^C[0-9]+' THEN
          SET zone_val = 'Dispatch';
        ELSE
          SET zone_val = 'Storage';
        END IF;
        INSERT INTO rack_inventory (rack_code, max_capacity, current_capacity, occupancy_percentage, zone_name, material_name)
        VALUES (NEW.rack_code, NEW.max_capacity, NEW.quantity, occ_pct, zone_val, NEW.material_name)
        ON DUPLICATE KEY UPDATE
          max_capacity = VALUES(max_capacity),
          current_capacity = VALUES(current_capacity),
          occupancy_percentage = VALUES(occupancy_percentage),
          zone_name = VALUES(zone_name),
          material_name = VALUES(material_name);
      END;
    `);

    await connection.query('DROP TRIGGER IF EXISTS after_rack_delete');
    await connection.query(`
      CREATE TRIGGER after_rack_delete
      AFTER DELETE ON racks
      FOR EACH ROW
      BEGIN
        DELETE FROM rack_inventory WHERE rack_code = OLD.rack_code;
      END;
    `);
    console.log('rack_inventory synchronization triggers verified/created successfully');

    
    const createTrainingDatasetTableQuery = `
      CREATE TABLE IF NOT EXISTS training_dataset (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT,
        material_id INT NOT NULL,
        quantity DECIMAL(20,2) NOT NULL,
        movement_type VARCHAR(50) NOT NULL,
        transaction_timestamp DATETIME NOT NULL,
        ai_features JSON NOT NULL,
        validation_status VARCHAR(20) NOT NULL DEFAULT 'VALIDATED',
        validation_reason VARCHAR(255) NULL DEFAULT NULL,
        collection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dataset_version VARCHAR(50) DEFAULT '2026.07.001',
        hash_signature VARCHAR(64) UNIQUE NOT NULL
      ) ENGINE=InnoDB;
    `;
    await connection.query(createTrainingDatasetTableQuery);
    console.log('training_dataset table verified/created successfully');

    
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM training_dataset');
      const colNames = columns.map(c => c.Field);
      if (!colNames.includes('validation_reason')) {
        console.log('Adding validation_reason column to training_dataset table...');
        await connection.query('ALTER TABLE training_dataset ADD COLUMN validation_reason VARCHAR(255) NULL DEFAULT NULL AFTER validation_status');
      }
    } catch (e) {
      console.error('Failed to run training_dataset schema migration:', e.message);
    }

    
    const createDatasetVersionsTableQuery = `
      CREATE TABLE IF NOT EXISTS dataset_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version_tag VARCHAR(50) UNIQUE NOT NULL,
        total_records INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createDatasetVersionsTableQuery);
    console.log('dataset_versions table verified/created successfully');

    
    const createDatasetRegistryTableQuery = `
      CREATE TABLE IF NOT EXISTS dataset_registry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dataset_id VARCHAR(100) UNIQUE NOT NULL,
        dataset_version VARCHAR(50) UNIQUE NOT NULL,
        dataset_name VARCHAR(150) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) DEFAULT 'SYSTEM',
        description TEXT,
        source VARCHAR(100) DEFAULT 'CONTINUOUS_PIPELINE',
        record_count INT DEFAULT 0,
        feature_count INT DEFAULT 12,
        validation_rate DECIMAL(5,2) DEFAULT 100.00,
        duplicate_count INT DEFAULT 0,
        rejected_count INT DEFAULT 0,
        checksum VARCHAR(64) NOT NULL,
        storage_path VARCHAR(255) NOT NULL,
        snapshot_path VARCHAR(255),
        collection_start DATETIME,
        collection_end DATETIME,
        integrity_status VARCHAR(20) DEFAULT 'VERIFIED',
        last_verified DATETIME,
        archive_date DATETIME,
        restore_date DATETIME,
        is_selected TINYINT(1) DEFAULT 0,
        notes TEXT
      ) ENGINE=InnoDB;
    `;
    await connection.query(createDatasetRegistryTableQuery);
    console.log('dataset_registry table verified/created successfully');

    
    const createDatasetHistoryTableQuery = `
      CREATE TABLE IF NOT EXISTS dataset_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dataset_version VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        actor VARCHAR(100) DEFAULT 'SYSTEM',
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createDatasetHistoryTableQuery);
    console.log('dataset_history table verified/created successfully');

    
    const createModelRegistryTableQuery = `
      CREATE TABLE IF NOT EXISTS model_registry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        model_id VARCHAR(100) UNIQUE NOT NULL,
        model_name VARCHAR(150) NOT NULL,
        model_version VARCHAR(50) UNIQUE NOT NULL,
        algorithm VARCHAR(100) NOT NULL,
        dataset_version VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DEVELOPMENT',
        is_production TINYINT(1) DEFAULT 0,
        artifact_path VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        training_date DATETIME NOT NULL,
        mae DECIMAL(10,4) DEFAULT 0.0000,
        rmse DECIMAL(10,4) DEFAULT 0.0000,
        r2_score DECIMAL(6,4) DEFAULT 0.0000,
        cv_score DECIMAL(6,4) DEFAULT 0.0000,
        feature_count INT DEFAULT 12,
        sample_count INT DEFAULT 0,
        training_duration DECIMAL(10,2) DEFAULT 0.00,
        model_size INT DEFAULT 0,
        created_by VARCHAR(100) DEFAULT 'SYSTEM',
        description TEXT,
        tags VARCHAR(255),
        features_json JSON,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createModelRegistryTableQuery);
    try {
      await connection.query('ALTER TABLE model_registry ADD COLUMN is_production TINYINT(1) DEFAULT 0');
    } catch (e) {
      
    }
    console.log('model_registry table verified/created successfully');

    
    const createModelHistoryTableQuery = `
      CREATE TABLE IF NOT EXISTS model_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        model_version VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        actor VARCHAR(100) DEFAULT 'SYSTEM',
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createModelHistoryTableQuery);
    console.log('model_history table verified/created successfully');

    
    const createModelComparisonsTableQuery = `
      CREATE TABLE IF NOT EXISTS model_comparisons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comparison_id VARCHAR(100) UNIQUE NOT NULL,
        production_model VARCHAR(50) NOT NULL,
        candidate_model VARCHAR(50) NOT NULL,
        comparison_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        winner VARCHAR(50) NOT NULL,
        recommendation VARCHAR(50) NOT NULL,
        confidence_score DECIMAL(5,2) DEFAULT 95.00,
        metric_summary JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) DEFAULT 'SYSTEM'
      ) ENGINE=InnoDB;
    `;
    await connection.query(createModelComparisonsTableQuery);
    console.log('model_comparisons table verified/created successfully');

    
    const createDeploymentDecisionsTableQuery = `
      CREATE TABLE IF NOT EXISTS deployment_decisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        decision_id VARCHAR(100) UNIQUE NOT NULL,
        candidate_model VARCHAR(50) NOT NULL,
        production_model VARCHAR(50) NOT NULL,
        comparison_id VARCHAR(100) NULL DEFAULT NULL,
        decision VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        confidence DECIMAL(5,2) DEFAULT 0.00,
        passed_rules JSON NULL,
        failed_rules JSON NULL,
        manual_override TINYINT(1) DEFAULT 0,
        reviewed_by VARCHAR(100) DEFAULT 'SYSTEM',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createDeploymentDecisionsTableQuery);
    console.log('deployment_decisions table verified/created successfully');

    
    const createRollbackHistoryTableQuery = `
      CREATE TABLE IF NOT EXISTS rollback_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rollback_id VARCHAR(100) UNIQUE NOT NULL,
        current_model VARCHAR(100) NOT NULL,
        target_model VARCHAR(100) NOT NULL,
        decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        simulation_result JSON NULL,
        reason TEXT NULL,
        reviewed_by VARCHAR(100) DEFAULT 'SYSTEM',
        manual_override TINYINT(1) DEFAULT 0,
        eligibility_passed TINYINT(1) DEFAULT 0,
        artifact_status VARCHAR(20) DEFAULT 'UNKNOWN',
        checksum_status VARCHAR(20) DEFAULT 'UNKNOWN',
        dataset_status VARCHAR(20) DEFAULT 'UNKNOWN',
        validation_result VARCHAR(20) DEFAULT 'PENDING',
        target_dataset_version VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await connection.query(createRollbackHistoryTableQuery);
    console.log('rollback_history table verified/created successfully');

    
    const isTestScript = process.argv.some(arg => arg.includes('test_') || arg.includes('audit') || arg.includes('inspect') || arg.includes('repair_racks'));
    if (!isTestScript) {
      try {
        console.log('Running Unlimited Inventory Mode database migrations...');
        
        await connection.query('ALTER TABLE materials MODIFY COLUMN quantity DECIMAL(20,2) DEFAULT 0.00');
        await connection.query('ALTER TABLE materials MODIFY COLUMN threshold_limit DECIMAL(20,2) DEFAULT 0.00');
        
        
        await connection.query('ALTER TABLE racks MODIFY COLUMN quantity DECIMAL(20,2) NOT NULL DEFAULT 0.00');
        await connection.query('ALTER TABLE racks MODIFY COLUMN max_capacity DECIMAL(20,2) NOT NULL DEFAULT 999999999.00');
        await connection.query('ALTER TABLE racks MODIFY COLUMN threshold_limit DECIMAL(20,2) NOT NULL DEFAULT 10.00');
        
        
        await connection.query('ALTER TABLE rack_inventory MODIFY COLUMN current_capacity DECIMAL(20,2) NOT NULL DEFAULT 0.00');
        await connection.query('ALTER TABLE rack_inventory MODIFY COLUMN max_capacity DECIMAL(20,2) NOT NULL DEFAULT 999999999.00');

        
        await connection.query('ALTER TABLE transactions MODIFY COLUMN quantity DECIMAL(20,2) NOT NULL');
        await connection.query('ALTER TABLE qr_codes MODIFY COLUMN quantity DECIMAL(20,2) DEFAULT 0.00');
        await connection.query('ALTER TABLE qr_codes MODIFY COLUMN units DECIMAL(20,2) DEFAULT 0.00');
        await connection.query('ALTER TABLE rack_overload_history MODIFY COLUMN attempted_quantity DECIMAL(20,2) NOT NULL');
        await connection.query('ALTER TABLE rack_overload_history MODIFY COLUMN current_quantity DECIMAL(20,2) NOT NULL');
        await connection.query('ALTER TABLE rack_overload_history MODIFY COLUMN max_capacity DECIMAL(20,2) NOT NULL');
        
        
        await connection.query('UPDATE racks SET max_capacity = 999999999.00');
        await connection.query('UPDATE rack_inventory SET max_capacity = 999999999.00');
        
        console.log('Cleaning up empty racks to store only used racks...');
        await connection.query('DELETE FROM racks WHERE quantity = 0.00');
        
        console.log('Unlimited Inventory Mode database migrations completed successfully.');
      } catch (migErr) {
        console.error('Failed to run Unlimited Inventory Mode migrations:', migErr.message);
      }
    } else {
      console.log('Skipping Unlimited Inventory Mode migrations in test/audit environment.');
    }
    
    connection.release();
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
})();

export default pool;
