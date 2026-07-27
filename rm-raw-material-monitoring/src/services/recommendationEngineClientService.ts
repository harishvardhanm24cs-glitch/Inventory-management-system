import { apiService } from './api';

export type RecommendationCategory = 'LOW_STOCK' | 'DEAD_STOCK' | 'WAREHOUSE_HEALTH' | 'RACK_OPTIMIZATION' | 'CONSUMPTION_TREND' | 'INVENTORY_EFFICIENCY';
export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RecommendationItem {
  id: string;
  title: string;
  priority: RecommendationPriority;
  reason: string;
  confidence_score: number;
  suggested_action: string;
  timestamp: string;
  category: RecommendationCategory;
  target_id?: string;
}

export interface RecommendationEnginePayload {
  timestamp: string;
  active_strategy: string;
  total_count: number;
  categories: Record<RecommendationCategory, number>;
  recommendations: RecommendationItem[];
}

class RecommendationEngineClientService {
  async getRecommendations(): Promise<RecommendationEnginePayload | null> {
    try {
      const res: any = await (apiService as any).getRecommendationsEngine();
      return res?.data || res || null;
    } catch (err) {
      console.error('[RecommendationEngineClientService] getRecommendations error:', err);
      return null;
    }
  }

  async getRecommendationsByCategory(category: RecommendationCategory): Promise<RecommendationItem[]> {
    try {
      const res: any = await (apiService as any).getRecommendationsByCategory(category);
      return res?.data || res || [];
    } catch (err) {
      console.error(`[RecommendationEngineClientService] getRecommendationsByCategory error (${category}):`, err);
      return [];
    }
  }

  async switchStrategy(strategyName: string): Promise<any> {
    try {
      const res: any = await (apiService as any).switchRecommendationStrategy(strategyName);
      return res?.data || res || null;
    } catch (err) {
      console.error('[RecommendationEngineClientService] switchStrategy error:', err);
      throw err;
    }
  }
}

export const recommendationEngineClientService = new RecommendationEngineClientService();
export default recommendationEngineClientService;
