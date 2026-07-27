import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Download, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import type { MaterialConsumptionAnalyticsData } from '../services/dashboardService';
import { fetchConsumptionAnalytics } from '../services/dashboardService';

import { ConsumptionSummaryCards } from '../components/consumption/ConsumptionSummaryCards';
import { ConsumptionTrendCharts } from '../components/consumption/ConsumptionTrendCharts';
import { ConsumptionMaterialTable } from '../components/consumption/ConsumptionMaterialTable';

const MaterialConsumptionAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<MaterialConsumptionAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchConsumptionAnalytics(dateRange);
      setData(res);
    } catch (err: any) {
      console.error('[Consumption Analytics] Failed to load:', err);
      setError(err?.message || 'Failed to fetch consumption analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="text-amber-500" />
            Material Consumption Analytics
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Dynamic material velocity profiling, movement speed classification, and historical throughput reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  dateRange === range
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={loadData}
            className="bg-white border border-slate-200 text-xs font-semibold"
          >
            <RefreshCw size={14} className="mr-2 text-amber-500" />
            Sync Analytics
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs font-medium text-rose-300">
          {error}
        </div>
      )}

      {/* Summary Metrics */}
      <ConsumptionSummaryCards data={data} loading={loading} />

      {/* Historical Velocity Trend Charts */}
      <ConsumptionTrendCharts data={data} loading={loading} />

      {/* Movement Table & CSV Exporter */}
      <ConsumptionMaterialTable
        materials={data?.allMaterials || []}
        mostConsumed={data?.mostConsumed || []}
        leastConsumed={data?.leastConsumed || []}
        fastMoving={data?.fastMoving || []}
        slowMoving={data?.slowMoving || []}
        loading={loading}
      />
    </div>
  );
};

export default MaterialConsumptionAnalytics;
