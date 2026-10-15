import { useState, useEffect, useCallback } from 'react';
import dataCollectionService, {
  type DataCollectionStatus,
  type DataCollectionStatistics,
  type DataCollectionLog
} from '../services/dataCollectionService';

export const useDataCollection = () => {
  const [statusData, setStatusData] = useState<DataCollectionStatus | null>(null);
  const [statsData, setStatsData] = useState<DataCollectionStatistics | null>(null);
  const [logs, setLogs] = useState<DataCollectionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollectionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, statsRes, logsRes] = await Promise.all([
        dataCollectionService.getStatus(),
        dataCollectionService.getStatistics(),
        dataCollectionService.getLogs()
      ]);
      setStatusData(statusRes);
      setStatsData(statsRes);
      setLogs(logsRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch continuous data collection telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollectionData();
    
    const interval = setInterval(() => {
      fetchCollectionData();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchCollectionData]);

  return {
    statusData,
    statsData,
    logs,
    pipelineStatus: statusData?.pipeline_status || 'HEALTHY',
    currentDatasetVersion: statusData?.current_dataset_version || statusData?.version || '2026.07.001',
    totalVersions: statusData?.total_versions || 1,
    todayRecords: statusData?.today_collected_records ?? 0,
    totalRecords: statusData?.total_collected_records ?? 0,
    successRate: statusData?.validation_success_rate ?? 100.0,
    duplicateBlocked: statusData?.duplicate_records_blocked ?? 0,
    rejectedRecords: statusData?.rejected_records ?? statsData?.rejected_records ?? 0,
    topValidationReasons: statusData?.top_validation_reasons || [],
    recentValidationErrors: statusData?.recent_validation_errors || [],
    latestCollectionTime: statusData?.latest_collection_time || new Date().toISOString(),
    loading,
    error,
    refresh: fetchCollectionData
  };
};

export default useDataCollection;
