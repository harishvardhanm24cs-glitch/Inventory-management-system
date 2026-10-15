

import { aiBridgeService } from './aiBridgeService.js';
import db from '../config/db.js';

async function persistPlan(plan) {
  if (!plan || !plan.rollback_id || !db) return;
  try {
    await db.query(
      `INSERT INTO rollback_history
        (rollback_id, current_model, target_model, decision, simulation_result,
         reason, reviewed_by, manual_override, eligibility_passed, artifact_status,
         checksum_status, dataset_status, validation_result, target_dataset_version)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         decision            = VALUES(decision),
         simulation_result   = VALUES(simulation_result),
         reason              = VALUES(reason),
         reviewed_by         = VALUES(reviewed_by),
         manual_override     = VALUES(manual_override),
         eligibility_passed  = VALUES(eligibility_passed),
         artifact_status     = VALUES(artifact_status),
         checksum_status     = VALUES(checksum_status),
         dataset_status      = VALUES(dataset_status),
         validation_result   = VALUES(validation_result)`,
      [
        plan.rollback_id,
        plan.current_production_model || plan.current_model || 'unknown',
        plan.target_model || 'unknown',
        plan.approval_status || plan.decision || 'PENDING',
        plan.simulation_result
          ? JSON.stringify(plan.simulation_result)
          : null,
        plan.reason || '',
        plan.reviewed_by || plan.requested_by || 'SYSTEM',
        plan.manual_override ? 1 : 0,
        plan.eligibility_result?.eligible ? 1 : 0,
        plan.artifact_status || 'UNKNOWN',
        plan.checksum_status || 'UNKNOWN',
        plan.dataset_status || 'UNKNOWN',
        plan.validation_result || 'PENDING',
        plan.target_dataset_version || ''
      ]
    );
  } catch (dbErr) {
    console.warn('[RollbackService] DB persist warning:', dbErr.message);
  }
}

function formatDbRow(row) {
  return {
    rollback_id: row.rollback_id,
    current_production_model: row.current_model,
    target_model: row.target_model,
    approval_status: row.decision,
    decision: row.decision,
    simulation_result: typeof row.simulation_result === 'string'
      ? (() => { try { return JSON.parse(row.simulation_result); } catch { return null; } })()
      : row.simulation_result,
    reason: row.reason,
    reviewed_by: row.reviewed_by,
    manual_override: Boolean(row.manual_override),
    eligibility_passed: Boolean(row.eligibility_passed),
    artifact_status: row.artifact_status,
    checksum_status: row.checksum_status,
    dataset_status: row.dataset_status,
    validation_result: row.validation_result,
    target_dataset_version: row.target_dataset_version,
    created_at: row.created_at
  };
}

export const rollbackService = {

  /** GET /api/ai/rollback/eligible */
  async getEligibleTargets() {
    try {
      return await aiBridgeService.executeAction('rollback_eligible', {});
    } catch (err) {
      console.error('[RollbackService] getEligibleTargets error:', err.message);
      throw err;
    }
  },

  /** POST /api/ai/rollback/request */
  async requestRollback(payload = {}) {
    try {
      const res = await aiBridgeService.executeAction('rollback_request', payload);
      if (res?.rollback_plan) {
        await persistPlan(res.rollback_plan);
      }
      return res;
    } catch (err) {
      console.error('[RollbackService] requestRollback error:', err.message);
      throw err;
    }
  },

  /** POST /api/ai/rollback/simulate */
  async simulate(payload = {}) {
    try {
      const res = await aiBridgeService.executeAction('rollback_simulate', payload);
      if (res?.rollback_plan) {
        await persistPlan(res.rollback_plan);
      }
      return res;
    } catch (err) {
      console.error('[RollbackService] simulate error:', err.message);
      throw err;
    }
  },

  /** POST /api/ai/rollback/approve */
  async approve(payload = {}) {
    try {
      const res = await aiBridgeService.executeAction('rollback_approve', payload);
      if (res?.rollback_plan) {
        await persistPlan(res.rollback_plan);
      }
      return res;
    } catch (err) {
      console.error('[RollbackService] approve error:', err.message);
      throw err;
    }
  },

  /** POST /api/ai/rollback/reject */
  async reject(payload = {}) {
    try {
      const res = await aiBridgeService.executeAction('rollback_reject', payload);
      if (res?.rollback_plan) {
        await persistPlan(res.rollback_plan);
      }
      return res;
    } catch (err) {
      console.error('[RollbackService] reject error:', err.message);
      throw err;
    }
  },

  /** POST /api/ai/rollback/override */
  async override(payload = {}) {
    try {
      const res = await aiBridgeService.executeAction('rollback_override', payload);
      if (res?.rollback_plan) {
        await persistPlan(res.rollback_plan);
      }
      return res;
    } catch (err) {
      console.error('[RollbackService] override error:', err.message);
      throw err;
    }
  },

  /** GET /api/ai/rollback/history */
  async getHistory(filterType) {
    
    if (db) {
      try {
        let sql = 'SELECT * FROM rollback_history ORDER BY created_at DESC LIMIT 200';
        let params = [];
        if (filterType) {
          const ft = filterType.toUpperCase();
          if (ft === 'OVERRIDE' || ft === 'MANUAL_OVERRIDE') {
            sql = 'SELECT * FROM rollback_history WHERE manual_override = 1 ORDER BY created_at DESC LIMIT 200';
          } else {
            sql = 'SELECT * FROM rollback_history WHERE UPPER(decision) = ? ORDER BY created_at DESC LIMIT 200';
            params = [ft];
          }
        }
        const [rows] = await db.query(sql, params);
        if (rows && rows.length > 0) {
          return { status: 'SUCCESS', history: rows.map(formatDbRow) };
        }
      } catch (dbErr) {
        console.warn('[RollbackService] DB history warning:', dbErr.message);
      }
    }
    try {
      const res = await aiBridgeService.executeAction('rollback_history', { filter_type: filterType });
      return { status: 'SUCCESS', history: res?.history || [] };
    } catch (err) {
      console.error('[RollbackService] getHistory error:', err.message);
      return { status: 'SUCCESS', history: [] };
    }
  },

  /** GET /api/ai/rollback/latest */
  async getLatestPlan() {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM rollback_history ORDER BY created_at DESC LIMIT 1');
        if (rows && rows.length > 0) {
          return { status: 'SUCCESS', rollback_plan: formatDbRow(rows[0]) };
        }
      } catch (dbErr) {
        console.warn('[RollbackService] DB latest plan warning:', dbErr.message);
      }
    }
    try {
      return await aiBridgeService.executeAction('rollback_latest', {});
    } catch (err) {
      return { status: 'SUCCESS', rollback_plan: null };
    }
  }
};

export default rollbackService;
