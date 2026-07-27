import { useState, useEffect, useCallback } from 'react';
import aiMonitoringClientService, { type AiHealthSummaryPayload } from '../services/aiMonitoringClientService';

export const useAiMonitoring = () => {
  const [healthData, setHealthData] = useState<AiHealthSummaryPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiMonitoringClientService.getAiHealth();
      setHealthData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch AI monitoring telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealthData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const resetMetrics = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await aiMonitoringClientService.resetMetrics();
      await fetchHealthData();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset AI monitoring telemetry.');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    healthData,
    healthIndex: healthData?.health_index ?? 95,
    status: healthData?.status || 'HEALTHY',
    metrics: healthData?.metrics,
    loading,
    actionLoading,
    error,
    refresh: fetchHealthData,
    resetMetrics
  };
};

export default useAiMonitoring;
