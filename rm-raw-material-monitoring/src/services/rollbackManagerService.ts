
import { apiService } from './api';

export interface EligibilityCheck {
  check: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  model_version: string;
  model_name: string;
  status: string;
  checks: EligibilityCheck[];
  failure_reasons: string[];
  passed_count: number;
  total_checks: number;
}

export interface RollbackTarget {
  model_version: string;
  model_name: string;
  algorithm: string;
  status: string;
  mae: number;
  rmse: number;
  r2_score: number;
  cv_score: number;
  dataset_version: string;
  checksum: string;
  artifact_path: string;
  _eligibility?: EligibilityResult;
}

export interface SimulationStep {
  step: number;
  name: string;
  description: string;
  passed: boolean;
  detail: string;
}

export interface SimulationResult {
  simulation_id: string;
  rollback_id: string;
  target_model: string;
  passed: boolean;
  status: string;
  steps: SimulationStep[];
  steps_passed: number;
  steps_total: number;
  errors: string[];
  duration_ms: number;
  timestamp: string;
  note: string;
}

export interface PerformanceDelta {
  mae_delta: number;
  r2_delta: number;
  rmse_delta: number;
}

export interface RollbackPlan {
  rollback_id: string;
  status: string;
  current_production_model: string;
  current_model_name: string;
  current_model_algorithm: string;
  target_model: string;
  target_model_name: string;
  target_model_algorithm: string;
  target_model_status: string;
  target_dataset_version: string;
  reason: string;
  requested_by: string;
  artifact_status: string;
  artifact_size_bytes: number;
  checksum: string;
  checksum_status: string;
  dataset_status: string;
  eligibility_result: EligibilityResult;
  validation_result: string;
  validation_failure_reasons: string[];
  performance_delta: PerformanceDelta;
  target_metrics: { mae: number; rmse: number; r2_score: number; cv_score: number };
  current_metrics: { mae: number; rmse: number; r2_score: number; cv_score: number };
  created_at: string;
  simulation_result: SimulationResult | null;
  approval_status: string;
  decision?: string;
  reviewed_by: string | null;
  approved_at: string | null;
  manual_override?: boolean;
}

export interface RollbackHistoryEntry {
  rollback_id: string;
  current_production_model?: string;
  current_model?: string;
  target_model: string;
  decision: string;
  event_type?: string;
  reason: string;
  reviewed_by: string;
  manual_override: boolean;
  artifact_status?: string;
  checksum_status?: string;
  dataset_status?: string;
  validation_result?: string;
  created_at: string;
}

class RollbackManagerService {
  async getEligibleTargets(): Promise<{ eligible_targets: RollbackTarget[]; production_model: string; production_model_name: string; eligible_count: number }> {
    try {
      const res: any = await apiService.get('/ai/rollback/eligible');
      return {
        eligible_targets: res?.eligible_targets || [],
        production_model: res?.production_model || 'v1.0.0',
        production_model_name: res?.production_model_name || 'Production Model',
        eligible_count: res?.eligible_count || 0
      };
    } catch (err) {
      console.error('[RollbackManagerService] getEligibleTargets error:', err);
      return { eligible_targets: [], production_model: '', production_model_name: '', eligible_count: 0 };
    }
  }

  async requestRollback(payload: { target_version?: string; reason?: string; requested_by?: string }): Promise<{ rollback_plan: RollbackPlan | null; message: string }> {
    try {
      const res: any = await apiService.post('/ai/rollback/request', payload);
      return { rollback_plan: res?.rollback_plan ?? null, message: res?.message || 'Plan created.' };
    } catch (err) {
      console.error('[RollbackManagerService] requestRollback error:', err);
      return { rollback_plan: null, message: 'Failed to create rollback plan.' };
    }
  }

  async simulate(payload: { rollback_id?: string; target_version?: string; requested_by?: string }): Promise<{ simulation: SimulationResult | null; rollback_plan: RollbackPlan | null; message: string }> {
    try {
      const res: any = await apiService.post('/ai/rollback/simulate', payload);
      return {
        simulation: res?.simulation ?? null,
        rollback_plan: res?.rollback_plan ?? null,
        message: res?.message || 'Simulation complete.'
      };
    } catch (err) {
      console.error('[RollbackManagerService] simulate error:', err);
      return { simulation: null, rollback_plan: null, message: 'Simulation failed.' };
    }
  }

  async approve(payload: { rollback_id: string; reviewer?: string; reason?: string }): Promise<{ rollback_plan: RollbackPlan | null; message: string }> {
    try {
      const res: any = await apiService.post('/ai/rollback/approve', payload);
      return { rollback_plan: res?.rollback_plan ?? null, message: res?.message || 'Approved.' };
    } catch (err) {
      console.error('[RollbackManagerService] approve error:', err);
      return { rollback_plan: null, message: 'Approval failed.' };
    }
  }

  async reject(payload: { rollback_id: string; reviewer?: string; reason?: string }): Promise<{ rollback_plan: RollbackPlan | null; message: string }> {
    try {
      const res: any = await apiService.post('/ai/rollback/reject', payload);
      return { rollback_plan: res?.rollback_plan ?? null, message: res?.message || 'Rejected.' };
    } catch (err) {
      console.error('[RollbackManagerService] reject error:', err);
      return { rollback_plan: null, message: 'Rejection failed.' };
    }
  }

  async getHistory(filterType?: string): Promise<RollbackHistoryEntry[]> {
    try {
      const params = filterType ? { filter: filterType } : {};
      const res: any = await apiService.get('/ai/rollback/history', { params });
      return Array.isArray(res?.history) ? res.history : [];
    } catch (err) {
      console.error('[RollbackManagerService] getHistory error:', err);
      return [];
    }
  }
}

export const rollbackManagerService = new RollbackManagerService();
export default rollbackManagerService;
