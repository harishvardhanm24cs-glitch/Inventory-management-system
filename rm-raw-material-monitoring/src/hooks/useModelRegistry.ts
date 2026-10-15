import { useState, useEffect, useCallback } from 'react';
import modelRegistryService, {
  type ModelItem,
  type ModelHistoryItem,
  type ModelMetrics
} from '../services/modelRegistryService';

export const useModelRegistry = () => {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [productionModel, setProductionModel] = useState<ModelItem | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [history, setHistory] = useState<ModelHistoryItem[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModelRegistryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, prodRes, metricsRes, historyRes, artifactsRes] = await Promise.all([
        modelRegistryService.getModels(),
        modelRegistryService.getCurrentProductionModel(),
        modelRegistryService.getMetrics(),
        modelRegistryService.getHistory(),
        modelRegistryService.getArtifacts()
      ]);
      setModels(listRes);
      setProductionModel(prodRes);
      setMetrics(metricsRes);
      setHistory(historyRes);
      setArtifacts(artifactsRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch model registry telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelRegistryData();
    const interval = setInterval(() => {
      fetchModelRegistryData();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchModelRegistryData]);

  const registerModel = async (payload?: any) => {
    setActionLoading(true);
    try {
      const res = await modelRegistryService.registerModel(payload);
      await fetchModelRegistryData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  const promoteModel = async (versionTag: string) => {
    setActionLoading(true);
    try {
      const res = await modelRegistryService.promoteModel(versionTag);
      await fetchModelRegistryData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  const archiveModel = async (versionTag: string) => {
    setActionLoading(true);
    try {
      const res = await modelRegistryService.archiveModel(versionTag);
      await fetchModelRegistryData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async (versionTag: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await modelRegistryService.updateStatus(versionTag, status);
      await fetchModelRegistryData();
      return res;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    models,
    productionModel,
    metrics,
    history,
    artifacts,
    loading,
    actionLoading,
    error,
    refresh: fetchModelRegistryData,
    registerModel,
    promoteModel,
    archiveModel,
    updateStatus
  };
};

export default useModelRegistry;
