import React, { useEffect, useState, useCallback, memo } from 'react';
import { TrendingUp, RefreshCw, Layers, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import predictionEngineService from '../../services/predictionEngineService';
import type { DemandPredictionItem } from '../../services/predictionEngineService';
import { cn } from '../../lib/utils';

export const ConsumptionForecastWidget: React.FC = memo(() => {
  const [demandList, setDemandList] = useState<DemandPredictionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '14d' | '30d'>('30d');

  const fetchDemand = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictionEngineService.getDemand();
      setDemandList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[ConsumptionForecastWidget] fetch error:', err);
      setError(err?.message || 'Failed to load consumption forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDemand();
  }, [fetchDemand]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse min-h-[260px] flex flex-col justify-center items-center">
        <TrendingUp className="w-7 h-7 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Modeling Material Consumption Forecast...</p>
      </div>
    );
  }

  const totalForecast = demandList.reduce((acc, item) => {
    if (timeframe === '7d') return acc + (item.forecast_7d || 0);
    if (timeframe === '14d') return acc + (item.forecast_14d || 0);
    return acc + (item.forecast_30d || 0);
  }, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
      {/* Glow Accent */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Consumption Forecast</h3>
            <p className="text-xs text-slate-400">Predicted raw material depletion rates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Toggle Buttons */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
            {(['7d', '14d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  timeframe === tf ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDemand}
            title="Refresh Forecast"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDemand} className="underline font-semibold ml-2">Retry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Metric */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Total Forecasted Demand ({timeframe.toUpperCase()})
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-cyan-400">{totalForecast.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-semibold">Units / KG</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Materials Tracked</span>
              <span className="text-lg font-bold text-white">{demandList.length}</span>
            </div>
          </div>

          {/* Top Demand Items List */}
          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
            {demandList.slice(0, 4).map((item) => {
              const val = timeframe === '7d' ? item.forecast_7d : timeframe === '14d' ? item.forecast_14d : item.forecast_30d;
              return (
                <div
                  key={item.material_id}
                  className="p-2.5 rounded-xl bg-slate-850/50 border border-slate-800/80 flex items-center justify-between hover:border-cyan-500/30 transition-all text-xs"
                >
                  <div>
                    <h5 className="font-bold text-slate-200">{item.material_name}</h5>
                    <span className="text-[10px] text-slate-500 font-mono">Stock: {item.current_stock} {item.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-cyan-400 font-mono">{val} {item.unit}</span>
                    <span className="text-[10px] text-slate-400 block">{item.avg_daily_usage} {item.unit}/day</span>
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

ConsumptionForecastWidget.displayName = 'ConsumptionForecastWidget';
export default ConsumptionForecastWidget;
