import { useState, useEffect, useCallback } from 'react';
import recommendationEngineClientService, {
  type RecommendationEnginePayload,
  type RecommendationItem,
  type RecommendationCategory
} from '../services/recommendationEngineClientService';

export const useRecommendationEngine = () => {
  const [data, setData] = useState<RecommendationEnginePayload | null>(null);
  const [activeCategory, setActiveCategory] = useState<RecommendationCategory | 'ALL'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recommendationEngineClientService.getRecommendations();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load warehouse AI recommendations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const recommendationsList: RecommendationItem[] = data?.recommendations || [];
  const filteredRecommendations = activeCategory === 'ALL'
    ? recommendationsList
    : recommendationsList.filter(r => r.category === activeCategory);

  return {
    data,
    recommendations: filteredRecommendations,
    totalCount: data?.total_count || 0,
    activeCategory,
    setActiveCategory,
    activeStrategy: data?.active_strategy || 'DefaultRuleHeuristicRecommendationStrategy',
    categoryCounts: data?.categories || {
      LOW_STOCK: 0,
      DEAD_STOCK: 0,
      WAREHOUSE_HEALTH: 0,
      RACK_OPTIMIZATION: 0,
      CONSUMPTION_TREND: 0,
      INVENTORY_EFFICIENCY: 0
    },
    loading,
    error,
    refresh: fetchRecommendations
  };
};

export default useRecommendationEngine;
