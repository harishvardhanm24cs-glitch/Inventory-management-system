import { useState, useEffect, useCallback } from 'react';
import datasetVersioningService, {
  type DatasetItem,
  type DatasetHistoryItem,
  type DatasetStatistics
} from '../services/datasetVersioningService';

export const useDatasetVersioning = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [currentDataset, setCurrentDataset] = useState<DatasetItem | null>(null);
  const [statistics, setStatistics] = useState<DatasetStatistics | null>(null);
  const [history, setHistory] = useState<DatasetHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, currentRes, statsRes, historyRes] = await Promise.all([
        datasetVersioningService.getDatasets(),
        datasetVersioningService.getCurrentDataset(),
        datasetVersioningService.getStatistics(),
        datasetVersioningService.getHistory()
      ]);
      setDatasets(listRes);
      setCurrentDataset(currentRes);
      setStatistics(statsRes);
      setHistory(historyRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch dataset registry telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasetData();
    const interval = setInterval(() => {
      fetchDatasetData();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDatasetData]);

  const createSnapshot = async (payload?: { version_tag?: string; dataset_name?: string; description?: string }) => {
    setActionLoading(true);
    try {
      const res = await datasetVersioningService.createSnapshot(payload);
      await fetchDatasetData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  const archiveDataset = async (versionTag: string) => {
    setActionLoading(true);
    try {
      const res = await datasetVersioningService.archiveDataset(versionTag);
      await fetchDatasetData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  const restoreDataset = async (versionTag: string) => {
    setActionLoading(true);
    try {
      const res = await datasetVersioningService.restoreDataset(versionTag);
      await fetchDatasetData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  const selectDataset = async (versionTag: string) => {
    setActionLoading(true);
    try {
      const res = await datasetVersioningService.selectDataset(versionTag);
      await fetchDatasetData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  const verifyIntegrity = async (versionTag?: string) => {
    setActionLoading(true);
    try {
      const res = await datasetVersioningService.verifyIntegrity(versionTag);
      await fetchDatasetData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    datasets,
    currentDataset,
    statistics,
    history,
    loading,
    actionLoading,
    error,
    refresh: fetchDatasetData,
    createSnapshot,
    archiveDataset,
    restoreDataset,
    selectDataset,
    verifyIntegrity
  };
};

export default useDatasetVersioning;
