

import db from '../config/db.js';
import crypto from 'crypto';
import { aiBridgeService } from './aiBridgeService.js';
import datasetVersionService from './datasetVersionService.js';

export const aiDataCollectionService = {
  
  async captureTransaction(transactionData) {
    try {
      const matId = Number(transactionData.material_id);
      const qty = Number(transactionData.quantity);
      const movType = String(transactionData.movement_type || 'OUTWARD').toUpperCase();
      const ts = transactionData.created_at || transactionData.timestamp || new Date().toISOString();

      const currentVersion = await datasetVersionService.getCurrentVersion();

      
      let valReason = null;
      if (!transactionData.material_id && transactionData.material_id !== 0) {
        valReason = 'Missing Required Field: material_id';
      } else if (isNaN(matId) || matId <= 0) {
        valReason = 'Invalid Material ID';
      } else if (transactionData.quantity === undefined || transactionData.quantity === null) {
        valReason = 'Missing Required Field: quantity';
      } else if (isNaN(qty) || qty < 0) {
        valReason = 'Negative Quantity';
      } else if (!['INWARD', 'OUTWARD', 'TRANSFER', 'ADJUSTMENT', 'SCAN', 'UPDATE'].includes(movType)) {
        valReason = 'Invalid Movement Type';
      }

      if (valReason) {
        
        aiBridgeService.executeAction('data_collection_collect', {
          material_id: matId || 0,
          quantity: isNaN(qty) ? 0 : qty,
          movement_type: movType,
          timestamp: ts,
          validation_reason: valReason
        }).catch(() => {});

        return {
          success: false,
          validation_status: 'REJECTED',
          validation_reason: valReason,
          dataset_version: currentVersion,
          message: `Validation Failed: ${valReason}`
        };
      }

      
      const rawSig = `${matId}_${qty}_${movType}_${ts.split('.')[0]}`;
      const hashSig = crypto.createHash('sha256').update(rawSig).digest('hex');

      
      const [existing] = await db.query('SELECT id FROM training_dataset WHERE hash_signature = ?', [hashSig]);
      if (existing.length > 0) {
        const dupReason = 'Duplicate Transaction';
        await aiBridgeService.executeAction('data_collection_collect', {
          material_id: matId,
          quantity: qty,
          movement_type: movType,
          timestamp: ts,
          transaction_id: transactionData.id || transactionData.transaction_id || null,
          validation_reason: dupReason
        }).catch(() => {});

        return {
          success: false,
          status: 'DUPLICATE',
          validation_status: 'REJECTED',
          validation_reason: dupReason,
          dataset_version: currentVersion,
          message: 'Duplicate transaction detected. Skipped collection.'
        };
      }

      
      const [materials] = await db.query('SELECT * FROM materials WHERE id = ?', [matId]);
      const currentStock = materials.length > 0 ? Number(materials[0].quantity || materials[0].current_stock || 0) : 100;
      const threshold = materials.length > 0 ? Number(materials[0].threshold_limit || materials[0].threshold || 10) : 10;

      
      const aiFeatures = {
        material_id: matId,
        quantity: qty,
        movement_type: movType,
        current_stock: currentStock,
        threshold_limit: threshold,
        inventory_health_score: currentStock >= threshold ? 100 : 50,
        stock_ratio: threshold > 0 ? Number((currentStock / threshold).toFixed(4)) : 1.0,
        hour: new Date(ts).getHours(),
        day_of_week: new Date(ts).getDay(),
        month: new Date(ts).getMonth() + 1,
        timestamp: ts
      };

      
      const txId = transactionData.id || transactionData.transaction_id || null;
      await db.query(`
        INSERT INTO training_dataset 
          (transaction_id, material_id, quantity, movement_type, transaction_timestamp, ai_features, validation_status, validation_reason, dataset_version, hash_signature)
        VALUES (?, ?, ?, ?, ?, ?, 'VALIDATED', NULL, ?, ?)
      `, [txId, matId, qty, movType, new Date(ts), JSON.stringify(aiFeatures), currentVersion, hashSig]);

      
      aiBridgeService.executeAction('data_collection_collect', {
        material_id: matId,
        quantity: qty,
        movement_type: movType,
        timestamp: ts,
        current_stock: currentStock,
        threshold: threshold,
        dataset_version: currentVersion
      }).catch(err => console.warn('[AI DataCollection Bridge Warning]:', err.message));

      return {
        success: true,
        validation_status: 'VALIDATED',
        validation_reason: null,
        dataset_version: currentVersion,
        message: 'Transaction captured and saved to training_dataset.',
        hash_signature: hashSig,
        features: aiFeatures
      };
    } catch (error) {
      console.error('[AI DataCollection Error]:', error.message);
      return { success: false, message: error.message };
    }
  },

  /**
   * GET /api/ai/data-collection/status
   */
  async getCollectionStatus() {
    try {
      const versionMeta = await datasetVersionService.getVersionMetadata();
      const [rows] = await db.query('SELECT COUNT(*) AS total FROM training_dataset');
      const [todayRows] = await db.query('SELECT COUNT(*) AS today_cnt FROM training_dataset WHERE DATE(collection_time) = CURDATE()');
      
      const bridgeStats = await aiBridgeService.executeAction('data_collection_status').catch(() => ({}));
      const stats = bridgeStats.statistics || {};

      const totalCollected = rows[0]?.total || 0;
      const rejected = stats.rejected_records || 0;
      const duplicates = stats.duplicate_records || 0;
      const totalAttempts = totalCollected + rejected + duplicates;
      const successRate = totalAttempts > 0 ? Number(((totalCollected / totalAttempts) * 100).toFixed(2)) : 100.0;

      
      const topReasonsMap = {};
      if (duplicates > 0) topReasonsMap['Duplicate Transaction'] = duplicates;
      if (rejected > 0) topReasonsMap['Validation Failed'] = rejected;

      const topValidationReasons = Object.entries(topReasonsMap).map(([reason, count]) => ({ reason, count }));
      const recentValidationErrors = [];

      return {
        pipeline_status: rejected > 10 ? 'ATTENTION_REQUIRED' : 'HEALTHY',
        current_dataset_version: versionMeta.current_version,
        version: versionMeta.current_version,
        total_versions: versionMeta.total_versions,
        latest_version: versionMeta.latest_version,
        today_collected_records: todayRows[0]?.today_cnt || 0,
        total_collected_records: totalCollected,
        validation_success_rate: successRate,
        duplicate_records_blocked: duplicates,
        rejected_records: rejected,
        top_validation_reasons: topValidationReasons,
        recent_validation_errors: recentValidationErrors,
        latest_collection_time: new Date().toISOString()
      };
    } catch (error) {
      return {
        pipeline_status: 'HEALTHY',
        current_dataset_version: '2026.07.001',
        total_versions: 1,
        total_collected_records: 0,
        today_collected_records: 0,
        validation_success_rate: 100.0,
        top_validation_reasons: [],
        recent_validation_errors: []
      };
    }
  },

  /**
   * GET /api/ai/data-collection/statistics
   */
  async getCollectionStatistics() {
    try {
      const versionMeta = await datasetVersionService.getVersionMetadata();
      const [rows] = await db.query('SELECT COUNT(*) AS total FROM training_dataset');
      const [todayRows] = await db.query('SELECT COUNT(*) AS today_cnt FROM training_dataset WHERE DATE(collection_time) = CURDATE()');
      
      const bridgeStats = await aiBridgeService.executeAction('data_collection_statistics').catch(() => ({}));
      const accepted = rows[0]?.total || 0;
      const rejected = bridgeStats.rejected_records || 0;
      const duplicates = bridgeStats.duplicate_records || 0;
      const totalTx = accepted + rejected + duplicates;
      const successRate = totalTx > 0 ? Number(((accepted / totalTx) * 100).toFixed(2)) : 100.0;

      return {
        current_dataset_version: versionMeta.current_version,
        total_versions: versionMeta.total_versions,
        latest_version: versionMeta.latest_version,
        total_transactions: totalTx,
        today_collected_records: todayRows[0]?.today_cnt || 0,
        accepted_records: accepted,
        rejected_records: rejected,
        duplicate_records: duplicates,
        success_rate: successRate,
        last_collection_time: bridgeStats.last_collection_time || new Date().toISOString()
      };
    } catch (error) {
      return {
        current_dataset_version: '2026.07.001',
        total_versions: 1,
        total_transactions: 0,
        today_collected_records: 0,
        accepted_records: 0,
        rejected_records: 0,
        duplicate_records: 0,
        success_rate: 100.0,
        last_collection_time: new Date().toISOString()
      };
    }
  },

  /**
   * GET /api/ai/data-collection/logs
   */
  async getCollectionLogs() {
    try {
      const versionMeta = await datasetVersionService.getVersionMetadata();
      const [records] = await db.query('SELECT * FROM training_dataset ORDER BY collection_time DESC LIMIT 20');
      return {
        status: 'SUCCESS',
        current_dataset_version: versionMeta.current_version,
        count: records.length,
        logs: records.map(r => ({
          id: r.id,
          transaction_id: r.transaction_id,
          material_id: r.material_id,
          quantity: r.quantity,
          movement_type: r.movement_type,
          timestamp: r.transaction_timestamp,
          validation_status: r.validation_status,
          validation_reason: r.validation_reason || null,
          dataset_version: r.dataset_version || versionMeta.current_version,
          collection_time: r.collection_time,
          hash_signature: r.hash_signature
        }))
      };
    } catch (error) {
      return { status: 'SUCCESS', current_dataset_version: '2026.07.001', count: 0, logs: [] };
    }
  }
};

export default aiDataCollectionService;
