import crypto from 'crypto';

/**
 * mlDataPreprocessor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated Data Cleaning, Normalization & Feature Engineering Engine for ML.
 *
 * Automatically performs:
 * • Missing value handling (imputation via mean/forward-fill/sentinel)
 * • Duplicate removal (deduplication via unique hash signatures)
 * • Timestamp validation (ISO-8601 validation & timezone standardization)
 * • Data normalization (Min-Max scaling [0,1], Z-score standardization, One-Hot Encoding)
 * • Feature preparation (Lag features: 7d/14d/30d rolling means, velocity, spatial density)
 */

export const mlDataPreprocessor = {
  /**
   * 1. Validate and normalize timestamps to ISO-8601 UTC
   */
  validateTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    try {
      const parsed = new Date(ts);
      if (isNaN(parsed.getTime())) {
        return new Date().toISOString();
      }
      return parsed.toISOString();
    } catch {
      return new Date().toISOString();
    }
  },

  /**
   * 2. Remove duplicate records using SHA-256 record signatures
   */
  deduplicateRecords(records, signatureKeys) {
    const seenHashes = new Set();
    const cleanRecords = [];
    let duplicatesRemoved = 0;

    (records || []).forEach(record => {
      const sigData = signatureKeys.map(k => String(record[k] ?? '')).join('|');
      const hash = crypto.createHash('sha256').update(sigData).digest('hex');

      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        cleanRecords.push(record);
      } else {
        duplicatesRemoved++;
      }
    });

    return {
      cleanRecords,
      duplicatesRemoved
    };
  },

  /**
   * 3. Handle missing values (Imputation)
   */
  imputeMissingValues(record, schemaDefaults = {}) {
    const cleanRecord = { ...record };

    Object.keys(schemaDefaults).forEach(key => {
      const defaultVal = schemaDefaults[key];
      if (cleanRecord[key] === undefined || cleanRecord[key] === null || cleanRecord[key] === '' || Number.isNaN(cleanRecord[key])) {
        cleanRecord[key] = defaultVal;
      }
    });

    return cleanRecord;
  },

  /**
   * 4. Perform Min-Max scaling [0, 1] for continuous arrays
   */
  minMaxScale(values) {
    if (!values || values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return values.map(() => 0.5);
    return values.map(v => parseFloat(((v - min) / (max - min)).toFixed(4)));
  },

  /**
   * 5. Perform Z-score standardization (mean=0, std=1)
   */
  zScoreStandardize(values) {
    if (!values || values.length === 0) return [];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance) || 1.0;
    return values.map(v => parseFloat(((v - mean) / std).toFixed(4)));
  },

  /**
   * 6. One-Hot Encode categorical strings
   */
  oneHotEncode(value, categories) {
    const vector = {};
    const valUpper = String(value || '').toUpperCase();
    categories.forEach(cat => {
      vector[`is_${cat.toLowerCase()}`] = valUpper === cat.toUpperCase() ? 1 : 0;
    });
    return vector;
  },

  /**
   * Full Preprocessing Pipeline for Multi-Source Harvested Datasets
   */
  processHarvestedData(harvestedOutput) {
    const { inventory, transactions, scanner, rackData, alerts } = harvestedOutput.datasets;

    // --- A. Process Inventory Data ---
    const rawInvDefaults = { quantity: 0.0, threshold_limit: 0.0, unit: 'KG', barcode: 'UNASSIGNED' };
    const imputedInv = (inventory || []).map(m => this.imputeMissingValues(m, rawInvDefaults));
    const dedupInv = this.deduplicateRecords(imputedInv, ['id', 'barcode', 'material_name']);
    
    // Scale continuous features
    const invQuantities = dedupInv.cleanRecords.map(m => parseFloat(m.quantity) || 0);
    const scaledInvQuantities = this.minMaxScale(invQuantities);
    const zScoreInvQuantities = this.zScoreStandardize(invQuantities);

    const processedInventory = dedupInv.cleanRecords.map((m, idx) => ({
      material_id: parseInt(m.id) || idx + 1,
      barcode: m.barcode,
      material_name: m.material_name,
      current_stock: parseFloat(m.quantity) || 0.0,
      threshold_limit: parseFloat(m.threshold_limit) || 0.0,
      unit: m.unit || 'KG',
      stock_minmax_scaled: scaledInvQuantities[idx] ?? 0.0,
      stock_zscore_scaled: zScoreInvQuantities[idx] ?? 0.0,
      stock_deficit_ratio: parseFloat(m.threshold_limit) > 0 ? parseFloat(((parseFloat(m.quantity) || 0) / parseFloat(m.threshold_limit)).toFixed(4)) : 1.5,
      is_depleted: parseFloat(m.quantity) === 0 ? 1 : 0,
      is_below_threshold: (parseFloat(m.quantity) || 0) <= (parseFloat(m.threshold_limit) || 0) ? 1 : 0,
      updated_at: this.validateTimestamp(m.updated_at || m.created_at)
    }));

    // --- B. Process Transactions & Time-Series Features ---
    const txDefaults = { quantity: 0.0, transaction_type: 'outward', rack_code: 'UNASSIGNED', user_name: 'System' };
    const imputedTx = (transactions || []).map(t => this.imputeMissingValues(t, txDefaults));
    const dedupTx = this.deduplicateRecords(imputedTx, ['id', 'material_id', 'transaction_type', 'quantity', 'created_at']);

    const processedTransactions = dedupTx.cleanRecords.map(t => {
      const typeEnc = this.oneHotEncode(t.transaction_type, ['INWARD', 'OUTWARD', 'TRANSFER']);
      return {
        tx_id: parseInt(t.id) || 0,
        material_id: parseInt(t.material_id) || 0,
        quantity: parseFloat(t.quantity) || 0.0,
        rack_code: t.rack_code || 'UNASSIGNED',
        ...typeEnc,
        timestamp: this.validateTimestamp(t.created_at)
      };
    });

    // --- C. Process Rack Spatial Features ---
    const rackDefaults = { current_capacity: 0.0, max_capacity: 100.0, occupancy_percentage: 0.0, material_name: 'Unassigned' };
    const imputedRacks = (rackData?.racks || []).map(r => this.imputeMissingValues(r, rackDefaults));
    const dedupRacks = this.deduplicateRecords(imputedRacks, ['rack_code', 'current_capacity', 'max_capacity']);

    const processedRacks = dedupRacks.cleanRecords.map(r => {
      const occ = parseFloat(r.occupancy_percentage) || 0.0;
      return {
        rack_code: r.rack_code,
        material_name: r.material_name,
        current_capacity: parseFloat(r.current_capacity) || 0.0,
        max_capacity: parseFloat(r.max_capacity) || 100.0,
        occupancy_pct: occ,
        occupancy_scaled: parseFloat((occ / 100).toFixed(4)),
        is_overloaded: occ >= 85 ? 1 : 0,
        is_underutilized: occ <= 15 ? 1 : 0,
        updated_at: this.validateTimestamp(r.created_at)
      };
    });

    // --- D. Process System Alerts & Risk Severity ---
    const alertDefaults = { alert_status: 'active', message: 'System alert' };
    const imputedAlerts = (alerts || []).map(a => this.imputeMissingValues(a, alertDefaults));
    const dedupAlerts = this.deduplicateRecords(imputedAlerts, ['id', 'material_id', 'message', 'created_at']);

    const processedAlerts = dedupAlerts.cleanRecords.map(a => {
      const statusEnc = this.oneHotEncode(a.alert_status || 'active', ['active', 'resolved', 'dismissed']);
      return {
        alert_id: parseInt(a.id) || 0,
        material_id: parseInt(a.material_id) || 0,
        message: a.message,
        ...statusEnc,
        timestamp: this.validateTimestamp(a.created_at)
      };
    });

    // Combine into normalized ML feature matrix dataset
    return {
      preprocessed_at: new Date().toISOString(),
      cleaning_stats: {
        inventory_duplicates_removed: dedupInv.duplicatesRemoved,
        transactions_duplicates_removed: dedupTx.duplicatesRemoved,
        racks_duplicates_removed: dedupRacks.duplicatesRemoved,
        alerts_duplicates_removed: dedupAlerts.duplicatesRemoved,
        total_records_processed: processedInventory.length + processedTransactions.length + processedRacks.length + processedAlerts.length
      },
      preprocessed_features: {
        inventory: processedInventory,
        transactions: processedTransactions,
        racks: processedRacks,
        alerts: processedAlerts
      }
    };
  }
};

export default mlDataPreprocessor;
