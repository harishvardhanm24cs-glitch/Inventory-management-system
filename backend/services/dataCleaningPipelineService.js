import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import datasetGeneratorService from './datasetGeneratorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlDatasetsDir = path.join(__dirname, '..', 'ml_datasets');

if (!fs.existsSync(mlDatasetsDir)) {
  fs.mkdirSync(mlDatasetsDir, { recursive: true });
}

/**
 * dataCleaningPipelineService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated Machine Learning Data Cleaning Pipeline for RM Monitor.
 *
 * Performs automated data hygiene, missing value detection, duplicate purging,
 * timestamp validation, record filtering, Min-Max numerical scaling, and
 * One-Hot/Label categorical encoding.
 *
 * Exports cleaned dataset files:
 * • backend/ml_datasets/clean_warehouse_dataset.csv
 * • backend/ml_datasets/clean_warehouse_dataset.json
 */
export class DataCleaningPipelineService {

  /**
   * Helper: Min-Max scaler
   */
  minMaxScale(value, min, max) {
    if (max === min) return 0.0;
    const scaled = (value - min) / (max - min);
    return parseFloat(Math.max(0, Math.min(1, scaled)).toFixed(4));
  }

  /**
   * Main Data Cleaning & Preprocessing Pipeline
   */
  async runCleaningPipeline(options = {}) {
    const startTime = Date.now();

    // 1. Fetch raw input dataset rows from Dataset Generator or provided array
    let rawRows = options.raw_rows;
    if (!rawRows || !Array.isArray(rawRows)) {
      rawRows = await datasetGeneratorService.extractDatasetRows();
    }

    const totalProcessed = rawRows.length;
    let missingValuesDetected = 0;
    let invalidRecordsDetected = 0;
    let duplicateRowsRemoved = 0;

    const validTransactionTypes = ['INWARD', 'OUTWARD', 'ADJUSTMENT', 'TRANSFER'];
    const validMovementTypes = ['INWARD', 'OUTWARD', 'TRANSFER'];

    // 2. Validate, Clean, & Filter Invalid Records
    const validatedRows = [];
    const seenDuplicateKeys = new Set();

    for (let i = 0; i < rawRows.length; i++) {
      const row = { ...rawRows[i] };

      // Missing Value Check & Imputation
      if (!row.material_name || row.material_name === '' || row.material_name === 'null') {
        missingValuesDetected++;
        row.material_name = 'Unknown Material';
      }
      if (!row.barcode || row.barcode === '' || row.barcode === 'null') {
        missingValuesDetected++;
        row.barcode = `BC-${row.material_id || i}`;
      }
      if (!row.batch_number || row.batch_number === '' || row.batch_number === 'null') {
        missingValuesDetected++;
        row.batch_number = 'N/A';
      }
      if (!row.unit || row.unit === '' || row.unit === 'null') {
        missingValuesDetected++;
        row.unit = 'KG';
      }

      // Numeric Validation & Type Conversion
      const matId = parseInt(row.material_id, 10);
      const stock = parseFloat(row.current_stock);
      const threshold = parseFloat(row.threshold);
      const qty = parseFloat(row.quantity);
      const weight = parseFloat(row.weight);
      const cap = parseFloat(row.rack_capacity);
      const rackQty = parseFloat(row.current_rack_quantity);
      const occPct = parseFloat(row.occupancy_percentage);

      // Timestamp Validation
      const tsDate = new Date(row.timestamp);
      const isCorruptedDate = isNaN(tsDate.getTime());

      const txTypeUpper = String(row.transaction_type || '').toUpperCase();
      const movTypeUpper = String(row.movement_type || '').toUpperCase();
      const rackCode = String(row.rack_code || '').trim();

      // Check for Invalid Record Criteria
      let isInvalid = false;
      if (isNaN(matId) || matId <= 0) isInvalid = true;
      if (isNaN(stock) || stock < 0) isInvalid = true;
      if (isNaN(qty) || qty < 0) isInvalid = true;
      if (isNaN(threshold) || threshold < 0) isInvalid = true;
      if (isNaN(occPct) || occPct < 0 || occPct > 100) isInvalid = true;
      if (isCorruptedDate) isInvalid = true;
      if (!rackCode || rackCode === 'null' || rackCode === 'undefined') isInvalid = true;
      if (!validTransactionTypes.includes(txTypeUpper)) isInvalid = true;
      if (!validMovementTypes.includes(movTypeUpper)) isInvalid = true;

      if (isInvalid) {
        invalidRecordsDetected++;
        continue; // Drop corrupted/invalid record
      }

      // Duplicate Check (Preserve earliest valid record)
      const dupKey = `${matId}_${row.transaction_id || i}_${tsDate.toISOString()}_${qty}`;
      if (seenDuplicateKeys.has(dupKey)) {
        duplicateRowsRemoved++;
        continue; // Purge duplicate
      }
      seenDuplicateKeys.add(dupKey);

      // Save sanitized numbers
      row.material_id = matId;
      row.current_stock = stock;
      row.threshold = threshold;
      row.quantity = qty;
      row.weight = isNaN(weight) ? stock : weight;
      row.rack_capacity = isNaN(cap) || cap <= 0 ? 1000.0 : cap;
      row.current_rack_quantity = isNaN(rackQty) ? 0.0 : rackQty;
      row.occupancy_percentage = occPct;
      row.timestamp = tsDate.toISOString();
      row.transaction_type = row.transaction_type || 'Inward';
      row.movement_type = movTypeUpper;
      row.rack_code = rackCode;

      validatedRows.push(row);
    }

    // 3. Sort Data Chronologically (Timestamp Ascending)
    validatedRows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 4. Calculate Min-Max Bounds for Numerical Normalization
    let minStock = Infinity, maxStock = -Infinity;
    let minThresh = Infinity, maxThresh = -Infinity;
    let minQty = Infinity, maxQty = -Infinity;
    let minWeight = Infinity, maxWeight = -Infinity;
    let minOcc = Infinity, maxOcc = -Infinity;
    let minCap = Infinity, maxCap = -Infinity;

    for (const r of validatedRows) {
      if (r.current_stock < minStock) minStock = r.current_stock;
      if (r.current_stock > maxStock) maxStock = r.current_stock;

      if (r.threshold < minThresh) minThresh = r.threshold;
      if (r.threshold > maxThresh) maxThresh = r.threshold;

      if (r.quantity < minQty) minQty = r.quantity;
      if (r.quantity > maxQty) maxQty = r.quantity;

      if (r.weight < minWeight) minWeight = r.weight;
      if (r.weight > maxWeight) maxWeight = r.weight;

      if (r.occupancy_percentage < minOcc) minOcc = r.occupancy_percentage;
      if (r.occupancy_percentage > maxOcc) maxOcc = r.occupancy_percentage;

      if (r.rack_capacity < minCap) minCap = r.rack_capacity;
      if (r.rack_capacity > maxCap) maxCap = r.rack_capacity;
    }

    if (minStock === Infinity) {
      minStock = 0; maxStock = 100;
      minThresh = 0; maxThresh = 50;
      minQty = 0; maxQty = 50;
      minWeight = 0; maxWeight = 100;
      minOcc = 0; maxOcc = 100;
      minCap = 0; maxCap = 1000;
    }

    // 5. Categorical Encoding Dictionaries (Label Encoding & One-Hot Encoding)
    const uniqueMaterials = Array.from(new Set(validatedRows.map((r) => r.material_name))).sort();
    const uniqueRacks = Array.from(new Set(validatedRows.map((r) => r.rack_code))).sort();

    const materialMap = {};
    uniqueMaterials.forEach((m, idx) => { materialMap[m] = idx; });

    const rackMap = {};
    uniqueRacks.forEach((rk, idx) => { rackMap[rk] = idx; });

    const txTypeMap = { Inward: 0, Outward: 1, Adjustment: 2, Transfer: 3 };
    const movTypeMap = { INWARD: 0, OUTWARD: 1, TRANSFER: 2 };

    // 6. Enrich Rows with Scaled Normalization & Categorical Encodings
    const cleanedRows = validatedRows.map((r) => {
      // Min-Max Scaled Normalized Values
      const norm_current_stock = this.minMaxScale(r.current_stock, minStock, maxStock);
      const norm_threshold = this.minMaxScale(r.threshold, minThresh, maxThresh);
      const norm_quantity = this.minMaxScale(r.quantity, minQty, maxQty);
      const norm_weight = this.minMaxScale(r.weight, minWeight, maxWeight);
      const norm_occupancy = this.minMaxScale(r.occupancy_percentage, minOcc, maxOcc);
      const norm_capacity = this.minMaxScale(r.rack_capacity, minCap, maxCap);

      // Label Encodings
      const encoded_transaction_type = txTypeMap[r.transaction_type] ?? 0;
      const encoded_movement_type = movTypeMap[r.movement_type] ?? 0;
      const encoded_material_name = materialMap[r.material_name] ?? 0;
      const encoded_rack_code = rackMap[r.rack_code] ?? 0;

      // One-Hot Encodings
      const ohe_tx_Inward = r.transaction_type === 'Inward' ? 1 : 0;
      const ohe_tx_Outward = r.transaction_type === 'Outward' ? 1 : 0;

      const ohe_mov_INWARD = r.movement_type === 'INWARD' ? 1 : 0;
      const ohe_mov_OUTWARD = r.movement_type === 'OUTWARD' ? 1 : 0;
      const ohe_mov_TRANSFER = r.movement_type === 'TRANSFER' ? 1 : 0;

      return {
        ...r,

        // Min-Max Normalization Features
        norm_current_stock,
        norm_threshold,
        norm_quantity,
        norm_weight,
        norm_occupancy,
        norm_capacity,

        // Categorical Label Encodings
        encoded_transaction_type,
        encoded_movement_type,
        encoded_material_name,
        encoded_rack_code,

        // One-Hot Encodings
        ohe_tx_Inward,
        ohe_tx_Outward,
        ohe_mov_INWARD,
        ohe_mov_OUTWARD,
        ohe_mov_TRANSFER
      };
    });

    const rowsRetained = cleanedRows.length;
    const rowsRemoved = totalProcessed - rowsRetained;

    // 7. Generate Cleaning Report
    const cleaningReport = {
      pipeline_version: 'v1.0.0',
      execution_timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
      rows_processed: totalProcessed,
      rows_removed: rowsRemoved,
      rows_retained: rowsRetained,
      missing_values_detected: missingValuesDetected,
      duplicate_rows_removed: duplicateRowsRemoved,
      invalid_records_detected: invalidRecordsDetected,
      normalization_summary: {
        scaling_method: 'Min-Max Scaling (0.0 to 1.0)',
        feature_bounds: {
          current_stock: { min: minStock, max: maxStock },
          threshold: { min: minThresh, max: maxThresh },
          quantity: { min: minQty, max: maxQty },
          weight: { min: minWeight, max: maxWeight },
          occupancy_percentage: { min: minOcc, max: maxOcc },
          rack_capacity: { min: minCap, max: maxCap }
        }
      },
      encoding_summary: {
        label_encoding_maps: {
          transaction_type: txTypeMap,
          movement_type: movTypeMap,
          material_name: materialMap,
          rack_code: rackMap
        },
        one_hot_features: ['ohe_tx_Inward', 'ohe_tx_Outward', 'ohe_mov_INWARD', 'ohe_mov_OUTWARD', 'ohe_mov_TRANSFER']
      }
    };

    // 8. Export Clean Datasets to `backend/ml_datasets/`
    const csvPath = path.join(mlDatasetsDir, 'clean_warehouse_dataset.csv');
    const jsonPath = path.join(mlDatasetsDir, 'clean_warehouse_dataset.json');

    // CSV Export
    const csvContent = datasetGeneratorService.convertToCSV(cleanedRows);
    fs.writeFileSync(csvPath, csvContent, 'utf8');

    // JSON Export (Data + Full Cleaning Report)
    const jsonPayload = {
      cleaning_report: cleaningReport,
      data: cleanedRows
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf8');

    return {
      success: true,
      files_created: [
        'backend/ml_datasets/clean_warehouse_dataset.csv',
        'backend/ml_datasets/clean_warehouse_dataset.json'
      ],
      export_paths: {
        csv: csvPath,
        json: jsonPath
      },
      report: cleaningReport,
      sample_rows: cleanedRows.slice(0, 3)
    };
  }
}

export const dataCleaningPipelineService = new DataCleaningPipelineService();
export default dataCleaningPipelineService;
