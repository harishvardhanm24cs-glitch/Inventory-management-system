import { useState, useEffect, useCallback } from 'react';
import modelComparisonService, {
  type ComparisonResult,
  type ModelRankingItem,
  type ComparisonHistoryItem
} from '../services/modelComparisonService';

export const useModelComparison = () => {
  const [activeComparison, setActiveComparison] = useState<ComparisonResult | null>(null);
  const [rankings, setRankings] = useState<ModelRankingItem[]>([]);
  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  
  const fetchComparisonData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rankingRes, historyRes] = await Promise.all([
        modelComparisonService.getRanking(),
        modelComparisonService.getHistory()
      ]);
      setRankings(rankingRes);
      setHistory(historyRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch model comparison data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComparisonData();
    
    const interval = setInterval(fetchComparisonData, 60000);
    return () => clearInterval(interval);
  }, [fetchComparisonData]);

  const runComparison = async (payload?: { production_model?: string; candidate_model?: string; weights?: any }) => {
    setActionLoading(true);
    try {
      const res = await modelComparisonService.compareModels(payload);
      if (res?.comparison) {
        setActiveComparison(res.comparison);
      }
      await fetchComparisonData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    activeComparison,
    rankings,
    history,
    loading,
    actionLoading,
    error,
    refresh: fetchComparisonData,
    runComparison
  };
};

export default useModelComparison;
