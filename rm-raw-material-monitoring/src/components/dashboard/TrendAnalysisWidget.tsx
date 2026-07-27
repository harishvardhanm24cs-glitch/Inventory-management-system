import React, { useEffect, useState, useCallback, memo } from 'react';
import { Activity, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, RefreshCw } from 'lucide-react';
import predictionEngineService from '../../services/predictionEngineService';
import type { ConsumptionTrendPredictionItem } from '../../services/predictionEngineService';
import { cn } from '../../lib/utils';

export const TrendAnalysisWidget: React.FC = memo(() => {
  const [trends, setTrends] = useState<ConsumptionTrendPredictionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictionEngineService.getConsumptionTrend();
      setTrends(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[TrendAnalysisWidget] fetch error:', err);
      setError(err?.message || 'Failed to load trend analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse min-h-[260px] flex flex-col justify-center items-center">
        <Activity className="w-7 h-7 text-purple-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Analyzing Consumption Trends & Anomalies...</p>
      </div>
    );
  }

  const anomalies = trends.filter((t) => t.anomaly_detected);

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
      {/* Glow Accent */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Trend Analysis</h3>
            <p className="text-xs text-slate-400">Consumption velocity & anomaly detection</p>
          </div>
        </div>

        <button
          onClick={fetchTrends}
          title="Refresh Trends"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchTrends} className="underline font-semibold ml-2">Retry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Anomaly Highlight Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Anomalies Detected</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-purple-400">{anomalies.length}</span>
                <span className="text-xs text-slate-400 font-medium">consumption spikes</span>
              </div>
            </div>

            {anomalies.length > 0 ? (
              <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Spike Alert
              </div>
            ) : (
              <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                Normal Velocity
              </div>
            )}
          </div>

          {/* Trend List */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {trends.slice(0, 4).map((t) => {
              const isInc = t.trend_direction === 'INCREASING';
              const isDec = t.trend_direction === 'DECREASING';

              const dirColor = isInc
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                : isDec
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : 'text-blue-400 bg-blue-500/10 border-blue-500/30';

              const Icon = isInc ? ArrowUpRight : isDec ? ArrowDownRight : Minus;

              return (
                <div
                  key={t.material_id}
                  className="p-2.5 rounded-xl bg-slate-850/50 border border-slate-800/80 flex items-center justify-between hover:border-purple-500/30 transition-all text-xs"
                >
                  <div>
                    <h5 className="font-bold text-slate-200">{t.material_name}</h5>
                    <span className="text-[10px] text-slate-500 font-mono">Daily Avg: {t.avg_daily_usage} KG</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border', dirColor)}>
                      <Icon className="w-3 h-3" />
                      {t.trend_slope_pct > 0 ? `+${t.trend_slope_pct}%` : `${t.trend_slope_pct}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

TrendAnalysisWidget.displayName = 'TrendAnalysisWidget';
export default TrendAnalysisWidget;
