import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env from current directory
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'rm_monitor',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const initDB = async () => {
    try {
        // First connection without DB selection to create it if missing
        const prelimConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
        });
        
        await prelimConn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'rm_monitor'}`);
        await prelimConn.end();

        const connection = await pool.getConnection();
        console.log('MySQL Connected to Pool...');

        // 1. SKU Registry Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sku_registry (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sku_id VARCHAR(50) UNIQUE NOT NULL,
                paint_name VARCHAR(255),
                batch VARCHAR(100),
                location VARCHAR(100),
                manufacture_date DATE,
                expiry_date DATE,
                weight DECIMAL(10, 2),
                qr_code_image LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Inventory Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sku_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255),
                category VARCHAR(100) DEFAULT 'Paint',
                total_weight DECIMAL(10, 2) DEFAULT 0,
                min_limit DECIMAL(10, 2) DEFAULT 20.00,
                critical_limit DECIMAL(10, 2) DEFAULT 10.00,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 3. Auto-Migration for Inventory Columns
        const [invCols]: any = await connection.query('SHOW COLUMNS FROM inventory');
        const existingCols = invCols.map((c: any) => c.Field);
        
        if (!existingCols.includes('name')) {
            await connection.query('ALTER TABLE inventory ADD COLUMN name VARCHAR(255) AFTER sku_id');
        }
        if (!existingCols.includes('category')) {
            await connection.query('ALTER TABLE inventory ADD COLUMN category VARCHAR(100) DEFAULT "Paint" AFTER name');
        }
        if (!existingCols.includes('min_limit')) {
            await connection.query('ALTER TABLE inventory ADD COLUMN min_limit DECIMAL(10, 2) DEFAULT 20.00 AFTER total_weight');
        }
        if (!existingCols.includes('critical_limit')) {
            await connection.query('ALTER TABLE inventory ADD COLUMN critical_limit DECIMAL(10, 2) DEFAULT 10.00 AFTER min_limit');
        }

        // 4. Scan Logs Table (Enhanced with Context)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS scan_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sku_id VARCHAR(50) NOT NULL,
                batch_number VARCHAR(100),
                location VARCHAR(100),
                action ENUM('IN', 'OUT') NOT NULL,
                weight DECIMAL(10, 2),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Auto-Migration for Scan Logs Columns
        const [logCols]: any = await connection.query('SHOW COLUMNS FROM scan_logs');
        const existingLogCols = logCols.map((c: any) => c.Field);

        if (!existingLogCols.includes('batch_number')) {
            await connection.query('ALTER TABLE scan_logs ADD COLUMN batch_number VARCHAR(100) AFTER sku_id');
        }
        if (!existingLogCols.includes('location')) {
            await connection.query('ALTER TABLE scan_logs ADD COLUMN location VARCHAR(100) AFTER batch_number');
        }

        // 6. Material Movements Table (Phase 4 Step 1)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS material_movements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                barcode_id VARCHAR(50) NOT NULL,
                material_name VARCHAR(255),
                source_location VARCHAR(100),
                destination_location VARCHAR(100),
                movement_type VARCHAR(50),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('Phase 2: Industrial Tables Created Successfully.');
    } catch (err: any) {
        console.error('❌ [DB INIT CRITICAL FAILURE]:', err.message);
        console.error('🔍 [TRACE]:', JSON.stringify({ 
            code: err.code, 
            errno: err.errno, 
            sqlState: err.sqlState,
            port: err.port,
            address: err.address
        }, null, 2));
    }
};

export const checkDbConnection = async () => {
    try {
        const connection = await pool.getConnection();
        connection.release();
        return true;
    } catch (err) {
        return false;
    }
};

export default pool;
