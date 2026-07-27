import { useState, useEffect, useCallback } from 'react';
import mlPipelineService, {
  type MlPipelineStatus,
  type MlPipelineRunResult,
  type MlDatasetMeta,
  type MlExportPayload,
  type MlFramework
} from '../services/mlPipelineService';

export function useMlPipeline() {
  const [status, setStatus] = useState<MlPipelineStatus | null>(null);
  const [datasets, setDatasets] = useState<MlDatasetMeta[]>([]);
  const [lastRun, setLastRun] = useState<MlPipelineRunResult | null>(null);
  const [exportData, setExportData] = useState<MlExportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        mlPipelineService.getStatus(),
        mlPipelineService.getDatasets()
      ]);
      setStatus(s);
      setDatasets(d);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pipeline status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const runPipeline = useCallback(async (datasetName?: string) => {
    setRunning(true);
    setError(null);
    try {
      const result = await mlPipelineService.runPipeline(datasetName);
      setLastRun(result);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Pipeline execution failed');
    } finally {
      setRunning(false);
    }
  }, [fetchStatus]);

  const exportFramework = useCallback(async (framework: MlFramework) => {
    setExporting(true);
    setExportData(null);
    setError(null);
    try {
      const data = await mlPipelineService.exportDataset(framework);
      setExportData(data);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    status,
    datasets,
    lastRun,
    exportData,
    loading,
    running,
    exporting,
    error,
    refresh: fetchStatus,
    runPipeline,
    exportFramework
  };
}

export default useMlPipeline;
