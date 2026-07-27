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
 * Helper to compute ISO week number
 */
function getIsoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * datasetGeneratorService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-Ready AI Dataset Generator for RM Monitor.
 *
 * Reads operational warehouse data (materials, transactions, rack_inventory,
 * qr_history movements, alerts) and formats ML-ready dataset rows enriched with
 * Material Info, Inventory, Transactions, Rack Occupancy, Movement Tracking,
 * Usage Data, and Automated ML Time Features.
 *
 * Stores exported CSV and JSON datasets in `backend/ml_datasets/` outside
 * the operational database, and records metadata into `ml_datasets` AND `ml_dataset_versions`.
 */
export class DatasetGeneratorService {

  /**
   * Ensure metadata tracking tables `ml_datasets` and `ml_dataset_versions` exist
   */
  async ensureMetadataTables() {
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

      await db.query(`
        CREATE TABLE IF NOT EXISTS ml_dataset_versions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          dataset_name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          row_count INT DEFAULT 0,
          source_tables VARCHAR(255) NOT NULL,
          output_file_path VARCHAR(500) NOT NULL,
          export_format VARCHAR(10) NOT NULL,
          generation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Column safeguards if tables existed previously
      try { await db.query(`ALTER TABLE ml_dataset_versions ADD COLUMN row_count INT DEFAULT 0`); } catch {}
      try { await db.query(`ALTER TABLE ml_dataset_versions ADD COLUMN source_tables VARCHAR(255) NOT NULL DEFAULT 'materials, transactions, racks, rack_inventory, alerts'`); } catch {}
      try { await db.query(`ALTER TABLE ml_dataset_versions ADD COLUMN output_file_path VARCHAR(500)`); } catch {}
      try { await db.query(`ALTER TABLE ml_dataset_versions ADD COLUMN export_format VARCHAR(10) NOT NULL DEFAULT 'CSV'`); } catch {}
      try { await db.query(`ALTER TABLE ml_dataset_versions ADD COLUMN generation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch {}
    } catch (err) {
      console.warn('[DatasetGeneratorService] ensureMetadataTables warning:', err.message);
    }
  }

