import React from 'react';
import useAiPredictionEngine from '../hooks/useAiPredictionEngine';
import { Cpu, AlertTriangle, TrendingUp, ShieldAlert, RefreshCw, Layers } from 'lucide-react';

export const PredictionEngineDashboardWidget: React.FC = () => {
  const { data, loading, error, refresh, warehouseRisk, depletion, demand, strategyName } = useAiPredictionEngine();

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs animate-pulse text-slate-400 flex flex-col items-center justify-center min-h-[220px]">
        <Cpu className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
        <p className="text-xs font-semibold">Running AI Prediction Engine Analysis...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 shadow-2xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>AI Prediction Engine Offline</span>
          </div>
          <button onClick={refresh} className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">{error || 'Unable to connect to intelligence core'}</p>
      </div>
    );
  }

  const riskScore = warehouseRisk?.overall_risk_score || 0;
  const riskLevel = warehouseRisk?.risk_level || 'LOW';

  const riskColor =
    riskLevel === 'CRITICAL' ? 'text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40' :
    riskLevel === 'HIGH' ? 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40' :
    riskLevel === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40' :
    'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40';

  const criticalDepletions = depletion.filter(
    d => d.depletion_status === 'DEPLETED' || d.depletion_status === 'BELOW_THRESHOLD' || (d.days_until_depletion !== null && d.days_until_depletion <= 14)
  );

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300">
      
      <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-2xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">AI Prediction Engine</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40 font-bold">
                <Layers className="w-3 h-3" /> {strategyName}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={refresh}
          title="Recalculate Predictions"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all border border-slate-200/80 dark:border-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className={`p-4 rounded-xl border ${riskColor} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">System Risk</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono">{riskScore}<span className="text-xs font-medium text-slate-400">/100</span></span>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80">{riskLevel}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Depletion Risks</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{criticalDepletions.length}</span>
            <span className="text-xs text-slate-500 font-medium">materials flagged</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">30-Day Demand</span>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {demand.reduce((acc, d) => acc + (d.forecast_30d || 0), 0).toFixed(0)} <span className="text-xs font-medium text-slate-500">KG</span>
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">forecasted</span>
          </div>
        </div>
      </div>

      {criticalDepletions.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Top Predicted Reorder Needs
          </div>
          <div className="space-y-1.5">
            {criticalDepletions.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{item.material_name}</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {item.days_until_depletion !== null ? `~${item.days_until_depletion} days` : 'Depleted'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionEngineDashboardWidget;
