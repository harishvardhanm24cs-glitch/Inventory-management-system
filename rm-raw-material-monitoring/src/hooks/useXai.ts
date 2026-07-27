import { useState, useEffect, useCallback } from 'react';
import xaiService, { type XaiExplanation, type PortalXaiPayload } from '../services/xaiService';

export type XaiPortal = 'Dashboard' | 'Digital Twin' | 'Reports' | 'Manager Portal';

export const useXai = () => {
  const [activePortal, setActivePortal] = useState<XaiPortal>('Dashboard');
  const [portalData, setPortalData] = useState<PortalXaiPayload | null>(null);
  const [selectedExplanation, setSelectedExplanation] = useState<XaiExplanation | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortalXai = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res: PortalXaiPayload | null = null;
      if (activePortal === 'Dashboard') res = await xaiService.getDashboardXai();
      else if (activePortal === 'Digital Twin') res = await xaiService.getDigitalTwinXai();
      else if (activePortal === 'Reports') res = await xaiService.getReportsXai();
      else if (activePortal === 'Manager Portal') res = await xaiService.getManagerPortalXai();

      setPortalData(res);
    } catch (err: any) {
      setError(err?.message || `Failed to fetch XAI payload for ${activePortal}`);
    } finally {
      setLoading(false);
    }
  }, [activePortal]);

  useEffect(() => {
    fetchPortalXai();
  }, [fetchPortalXai]);

  const inspectMaterialXai = async (materialId: string) => {
    setLoading(true);
    try {
      const exp = await xaiService.explainMaterial(materialId);
      if (exp) {
        setSelectedExplanation(exp);
        setModalOpen(true);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to inspect explanation for material ${materialId}`);
    } finally {
      setLoading(false);
    }
  };

  const inspectRackXai = async (rackCode: string) => {
    setLoading(true);
    try {
      const exp = await xaiService.explainRack(rackCode);
      if (exp) {
        setSelectedExplanation(exp);
        setModalOpen(true);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to inspect explanation for rack ${rackCode}`);
    } finally {
      setLoading(false);
    }
  };

  const openExplanationModal = (exp: XaiExplanation) => {
    setSelectedExplanation(exp);
    setModalOpen(true);
  };

  return {
    activePortal,
    setActivePortal,
    portalData,
    selectedExplanation,
    modalOpen,
    setModalOpen,
    inspectMaterialXai,
    inspectRackXai,
    openExplanationModal,
    loading,
    error,
    refresh: fetchPortalXai
  };
};

export default useXai;
