import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, RefreshCw, Lightbulb, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import type { MaterialConsumptionAnalyticsData } from '../services/dashboardService';
import { fetchConsumptionAnalytics } from '../services/dashboardService';
import { generateOperationalRecommendations } from '../utils/recommendationEngine';
import { OperationalRecommendationsPanel } from '../components/recommendations/OperationalRecommendationsPanel';

const OperationalRecommendationsPage: React.FC = () => {
  const { materials, racks, refreshData, loading: inventoryLoading } = useInventory();
  const [consumptionData, setConsumptionData] = useState<MaterialConsumptionAnalyticsData | null>(null);
  const [loadingConsumption, setLoadingConsumption] = useState<boolean>(true);

  const loadConsumption = useCallback(async () => {
    setLoadingConsumption(true);
    try {
      const res = await fetchConsumptionAnalytics('30d');
      setConsumptionData(res);
    } catch (err) {
      console.error('[Recommendation Engine] Failed to load consumption data:', err);
    } finally {
      setLoadingConsumption(false);
    }
  }, []);

  useEffect(() => {
    loadConsumption();
  }, [loadConsumption]);

  const handleRefreshAll = () => {
    refreshData();
    loadConsumption();
  };

  // Evaluate operational recommendations dynamically
  const recommendations = useMemo(() => {
    return generateOperationalRecommendations(materials, racks, consumptionData);
  }, [materials, racks, consumptionData]);

  const isLoading = inventoryLoading || loadingConsumption;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Lightbulb className="text-cyan-500" />
            Operational Recommendation Engine
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Automated intelligence analyzing stock safety, rack capacity, velocity staging, and threshold warnings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleRefreshAll}
            className="bg-white border border-slate-200 text-xs font-semibold"
          >
            <RefreshCw size={14} className="mr-2 text-cyan-500" />
            Re-evaluate Rules
          </Button>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold text-cyan-500 border border-cyan-500/20 flex items-center gap-1.5">
            <Sparkles size={12} className="animate-pulse" /> Auto-Rules Active
          </span>
        </div>
      </div>

      {/* Main Recommendations Panel */}
      <OperationalRecommendationsPanel
        recommendations={recommendations}
        loading={isLoading}
        onRefresh={handleRefreshAll}
      />
    </div>
  );
};

export default OperationalRecommendationsPage;
