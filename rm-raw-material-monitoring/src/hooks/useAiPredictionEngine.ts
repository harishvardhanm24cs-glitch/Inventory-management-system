import { useState, useEffect, useCallback } from 'react';
import predictionEngineService, { type PredictionEngineOverview } from '../services/predictionEngineService';

export function useAiPredictionEngine() {
  const [data, setData] = useState<PredictionEngineOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await predictionEngineService.getOverview();
      setData(overview);
    } catch (err: any) {
      console.error('[useAiPredictionEngine] Failed to load predictions:', err);
      setError(err.message || 'Failed to load AI predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    data,
    loading,
    error,
    refresh: fetchPredictions,
    demand: data?.predictions?.demand || [],
    depletion: data?.predictions?.depletion || [],
    rackUtilization: data?.predictions?.rack_utilization || [],
    warehouseRisk: data?.predictions?.warehouse_risk || null,
    consumptionTrend: data?.predictions?.consumption_trend || [],
    strategyName: data?.model_strategy || 'Default Engine'
  };
}

export default useAiPredictionEngine;
