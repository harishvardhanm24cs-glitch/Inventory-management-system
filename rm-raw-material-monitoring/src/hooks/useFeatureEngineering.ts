import { useState, useEffect, useCallback } from 'react';
import featureEngineeringService, { type FeaturePayload, type FeatureCatalogItem } from '../services/featureEngineeringService';

export const useFeatureEngineering = () => {
  const [data, setData] = useState<FeaturePayload | null>(null);
  const [catalog, setCatalog] = useState<FeatureCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [featRes, catRes] = await Promise.all([
        featureEngineeringService.getAllFeatures(),
        featureEngineeringService.getFeatureCatalog()
      ]);
      setData(featRes);
      setCatalog(catRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch engineered AI features.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return {
    data,
    catalog,
    loading,
    error,
    refresh: fetchFeatures
  };
};

export default useFeatureEngineering;