  /**
   * Extract historical warehouse activity dataset rows
   */
  async extractDatasetRows() {
    // 1. Join transactions with materials, racks, and rack_inventory
    const [transactions] = await db.query(`
      SELECT 
        t.id AS transaction_id,
        t.material_id,
        m.material_name,
        COALESCE(m.barcode, m.barcode_id, concat('BC-', m.id)) AS barcode,
        COALESCE(m.batch_number, 'N/A') AS batch_number,
        COALESCE(m.unit, 'KG') AS unit,
        COALESCE(m.weight, m.quantity, 0.0) AS weight,
        t.transaction_type,
        t.quantity,
        COALESCE(t.user_id, 'System Operator') AS user_id,
        m.quantity AS current_stock,
        m.threshold_limit AS threshold,
        r.id AS rack_id,
        COALESCE(r.rack_code, 'RACK-01') AS rack_code,
        COALESCE(r.quantity, 0) AS current_rack_quantity,
        COALESCE(r.max_capacity, 1000) AS rack_capacity,
        COALESCE(ri.occupancy_percentage, 0.0) AS occupancy_percentage,
        t.created_at AS timestamp
      FROM transactions t
      LEFT JOIN materials m ON t.material_id = m.id
      LEFT JOIN racks r ON r.material_name = m.material_name
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
      ORDER BY t.created_at ASC
    `);

    // Fetch movements history from qr_history
    let movementsHistory = [];
    try {
      const [movRows] = await db.query(`
        SELECT barcode_id, material_name, action, rack_code, created_at
        FROM qr_history ORDER BY created_at DESC LIMIT 500
      `);
      movementsHistory = movRows || [];
    } catch {
      movementsHistory = [];
    }

    // Fetch active alerts for alert status mapping
    let activeAlerts = [];
    try {
      const [alertRows] = await db.query("SELECT * FROM alerts WHERE alert_status = 'active'");
      activeAlerts = alertRows || [];
    } catch {
      activeAlerts = [];
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // 2. Map & enrich every row with Material, Inventory, Transaction, Rack, Movement, Usage, and ML features
    let datasetRows = (transactions || []).map((t) => {
      const ts = t.timestamp ? new Date(t.timestamp) : new Date();
      const dayIndex = ts.getDay();

      const maxCap = parseFloat(t.rack_capacity) || 1000.0;
      const rackQty = parseFloat(t.current_rack_quantity) || 0.0;
      const calcOccPct = maxCap > 0 ? parseFloat(((rackQty / maxCap) * 100).toFixed(2)) : 0.0;
      const occPct = parseFloat(t.occupancy_percentage) > 0 ? parseFloat(t.occupancy_percentage) : calcOccPct;

      const hasAlert = activeAlerts.some((a) => a.material_id === t.material_id || String(a.message).includes(t.material_name));
      const alertStatus = hasAlert ? 'ACTIVE' : (t.current_stock <= t.threshold ? 'ACTIVE' : 'NONE');

      const isOutward = String(t.transaction_type).toLowerCase() === 'outward';
      const movementType = isOutward ? 'OUTWARD' : 'INWARD';
      const sourceLoc = isOutward ? (t.rack_code || 'Warehouse Zone A') : 'Ingress Port';
      const destLoc = isOutward ? 'Outbound Production Line' : (t.rack_code || 'Warehouse Zone A');
      const qtyUsed = isOutward ? parseFloat(t.quantity) || 0.0 : 0.0;

      return {
        // Material Information
        material_id: t.material_id,
        material_name: t.material_name || 'Unknown Material',
        barcode: t.barcode || 'N/A',
        batch_number: t.batch_number || 'N/A',

        // Inventory Information
        current_stock: parseFloat(t.current_stock) || 0.0,
        threshold: parseFloat(t.threshold) || 0.0,
        unit: t.unit || 'KG',
        weight: parseFloat(t.weight) || 0.0,

        // Transaction Information
        transaction_type: t.transaction_type || 'Inward',
        quantity: parseFloat(t.quantity) || 0.0,
        user_id: String(t.user_id),
        rack_code: t.rack_code || 'RACK-01',
        timestamp: ts.toISOString(),

        // Rack Information
        rack_capacity: maxCap,
        current_rack_quantity: rackQty,
        occupancy_percentage: occPct,

        // Movement Information
        movement_type: movementType,
        source_location: sourceLoc,
        destination_location: destLoc,

        // Usage Information
        quantity_used: qtyUsed,

        // ML Time Features
        day_of_week: dayNames[dayIndex],
        week_number: getIsoWeekNumber(ts),
        month: ts.getMonth() + 1,
        year: ts.getFullYear(),
        hour: ts.getHours(),
        weekend_flag: (dayIndex === 0 || dayIndex === 6) ? 1 : 0
      };
    });

    // Fallback: If database has no transaction history yet, generate structured rows from materials table
    if (datasetRows.length === 0) {
      const [materials] = await db.query('SELECT * FROM materials ORDER BY id ASC');

      datasetRows = (materials || []).map((m, idx) => {
        const ts = new Date(Date.now() - idx * 3600000);
        const dayIndex = ts.getDay();
        const isOut = idx % 2 === 1;
        const qty = parseFloat((m.quantity * 0.1).toFixed(2)) || 10.0;

        return {
          material_id: m.id,
          material_name: m.material_name || 'Material',
          barcode: m.barcode || m.barcode_id || `BC-${m.id}`,
          batch_number: m.batch_number || 'N/A',
          current_stock: parseFloat(m.quantity) || 0.0,
          threshold: parseFloat(m.threshold_limit) || 0.0,
          unit: m.unit || 'KG',
          weight: parseFloat(m.weight || m.quantity) || 0.0,
          transaction_type: isOut ? 'Outward' : 'Inward',
          quantity: qty,
          user_id: 'System Operator',
          rack_code: 'RACK-01',
          timestamp: ts.toISOString(),
          rack_capacity: 1000.0,
          current_rack_quantity: 450.0,
          occupancy_percentage: 45.0,
          movement_type: isOut ? 'OUTWARD' : 'INWARD',
          source_location: isOut ? 'RACK-01' : 'Ingress Port',
          destination_location: isOut ? 'Outbound Production Line' : 'RACK-01',
          quantity_used: isOut ? qty : 0.0,
          day_of_week: dayNames[dayIndex],
          week_number: getIsoWeekNumber(ts),
          month: ts.getMonth() + 1,
          year: ts.getFullYear(),
          hour: ts.getHours(),
          weekend_flag: (dayIndex === 0 || dayIndex === 6) ? 1 : 0
        };
      });
    }

    return datasetRows;
  }

  /**
   * Convert dataset rows to CSV format with header row
   */
  convertToCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = [
      'material_id',
      'material_name',
      'barcode',
      'batch_number',
      'current_stock',
      'threshold',
      'unit',
      'weight',
      'transaction_type',
      'quantity',
      'user_id',
      'rack_code',
      'timestamp',
      'rack_capacity',
      'current_rack_quantity',
      'occupancy_percentage',
      'movement_type',
      'source_location',
      'destination_location',
      'quantity_used',
      'day_of_week',
      'week_number',
      'month',
      'year',
      'hour',
      'weekend_flag'
    ];

    const csvLines = [headers.join(',')];

    for (const row of rows) {
      const line = headers.map((field) => {
        let val = row[field];
        if (val === null || val === undefined) val = '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      });
      csvLines.push(line.join(','));
    }

    return csvLines.join('\n');
  }

  /**
   * Main Production Dataset Generation Handler
   */
  async generateDataset(options = {}) {
    await this.ensureMetadataTables();

    const format = (options.format || 'CSV').toUpperCase(); // 'CSV' or 'JSON'
    const datasetName = options.dataset_name || 'warehouse_production_ml_dataset';
    const version = options.version || `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}_${Date.now().toString().slice(-6)}`;

    // Extract dataset rows
    const rows = await this.extractDatasetRows();
    const rowCount = rows.length;
    const ext = format === 'JSON' ? 'json' : 'csv';
    const filename = `${datasetName}_${version}.${ext}`;
    const fullPath = path.join(mlDatasetsDir, filename);

    if (format === 'JSON') {
      const payload = {
        metadata: {
          dataset_name: datasetName,
          version,
          row_count: rowCount,
          source_tables: ['materials', 'transactions', 'rack_inventory', 'qr_history', 'alerts'],
          export_format: 'JSON',
          generation_timestamp: new Date().toISOString()
        },
        schema: [
          'material_id', 'material_name', 'barcode', 'batch_number',
          'current_stock', 'threshold', 'unit', 'weight',
          'transaction_type', 'quantity', 'user_id', 'rack_code', 'timestamp',
          'rack_capacity', 'current_rack_quantity', 'occupancy_percentage',
          'movement_type', 'source_location', 'destination_location', 'quantity_used',
          'day_of_week', 'week_number', 'month', 'year', 'hour', 'weekend_flag'
        ],
        data: rows
      };
      fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), 'utf8');
    } else {
      const csvContent = this.convertToCSV(rows);
      fs.writeFileSync(fullPath, csvContent, 'utf8');
    }

    const sourceTablesStr = 'materials, transactions, rack_inventory, qr_history, alerts';

    // 1. Insert record into `ml_datasets`
    try {
      await db.query(
        `INSERT INTO ml_datasets (dataset_name, version, records_count, file_path) VALUES (?, ?, ?, ?)`,
        [datasetName, version, rowCount, fullPath]
      );
    } catch (err) {
      console.warn('[DatasetGeneratorService] ml_datasets record warning:', err.message);
    }

    // 2. Update / Insert record into `ml_dataset_versions`
    try {
      await db.query(
        `INSERT INTO ml_dataset_versions 
          (dataset_name, version, row_count, source_tables, output_file_path, export_format) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [datasetName, version, rowCount, sourceTablesStr, fullPath, format]
      );
    } catch (err) {
      console.warn('[DatasetGeneratorService] ml_dataset_versions record warning:', err.message);
    }

    return {
      dataset_name: datasetName,
      version,
      row_count: rowCount,
      source_tables: sourceTablesStr.split(', '),
      export_format: format,
      filename,
      output_file_path: fullPath,
      generation_timestamp: new Date().toISOString(),
      sample_rows: rows.slice(0, 3)
    };
  }

  /**
   * List all generated dataset versions
   */
  async listDatasetVersions() {
    await this.ensureMetadataTables();
    try {
      const [rows] = await db.query('SELECT * FROM ml_dataset_versions ORDER BY generation_timestamp DESC');
      if (rows && rows.length > 0) return rows;
    } catch {
      // Fallback
    }

    const files = fs.readdirSync(mlDatasetsDir);
    return files.map((file, idx) => ({
      id: idx + 1,
      dataset_name: file.split('_')[0],
      version: 'v1.0.0',
      row_count: 0,
      source_tables: 'materials, transactions, rack_inventory, qr_history, alerts',
      output_file_path: path.join(mlDatasetsDir, file),
      export_format: file.endsWith('.json') ? 'JSON' : 'CSV',
      generation_timestamp: fs.statSync(path.join(mlDatasetsDir, file)).mtime.toISOString()
    }));
  }
}

export const datasetGeneratorService = new DatasetGeneratorService();
export default datasetGeneratorService;
