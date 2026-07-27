import React, { useEffect, useState, useCallback, memo } from 'react';
import { Package, Clock, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import predictionEngineService from '../../services/predictionEngineService';
import type { DepletionPredictionItem } from '../../services/predictionEngineService';
import { cn } from '../../lib/utils';

export const InventoryForecastWidget: React.FC = memo(() => {
  const [depletionList, setDepletionList] = useState<DepletionPredictionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepletion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictionEngineService.getDepletion();
      setDepletionList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[InventoryForecastWidget] fetch error:', err);
      setError(err?.message || 'Failed to load inventory depletion forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepletion();
  }, [fetchDepletion]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse min-h-[260px] flex flex-col justify-center items-center">
        <Package className="w-7 h-7 text-amber-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Analyzing Inventory Depletion Projections...</p>
      </div>
    );
  }

  const criticalOrWarning = depletionList.filter(
    (d) => d.depletion_status !== 'HEALTHY' || (d.days_until_depletion !== null && d.days_until_depletion <= 14)
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
      {/* Glow Accent */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Inventory Forecast</h3>
            <p className="text-xs text-slate-400">Depletion timelines & stock-out dates</p>
          </div>
        </div>

        <button
          onClick={fetchDepletion}
          title="Refresh Depletion Forecast"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDepletion} className="underline font-semibold ml-2">Retry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Counter Banner */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Depletion Risk Alert</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-400">{criticalOrWarning.length}</span>
                <span className="text-xs text-slate-400 font-semibold">materials flagged</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Total Assessed</span>
              <span className="text-lg font-bold text-white">{depletionList.length}</span>
            </div>
          </div>

          {/* Depletion List */}
          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
            {depletionList.slice(0, 4).map((item) => {
              const status = item.depletion_status;
              const isCritical = status === 'DEPLETED' || status === 'CRITICAL_DEPLETION_RISK';
              const isWarning = status === 'BELOW_THRESHOLD' || status === 'WARNING_DEPLETION_RISK';

              const badgeColor = isCritical
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : isWarning
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

              return (
                <div
                  key={item.material_id}
                  className="p-2.5 rounded-xl bg-slate-850/50 border border-slate-800/80 flex items-center justify-between hover:border-amber-500/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className={cn('w-4 h-4', isCritical ? 'text-red-400 animate-pulse' : isWarning ? 'text-amber-400' : 'text-emerald-400')} />
                    <div>
                      <h5 className="font-bold text-slate-200">{item.material_name}</h5>
                      <span className="text-[10px] text-slate-500 font-mono">Current: {item.current_stock} {item.unit}</span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase border', badgeColor)}>
                      {item.days_until_depletion !== null ? `${item.days_until_depletion}d left` : 'Healthy'}
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

InventoryForecastWidget.displayName = 'InventoryForecastWidget';
export default InventoryForecastWidget;
