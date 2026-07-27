import React from 'react';
import useAiPredictionEngine from '../hooks/useAiPredictionEngine';
import { Cpu, AlertTriangle, TrendingUp, ShieldAlert, RefreshCw, Layers } from 'lucide-react';

export const PredictionEngineDashboardWidget: React.FC = () => {
  const { data, loading, error, refresh, warehouseRisk, depletion, demand, strategyName } = useAiPredictionEngine();

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-md animate-pulse text-slate-400 flex flex-col items-center justify-center min-h-[220px]">
        <Cpu className="w-8 h-8 text-blue-400 animate-spin mb-3" />
        <p className="text-sm font-medium">Running AI Prediction Engine Analysis...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900/80 border border-red-500/30 rounded-xl p-6 shadow-xl backdrop-blur-md text-slate-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            <span>AI Prediction Engine Offline</span>
          </div>
          <button onClick={refresh} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">{error || 'Unable to connect to intelligence core'}</p>
      </div>
    );
  }

  const riskScore = warehouseRisk?.overall_risk_score || 0;
  const riskLevel = warehouseRisk?.risk_level || 'LOW';

  const riskColor =
    riskLevel === 'CRITICAL' ? 'text-red-400 border-red-500/50 bg-red-500/10' :
    riskLevel === 'HIGH' ? 'text-amber-400 border-amber-500/50 bg-amber-500/10' :
    riskLevel === 'MEDIUM' ? 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' :
    'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';

  const criticalDepletions = depletion.filter(
    d => d.depletion_status === 'DEPLETED' || d.depletion_status === 'BELOW_THRESHOLD' || (d.days_until_depletion !== null && d.days_until_depletion <= 14)
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
      {/* Background Accent Blur */}
      <div className="absolute -right-12 -top-12 w-44 h-44 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all duration-500 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">AI Prediction Engine</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                <Layers className="w-3 h-3" /> {strategyName}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={refresh}
          title="Recalculate Predictions"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Risk Score */}
        <div className={`p-4 rounded-xl border ${riskColor} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">System Risk</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black">{riskScore}<span className="text-xs font-normal text-slate-400">/100</span></span>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/60">{riskLevel}</span>
          </div>
        </div>

        {/* Depletion Alerts */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Depletion Risks</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{criticalDepletions.length}</span>
            <span className="text-xs text-slate-400">materials flagged</span>
          </div>
        </div>

        {/* Demand Velocity */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">30-Day Demand</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">
              {demand.reduce((acc, d) => acc + (d.forecast_30d || 0), 0).toFixed(0)} <span className="text-xs font-normal text-slate-400">KG</span>
            </span>
            <span className="text-xs text-blue-400 font-medium">forecasted</span>
          </div>
        </div>
      </div>

      {/* Quick Prediction Highlights */}
      {criticalDepletions.length > 0 && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Top Predicted Reorder Needs
          </div>
          <div className="space-y-1.5">
            {criticalDepletions.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="font-medium text-slate-200">{item.material_name}</span>
                <span className="font-mono text-amber-400">
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
