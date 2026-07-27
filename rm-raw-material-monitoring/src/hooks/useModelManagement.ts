import { useState, useEffect, useCallback } from 'react';
import modelManagementService, {
  type ModelMetadata,
  type PerformanceAnalyticsPayload,
  type RegisterModelPayload
} from '../services/modelManagementService';

export const useModelManagement = () => {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [performance, setPerformance] = useState<PerformanceAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModelData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mList, perf] = await Promise.all([
        modelManagementService.getModels(),
        modelManagementService.getPerformance()
      ]);
      setModels(mList);
      setPerformance(perf);
    } catch (err: any) {
      setError(err?.message || 'Failed to load model registry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelData();
  }, [fetchModelData]);

  const switchModel = async (modelId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await modelManagementService.switchModel(modelId);
      await fetchModelData();
    } catch (err: any) {
      setError(err?.message || `Failed to switch to model ${modelId}`);
    } finally {
      setActionLoading(false);
    }
  };

  const registerModel = async (payload: RegisterModelPayload) => {
    setActionLoading(true);
    setError(null);
    try {
      await modelManagementService.registerModel(payload);
      await fetchModelData();
    } catch (err: any) {
      setError(err?.message || 'Failed to register model.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const loadModel = async (modelId?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await modelManagementService.loadModel(modelId);
      await fetchModelData();
    } catch (err: any) {
      setError(err?.message || 'Failed to load model into memory.');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    models,
    performance,
    activeModelId: performance?.active_model_id || 'statistical_ml_default',
    loading,
    actionLoading,
    error,
    refresh: fetchModelData,
    switchModel,
    registerModel,
    loadModel
  };
};

export default useModelManagement;
