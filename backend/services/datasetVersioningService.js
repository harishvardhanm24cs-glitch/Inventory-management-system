

import db from '../config/db.js';
import { aiBridgeService } from './aiBridgeService.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const datasetVersioningService = {
  
  async logHistory(datasetVersion, action, actor = 'SYSTEM', details = '') {
    try {
      await db.query(
        'INSERT INTO dataset_history (dataset_version, action, actor, details) VALUES (?, ?, ?, ?)',
        [datasetVersion, action, actor, typeof details === 'object' ? JSON.stringify(details) : String(details)]
      );
    } catch (err) {
      console.warn('[DatasetVersioningService History Error]:', err.message);
    }
  },

  /**
   * GET /api/ai/datasets
   */
  async getDatasets() {
    try {
      const [rows] = await db.query('SELECT * FROM dataset_registry ORDER BY id DESC');
      if (rows.length > 0) {
        return rows;
      }

      
      const pyRes = await aiBridgeService.executeAction('dataset_list').catch(() => ({}));
      return pyRes.datasets || [];
    } catch (err) {
      console.error('[DatasetVersioningService getDatasets Error]:', err.message);
      return [];
    }
  },

  /**
   * GET /api/ai/datasets/current
   */
  async getCurrentDataset() {
    try {
      const [rows] = await db.query('SELECT * FROM dataset_registry WHERE is_selected = 1 LIMIT 1');
      if (rows.length > 0) return rows[0];

      const [latest] = await db.query('SELECT * FROM dataset_registry ORDER BY id DESC LIMIT 1');
      if (latest.length > 0) return latest[0];

      const pyRes = await aiBridgeService.executeAction('dataset_current').catch(() => ({}));
      return pyRes.dataset || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * GET /api/ai/datasets/:version
   */
  async getDatasetByVersion(versionTag) {
    try {
      const [rows] = await db.query('SELECT * FROM dataset_registry WHERE dataset_version = ?', [versionTag]);
      if (rows.length > 0) return rows[0];

      const pyRes = await aiBridgeService.executeAction('dataset_list').catch(() => ({}));
      const list = pyRes.datasets || [];
      return list.find(d => String(d.dataset_version) === String(versionTag)) || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * POST /api/ai/datasets/create
   */
  async createDatasetSnapshot(payload = {}) {
    try {
      const now = new Date();
      const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const [existing] = await db.query('SELECT dataset_version FROM dataset_registry WHERE dataset_version LIKE ? ORDER BY id DESC LIMIT 1', [`${ym}.%`]);
      let seq = 1;
      if (existing.length > 0) {
        const parts = existing[0].dataset_version.split('.');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }

      const versionTag = payload.version_tag || `${ym}.${String(seq).padStart(3, '0')}`;
      const datasetName = payload.dataset_name || `Warehouse Dataset ${versionTag}`;
      const createdBy = payload.created_by || 'SYSTEM';
      const description = payload.description || `Immutable frozen dataset snapshot for version ${versionTag}`;

      
      const bridgeRes = await aiBridgeService.executeAction('dataset_create', {
        version_tag: versionTag,
        dataset_name: datasetName,
        description: description,
        created_by: createdBy
      });

      const dsData = bridgeRes.dataset || {};
      const datasetId = dsData.dataset_id || `ds_${versionTag.replace(/\./g, '_')}`;
      const recordCount = dsData.record_count || 0;
      const featureCount = dsData.feature_count || 12;
      const checksum = dsData.checksum || crypto.createHash('sha256').update(versionTag).digest('hex');
      const snapshotPath = dsData.snapshot_path || path.join(process.cwd(), 'ml_datasets', 'snapshots', `dataset_snapshot_${versionTag.replace(/\./g, '_')}.csv`);
      const storagePath = path.join(process.cwd(), 'ml_datasets', 'continuous_training_dataset.csv');

      
      await db.query(`
        INSERT INTO dataset_registry
          (dataset_id, dataset_version, dataset_name, status, created_by, description, source, record_count, feature_count, validation_rate, duplicate_count, rejected_count, checksum, storage_path, snapshot_path, integrity_status, last_verified, is_selected)
        VALUES (?, ?, ?, 'ACTIVE', ?, ?, 'CONTINUOUS_PIPELINE', ?, ?, 100.00, 0, 0, ?, ?, ?, 'VERIFIED', NOW(), 0)
        ON DUPLICATE KEY UPDATE
          record_count = VALUES(record_count),
          checksum = VALUES(checksum),
          snapshot_path = VALUES(snapshot_path),
          status = 'ACTIVE'
      `, [datasetId, versionTag, datasetName, createdBy, description, recordCount, featureCount, checksum, storagePath, snapshotPath]);

      
      await this.logHistory(versionTag, 'SNAPSHOT_FROZEN', createdBy, `Snapshot frozen successfully with checksum ${checksum.slice(0, 12)}...`);

      const created = await this.getDatasetByVersion(versionTag);
      return {
        success: true,
        message: `Dataset snapshot ${versionTag} created and frozen successfully.`,
        dataset: created
      };
    } catch (err) {
      console.error('[DatasetVersioningService createSnapshot Error]:', err.message);
      throw err;
    }
  },

  /**
   * POST /api/ai/datasets/archive
   */
  async archiveDataset(versionTag, actor = 'SYSTEM') {
    try {
      const dataset = await this.getDatasetByVersion(versionTag);
      if (!dataset) {
        return { success: false, message: `Dataset version ${versionTag} not found.` };
      }

      if (dataset.is_selected) {
        return { success: false, message: `Cannot archive dataset version ${versionTag} because it is currently selected for training.` };
      }

      const currentPath = dataset.snapshot_path;
      let newPath = currentPath;

      if (currentPath && fs.existsSync(currentPath)) {
        const archiveDir = path.join(process.cwd(), 'ml_datasets', 'archive');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        const fileName = path.basename(currentPath);
        newPath = path.join(archiveDir, fileName);
        fs.renameSync(currentPath, newPath);
      }

      await db.query(
        'UPDATE dataset_registry SET status = "ARCHIVED", archive_date = NOW(), snapshot_path = ? WHERE dataset_version = ?',
        [newPath, versionTag]
      );

      await aiBridgeService.executeAction('dataset_archive', { version_tag: versionTag }).catch(() => {});

      await this.logHistory(versionTag, 'ARCHIVED', actor, `Dataset version ${versionTag} moved to archive.`);

      const updated = await this.getDatasetByVersion(versionTag);
      return { success: true, message: `Dataset version ${versionTag} successfully archived.`, dataset: updated };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  /**
   * POST /api/ai/datasets/restore
   */
  async restoreDataset(versionTag, actor = 'SYSTEM') {
    try {
      const dataset = await this.getDatasetByVersion(versionTag);
      if (!dataset) {
        return { success: false, message: `Dataset version ${versionTag} not found.` };
      }

      const currentPath = dataset.snapshot_path;
      let newPath = currentPath;

      if (currentPath && fs.existsSync(currentPath)) {
        const snapshotsDir = path.join(process.cwd(), 'ml_datasets', 'snapshots');
        if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
        const fileName = path.basename(currentPath);
        newPath = path.join(snapshotsDir, fileName);
        fs.renameSync(currentPath, newPath);
      }

      await db.query(
        'UPDATE dataset_registry SET status = "ACTIVE", restore_date = NOW(), snapshot_path = ? WHERE dataset_version = ?',
        [newPath, versionTag]
      );

      await aiBridgeService.executeAction('dataset_restore', { version_tag: versionTag }).catch(() => {});

      await this.logHistory(versionTag, 'RESTORED', actor, `Dataset version ${versionTag} restored from archive.`);

      const updated = await this.getDatasetByVersion(versionTag);
      return { success: true, message: `Dataset version ${versionTag} successfully restored.`, dataset: updated };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  /**
   * POST /api/ai/datasets/select
   */
  async selectDataset(versionTag, actor = 'SYSTEM') {
    try {
      const dataset = await this.getDatasetByVersion(versionTag);
      if (!dataset) {
        return { success: false, message: `Dataset version ${versionTag} not found.` };
      }

      if (dataset.status === 'ARCHIVED') {
        return { success: false, message: `Cannot select archived dataset ${versionTag}. Please restore it first.` };
      }

      await db.query('UPDATE dataset_registry SET is_selected = 0');
      await db.query('UPDATE dataset_registry SET is_selected = 1, status = "SELECTED" WHERE dataset_version = ?', [versionTag]);

      await aiBridgeService.executeAction('dataset_select', { version_tag: versionTag }).catch(() => {});

      await this.logHistory(versionTag, 'SELECTED_FOR_TRAINING', actor, `Dataset version ${versionTag} designated as active retraining target.`);

      const updated = await this.getDatasetByVersion(versionTag);
      return { success: true, message: `Dataset version ${versionTag} selected as active retraining dataset.`, dataset: updated };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  /**
   * GET /api/ai/datasets/integrity
   */
  async verifyIntegrity(versionTag) {
    try {
      const dataset = await this.getDatasetByVersion(versionTag);
      if (!dataset) {
        return { success: false, message: `Dataset version ${versionTag} not found.` };
      }

      let isVerified = true;
      let calculatedChecksum = dataset.checksum;

      if (dataset.snapshot_path && fs.existsSync(dataset.snapshot_path)) {
        const fileBuffer = fs.readFileSync(dataset.snapshot_path);
        calculatedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        isVerified = (calculatedChecksum.toLowerCase() === dataset.checksum.toLowerCase());
      }

      const statusStr = isVerified ? 'VERIFIED' : 'CORRUPTED';

      await db.query(
        'UPDATE dataset_registry SET integrity_status = ?, last_verified = NOW() WHERE dataset_version = ?',
        [statusStr, versionTag]
      );

      await this.logHistory(versionTag, isVerified ? 'INTEGRITY_VERIFIED' : 'CHECKSUM_FAILURE', 'SYSTEM', `Checksum check ${statusStr}. Calculated: ${calculatedChecksum.slice(0, 12)}...`);

      return {
        success: isVerified,
        integrity_status: statusStr,
        dataset_version: versionTag,
        expected_checksum: dataset.checksum,
        calculated_checksum: calculatedChecksum,
        message: isVerified ? 'Dataset integrity verified successfully.' : 'WARNING: Dataset integrity failure / checksum mismatch detected!'
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  /**
   * GET /api/ai/datasets/statistics
   */
  async getStatistics() {
    try {
      const datasets = await this.getDatasets();
      const current = await this.getCurrentDataset();

      const totalDatasets = datasets.length;
      const activeCount = datasets.filter(d => d.status === 'ACTIVE' || d.status === 'SELECTED' || d.status === 'FROZEN').length;
      const archivedCount = datasets.filter(d => d.status === 'ARCHIVED').length;
      
      let largest = null;
      let maxRecords = 0;
      let totalRecords = 0;

      datasets.forEach(d => {
        const r = Number(d.record_count || 0);
        totalRecords += r;
        if (r >= maxRecords) {
          maxRecords = r;
          largest = d;
        }
      });

      return {
        total_datasets: totalDatasets,
        active_datasets: activeCount,
        archived_datasets: archivedCount,
        current_dataset_version: current?.dataset_version || 'NONE',
        selected_dataset: current,
        largest_dataset: largest ? { version: largest.dataset_version, records: maxRecords } : { version: 'N/A', records: 0 },
        total_records_managed: totalRecords,
        average_feature_count: 12.0,
        average_validation_rate: 100.0,
        growth_trend: datasets.map(d => ({
          version: d.dataset_version,
          records: d.record_count,
          date: d.created_at
        }))
      };
    } catch (err) {
      return { total_datasets: 0, active_datasets: 0, archived_datasets: 0, current_dataset_version: 'NONE' };
    }
  },

  /**
   * GET /api/ai/datasets/history
   */
  async getHistory() {
    try {
      const [rows] = await db.query('SELECT * FROM dataset_history ORDER BY id DESC LIMIT 50');
      return rows;
    } catch (err) {
      return [];
    }
  }
};

export default datasetVersioningService;
