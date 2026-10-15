
import { apiService } from './api';

export interface RuleItem {
  key: string;
  name: string;
  detail: string;
  passed: boolean;
}

export interface DeploymentDecision {
  decision_id: string;
  production_model: string;
  candidate_model: string;
  comparison_id?: string;
  decision: 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  reason: string;
  confidence: number;
  passed_rules: RuleItem[];
  failed_rules: RuleItem[];
  triggered_rules?: RuleItem[];
  manual_override: boolean;
  reviewed_by: string;
  created_at: string;
  comparison_score?: number;
}

export interface PolicyRuleConfig {
  name: string;
  description: string;
  enabled: boolean;
  metric?: string;
  operator?: string;
  expected_value?: string;
  allowed_statuses?: string[];
}

export type PolicyConfigMap = Record<string, PolicyRuleConfig>;

class DeploymentDecisionService {
  async evaluateCandidate(payload?: { candidate_model?: string; production_model?: string; reviewer?: string; policies?: any }): Promise<any> {
    try {
      const res: any = await apiService.post('/ai/deployment/evaluate', payload || {});
      
      return res;
    } catch (err) {
      console.error('[DeploymentDecisionService] evaluateCandidate error:', err);
      return null;
    }
  }

  async getDecision(decisionId?: string): Promise<DeploymentDecision | null> {
    try {
      const res: any = await apiService.get('/ai/deployment/decision', { params: { decision_id: decisionId } });
      
      return res?.decision ?? null;
    } catch (err) {
      console.error('[DeploymentDecisionService] getDecision error:', err);
      return null;
    }
  }

  async getHistory(filterType?: string): Promise<DeploymentDecision[]> {
    try {
      const res: any = await apiService.get('/ai/deployment/history', { params: { filter: filterType } });
      
      return Array.isArray(res?.history) ? res.history : [];
    } catch (err) {
      console.error('[DeploymentDecisionService] getHistory error:', err);
      return [];
    }
  }

  async overrideDecision(payload: { decision_id: string; override_action: string; reviewer?: string; reason?: string }): Promise<any> {
    try {
      const res: any = await apiService.post('/ai/deployment/override', payload);
      
      return res;
    } catch (err) {
      console.error('[DeploymentDecisionService] overrideDecision error:', err);
      return null;
    }
  }

  async getPolicies(): Promise<PolicyConfigMap | null> {
    try {
      const res: any = await apiService.get('/ai/deployment/policies');
      
      return res?.policies ?? null;
    } catch (err) {
      console.error('[DeploymentDecisionService] getPolicies error:', err);
      return null;
    }
  }

  async savePolicies(policies: PolicyConfigMap): Promise<any> {
    try {
      const res: any = await apiService.post('/ai/deployment/policies', { policies });
      return res;
    } catch (err) {
      console.error('[DeploymentDecisionService] savePolicies error:', err);
      return null;
    }
  }
}

export const deploymentDecisionService = new DeploymentDecisionService();
export default deploymentDecisionService;
