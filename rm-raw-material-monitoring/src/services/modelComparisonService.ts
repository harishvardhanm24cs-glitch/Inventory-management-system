import { apiService } from './api';

export interface ComparisonResult {
  production_model: string;
  candidate_model: string;
  winner: string;
  winner_name?: string;
  comparison_score: number;
  score_diff?: number;
  recommendation: 'ELIGIBLE_FOR_PROMOTION' | 'PARITY_MAINTAINED' | 'NEEDS_IMPROVEMENT' | 'REJECTED';
  confidence_score: number;
  reason: string;
  advantages: string[];
  disadvantages: string[];
  metrics_breakdown?: any;
}

export interface ModelRankingItem {
  rank: number;
  model_version: string;
  model_name: string;
  algorithm: string;
  status: string;
  dataset_version: string;
  mae: number;
  rmse: number;
  r2_score: number;
  cv_score: number;
  quality_score: number;
}

export interface ComparisonHistoryItem {
  id?: number;
  comparison_id: string;
  production_model: string;
  candidate_model: string;
  comparison_score: number;
  winner: string;
  recommendation: string;
  confidence_score: number;
  metric_summary?: any;
  created_at: string;
  created_by?: string;
}

class ModelComparisonService {
  async compareModels(payload?: { production_model?: string; candidate_model?: string; weights?: any }): Promise<any> {
    try {
      const res: any = typeof (apiService as any).compareModels === 'function'
        ? await (apiService as any).compareModels(payload || {})
        : await apiService.post('/ai/models/compare', payload || {});
      return res;
    } catch (err) {
      console.error('[ModelComparisonService] compareModels error:', err);
      return null;
    }
  }

  async getRanking(): Promise<ModelRankingItem[]> {
    try {
      const res: any = typeof (apiService as any).getModelRanking === 'function'
        ? await (apiService as any).getModelRanking()
        : await apiService.get('/ai/models/ranking');
      return res?.rankings || res?.data || res || [];
    } catch (err) {
      console.error('[ModelComparisonService] getRanking error:', err);
      return [];
    }
  }

  async getHistory(): Promise<ComparisonHistoryItem[]> {
    try {
      const res: any = typeof (apiService as any).getModelComparisons === 'function'
        ? await (apiService as any).getModelComparisons()
        : await apiService.get('/ai/models/comparisons');
      return res?.comparisons || res?.data || res || [];
    } catch (err) {
      console.error('[ModelComparisonService] getHistory error:', err);
      return [];
    }
  }

  async getRecommendation(prodVersion?: string, candVersion?: string): Promise<ComparisonResult | null> {
    try {
      const res: any = typeof (apiService as any).getModelRecommendation === 'function'
        ? await (apiService as any).getModelRecommendation(prodVersion, candVersion)
        : await apiService.get('/ai/models/recommendation', { params: { production: prodVersion, candidate: candVersion } });
      return res?.recommendation || res?.data || res || null;
    } catch (err) {
      console.error('[ModelComparisonService] getRecommendation error:', err);
      return null;
    }
  }
}

export const modelComparisonService = new ModelComparisonService();
export default modelComparisonService;
