

import { aiBridgeService } from './aiBridgeService.js';
import db from '../config/db.js';

export const deploymentDecisionService = {
  /**
   * POST /api/ai/deployment/evaluate
   * Evaluates a candidate model against production model and policies.
   */
  async evaluateCandidate(payload = {}) {
    try {
      const res = await aiBridgeService.executeAction('deployment_evaluate', payload);
      const decision = res?.decision;
      if (decision && db) {
        try {
          await db.query(
            `INSERT INTO deployment_decisions 
              (decision_id, candidate_model, production_model, comparison_id, decision, reason, confidence, passed_rules, failed_rules, manual_override, reviewed_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
              decision = VALUES(decision),
              reason = VALUES(reason),
              confidence = VALUES(confidence),
              passed_rules = VALUES(passed_rules),
              failed_rules = VALUES(failed_rules),
              manual_override = VALUES(manual_override),
              reviewed_by = VALUES(reviewed_by)`,
            [
              decision.decision_id,
              decision.candidate_model,
              decision.production_model,
              decision.comparison_id || null,
              decision.decision,
              decision.reason,
              decision.confidence || 0,
              JSON.stringify(decision.passed_rules || []),
              JSON.stringify(decision.failed_rules || []),
              decision.manual_override ? 1 : 0,
              decision.reviewed_by || 'SYSTEM'
            ]
          );
        } catch (dbErr) {
          console.warn('[DeploymentDecisionService] DB insertion warning:', dbErr.message);
        }
      }
      return res;
    } catch (err) {
      console.error('[DeploymentDecisionService] evaluateCandidate error:', err.message);
      throw err;
    }
  },

  /**
   * GET /api/ai/deployment/decision
   * Fetches specific decision by ID or the latest deployment decision.
   */
  async getDecision(decisionId) {
    try {
      if (decisionId && db) {
        try {
          const [rows] = await db.query('SELECT * FROM deployment_decisions WHERE decision_id = ? LIMIT 1', [decisionId]);
          if (rows.length > 0) {
            const row = rows[0];
            return {
              status: 'SUCCESS',
              decision: {
                decision_id: row.decision_id,
                candidate_model: row.candidate_model,
                production_model: row.production_model,
                comparison_id: row.comparison_id,
                decision: row.decision,
                reason: row.reason,
                confidence: parseFloat(row.confidence),
                passed_rules: typeof row.passed_rules === 'string' ? JSON.parse(row.passed_rules) : (row.passed_rules || []),
                failed_rules: typeof row.failed_rules === 'string' ? JSON.parse(row.failed_rules) : (row.failed_rules || []),
                manual_override: Boolean(row.manual_override),
                reviewed_by: row.reviewed_by,
                created_at: row.created_at
              }
            };
          }
        } catch (dbErr) {
          console.warn('[DeploymentDecisionService] DB fetch decision warning:', dbErr.message);
        }
      }
      return await aiBridgeService.executeAction('deployment_decision', { decision_id: decisionId });
    } catch (err) {
      console.error('[DeploymentDecisionService] getDecision error:', err.message);
      throw err;
    }
  },

  /**
   * GET /api/ai/deployment/history
   * Retrieves deployment evaluation history.
   */
  async getHistory(filterType) {
    try {
      if (db) {
        try {
          let sql = 'SELECT * FROM deployment_decisions ORDER BY created_at DESC LIMIT 100';
          let params = [];
          if (filterType) {
            const ft = filterType.toUpperCase();
            if (ft === 'OVERRIDDEN') {
              sql = 'SELECT * FROM deployment_decisions WHERE manual_override = 1 ORDER BY created_at DESC LIMIT 100';
            } else {
              sql = 'SELECT * FROM deployment_decisions WHERE UPPER(decision) = ? ORDER BY created_at DESC LIMIT 100';
              params = [ft];
            }
          }
          const [rows] = await db.query(sql, params);
          if (rows && rows.length > 0) {
            const history = rows.map(row => ({
              decision_id: row.decision_id,
              candidate_model: row.candidate_model,
              production_model: row.production_model,
              comparison_id: row.comparison_id,
              decision: row.decision,
              reason: row.reason,
              confidence: parseFloat(row.confidence),
              passed_rules: typeof row.passed_rules === 'string' ? JSON.parse(row.passed_rules) : (row.passed_rules || []),
              failed_rules: typeof row.failed_rules === 'string' ? JSON.parse(row.failed_rules) : (row.failed_rules || []),
              manual_override: Boolean(row.manual_override),
              reviewed_by: row.reviewed_by,
              created_at: row.created_at
            }));
            return { status: 'SUCCESS', history };
          }
        } catch (dbErr) {
          console.warn('[DeploymentDecisionService] DB fetch history warning:', dbErr.message);
        }
      }
      return await aiBridgeService.executeAction('deployment_history', { filter_type: filterType });
    } catch (err) {
      console.error('[DeploymentDecisionService] getHistory error:', err.message);
      throw err;
    }
  },

  /**
   * POST /api/ai/deployment/override
   * Applies manual approval or rejection override.
   */
  async overrideDecision(payload = {}) {
    try {
      const res = await aiBridgeService.executeAction('deployment_override', payload);
      const decision = res?.decision;
      if (decision && db) {
        try {
          await db.query(
            `UPDATE deployment_decisions 
             SET decision = ?, reason = ?, manual_override = 1, reviewed_by = ? 
             WHERE decision_id = ?`,
            [
              decision.decision,
              decision.reason,
              decision.reviewed_by || payload.reviewer || 'MANAGER',
              decision.decision_id
            ]
          );
        } catch (dbErr) {
          console.warn('[DeploymentDecisionService] DB update override warning:', dbErr.message);
        }
      }
      return res;
    } catch (err) {
      console.error('[DeploymentDecisionService] overrideDecision error:', err.message);
      throw err;
    }
  },

  /**
   * GET /api/ai/deployment/policies
   */
  async getPolicies() {
    try {
      return await aiBridgeService.executeAction('deployment_policies_get');
    } catch (err) {
      console.error('[DeploymentDecisionService] getPolicies error:', err.message);
      throw err;
    }
  },

  /**
   * POST /api/ai/deployment/policies
   */
  async savePolicies(payload = {}) {
    try {
      return await aiBridgeService.executeAction('deployment_policies_save', payload);
    } catch (err) {
      console.error('[DeploymentDecisionService] savePolicies error:', err.message);
      throw err;
    }
  }
};

export default deploymentDecisionService;
