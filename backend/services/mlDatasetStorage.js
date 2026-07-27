import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlDatasetsDir = path.join(__dirname, '..', 'ml_datasets');

// Ensure dedicated ml_datasets storage directory exists
if (!fs.existsSync(mlDatasetsDir)) {
  fs.mkdirSync(mlDatasetsDir, { recursive: true });
}

/**
 * mlDatasetStorage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated Storage Layer for ML Datasets.
 *
 * Keeps operational warehouse tables completely independent.
 * Persists datasets into isolated disk storage inside `backend/ml_datasets/`
 * and logs dataset metadata records into `ml_datasets` table.
 */

export const mlDatasetStorage = {
  /**
   * Ensure metadata logging table exists without altering operational tables
   */
  async ensureMetadataTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ml_datasets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          dataset_name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          records_count INT DEFAULT 0,
          file_path VARCHAR(500) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.warn('[mlDatasetStorage] ensureMetadataTable warning:', err.message);
    }
  },

  /**
   * Save preprocessed ML feature matrix into isolated storage
   */
  async saveDataset(datasetName, preprocessedOutput) {
    await this.ensureMetadataTable();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const version = `v1-${Date.now()}`;
    const filename = `${datasetName}_${timestamp}.json`;
    const fullPath = path.join(mlDatasetsDir, filename);

    const datasetPayload = {
      dataset_name: datasetName,
      version,
      created_at: new Date().toISOString(),
      cleaning_stats: preprocessedOutput.cleaning_stats,
      data: preprocessedOutput.preprocessed_features
    };

    // Save dataset JSON file
    fs.writeFileSync(fullPath, JSON.stringify(datasetPayload, null, 2), 'utf8');

    const totalRecords = preprocessedOutput.cleaning_stats.total_records_processed || 0;

    // Log dataset entry in metadata database table
    try {
      await db.query(
        'INSERT INTO ml_datasets (dataset_name, version, records_count, file_path) VALUES (?, ?, ?, ?)',
        [datasetName, version, totalRecords, fullPath]
      );
    } catch {
      // Table logging fallback
    }

    return {
      dataset_name: datasetName,
      version,
      filename,
      full_path: fullPath,
      records_count: totalRecords,
      saved_at: new Date().toISOString()
    };
  },

  /**
   * List all stored ML datasets
   */
  async listDatasets() {
    await this.ensureMetadataTable();

    try {
      const [rows] = await db.query('SELECT * FROM ml_datasets ORDER BY created_at DESC');
      if (rows && rows.length > 0) return rows;
    } catch {
      // Fallback to disk scan
    }

    const files = fs.readdirSync(mlDatasetsDir).filter(f => f.endsWith('.json'));
    return files.map((file, idx) => ({
      id: idx + 1,
      dataset_name: file.split('_')[0],
      version: 'v1.0',
      file_path: path.join(mlDatasetsDir, file),
      created_at: fs.statSync(path.join(mlDatasetsDir, file)).mtime.toISOString()
    }));
  },

  /**
   * Read dataset by filename or path
   */
  async getLatestDataset() {
    const files = fs.readdirSync(mlDatasetsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return null;
    const latestFile = files.sort().pop();
    const fullPath = path.join(mlDatasetsDir, latestFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  }
};

export default mlDatasetStorage;
