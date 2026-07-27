import React, { useState } from 'react';
import useAiPredictionEngine from '../hooks/useAiPredictionEngine';
import { Layers, AlertTriangle, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

export const DigitalTwinPredictionOverlay: React.FC = () => {
  const { rackUtilization, loading } = useAiPredictionEngine();
  const [activeHorizon, setActiveHorizon] = useState<'7d' | '14d' | '30d'>('14d');

  if (loading) {
    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-400 animate-spin" />
        Calculating spatial rack utilization predictions...
      </div>
    );
  }

  const criticalRacks = rackUtilization.filter(r => r.bottleneck_risk === 'CRITICAL' || r.bottleneck_risk === 'HIGH');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-slate-200">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Digital Twin Spatial Predictions</h4>
            <p className="text-[11px] text-slate-400">Rack Load Forecasting & Bottleneck Detection</p>
          </div>
        </div>

        {/* Time Horizon Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['7d', '14d', '30d'] as const).map(h => (
            <button
              key={h}
              onClick={() => setActiveHorizon(h)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeHorizon === h ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {h.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Rack Utilization Forecasts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {rackUtilization.slice(0, 6).map((rack, idx) => {
          const projOcc =
            activeHorizon === '7d' ? rack.projected_occ_7d :
            activeHorizon === '14d' ? rack.projected_occ_14d : rack.projected_occ_30d;

          const isRisk = projOcc >= 85;

          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all ${
                isRisk
                  ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                  : 'border-slate-800 bg-slate-950/50 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold font-mono text-white">Rack {rack.rack_code}</span>
                {isRisk ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" /> OVERLOAD
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    STABLE
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 mb-2 truncate" title={rack.material_name}>
                {rack.material_name}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full transition-all duration-500 ${
                    projOcc >= 90 ? 'bg-red-500' : projOcc >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, projOcc)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Cur: {rack.current_occupancy_pct}%</span>
                <span className="font-mono font-bold text-white">Proj ({activeHorizon}): {projOcc}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Critical Recommendations Footer */}
      {criticalRacks.length > 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            AI predicts <strong>{criticalRacks.length} rack slots</strong> will experience bottleneck capacity overloads. Internal rebalancing recommended.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Spatial rack load distribution is balanced across all active warehouse zones.</span>
        </div>
      )}
    </div>
  );
};

export default DigitalTwinPredictionOverlay;
