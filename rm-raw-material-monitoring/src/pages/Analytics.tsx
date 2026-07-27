import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import type { WarehouseAnalyticsData, AnalyticsFilterParams } from '../services/dashboardService';
import { fetchWarehouseAnalytics } from '../services/dashboardService';
import { AnalyticsFilterBar } from '../components/analytics/AnalyticsFilterBar';
import { InventoryByMaterialChart } from '../components/analytics/InventoryByMaterialChart';
import { InventoryByRackChart } from '../components/analytics/InventoryByRackChart';
import { WarehouseUtilizationChart } from '../components/analytics/WarehouseUtilizationChart';
import { MaterialDistributionChart } from '../components/analytics/MaterialDistributionChart';
import { DailyMovementChart } from '../components/analytics/DailyMovementChart';
import { WeeklyTransactionsChart } from '../components/analytics/WeeklyTransactionsChart';
import { MonthlyTransactionsChart } from '../components/analytics/MonthlyTransactionsChart';
import PredictionAnalyticsReport from '../components/PredictionAnalyticsReport';
import MlPipelineConsole from '../components/MlPipelineConsole';
import FeatureEngineeringExplorer from '../components/FeatureEngineeringExplorer';
import ModelManagementConsole from '../components/ModelManagementConsole';
import RecommendationConsole from '../components/RecommendationConsole';
import XaiExplorerConsole from '../components/XaiExplorerConsole';
import AiMonitoringConsole from '../components/AiMonitoringConsole';

const initialFilters: AnalyticsFilterParams = {
  dateRange: '30d',
  material: 'all',
  rack: 'all',
  transactionType: 'all'
};

const Analytics = () => {
  const { materials } = useInventory();
  const [filters, setFilters] = useState<AnalyticsFilterParams>(initialFilters);
  const [analyticsData, setAnalyticsData] = useState<WarehouseAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Extract unique materials & racks for filter dropdowns
  const availableMaterials = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.name).filter(Boolean))).sort();
  }, [materials]);

  const availableRacks = useMemo(() => {
    const rackSet = new Set<string>();
    materials.forEach((m) => {
      if (m.location && m.location !== 'UNASSIGNED') {
        rackSet.add(m.location);
      }
    });
    return Array.from(rackSet).sort();
  }, [materials]);

  const loadAnalytics = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await fetchWarehouseAnalytics(filters);
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('[Analytics] Failed to fetch analytics:', err);
      setError(err?.message || 'Failed to load warehouse analytics data');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-cyan-500" />
            Warehouse Performance Analytics
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time warehouse telemetry, spatial rack utilization, and multi-dimensional transaction insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => loadAnalytics(false)}
            className="bg-white border border-slate-200 text-xs font-semibold"
          >
            <RefreshCw size={14} className="mr-2 text-cyan-500" />
            Sync Analytics
          </Button>
          <Button
            onClick={() => window.print()}
            className="bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold"
          >
            <Download size={14} className="mr-2" />
            Export Insights
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        availableMaterials={availableMaterials}
        availableRacks={availableRacks}
        onReset={handleResetFilters}
      />

      {/* Module 1: AI Prediction Engine Analytics Report */}
      <PredictionAnalyticsReport />

      {/* Module 2: Machine Learning Data Pipeline Console */}
      <MlPipelineConsole />

      {/* Module 3: Feature Engineering Console */}
      <FeatureEngineeringExplorer />

      {/* Module 4: AI Model Management Console */}
      <ModelManagementConsole />

      {/* Module 5: AI Recommendation Engine Console */}
      <RecommendationConsole />

      {/* Module 6: Explainable AI (XAI) Console */}
      <XaiExplorerConsole />

      {/* Module 7: AI Monitoring System Console */}
      <AiMonitoringConsole />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs font-medium text-rose-300">
          {error}
        </div>
      )}

      {/* Analytics Grid Section 1: Core Utilization & Stock Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WarehouseUtilizationChart
          data={analyticsData?.warehouseUtilization || null}
          loading={loading}
        />
        <MaterialDistributionChart
          data={analyticsData?.materialDistribution || []}
          loading={loading}
        />
        <InventoryByMaterialChart
          data={analyticsData?.inventoryByMaterial || []}
          loading={loading}
        />
      </div>

      {/* Analytics Grid Section 2: Spatial Rack & Daily Throughput */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryByRackChart
          data={analyticsData?.inventoryByRack || []}
          loading={loading}
        />
        <DailyMovementChart
          data={analyticsData?.dailyMaterialMovement || []}
          loading={loading}
        />
      </div>

      {/* Analytics Grid Section 3: Periodic Weekly & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyTransactionsChart
          data={analyticsData?.weeklyTransactions || []}
          loading={loading}
        />
        <MonthlyTransactionsChart
          data={analyticsData?.monthlyTransactions || []}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Analytics;
