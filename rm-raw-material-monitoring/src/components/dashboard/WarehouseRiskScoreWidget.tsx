import React, { useEffect, useState, useCallback, memo } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Activity, Layers } from 'lucide-react';
import predictionEngineService from '../../services/predictionEngineService';
import type { WarehouseRiskPredictionPayload } from '../../services/predictionEngineService';
import { cn } from '../../lib/utils';

export const WarehouseRiskScoreWidget: React.FC = memo(() => {
  const [riskData, setRiskData] = useState<WarehouseRiskPredictionPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskScore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictionEngineService.getWarehouseRisk();
      setRiskData(data);
    } catch (err: any) {
      console.error('[WarehouseRiskScoreWidget] fetch error:', err);
      setError(err?.message || 'Failed to load risk score');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiskScore();
  }, [fetchRiskScore]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse min-h-[260px] flex flex-col justify-center items-center">
        <ShieldAlert className="w-7 h-7 text-rose-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Evaluating Warehouse Risk Score...</p>
      </div>
    );
  }

  const score = riskData?.overall_risk_score ?? 15;
  const level = riskData?.risk_level ?? 'LOW';

  const riskBadgeStyle =
    level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
    level === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
    level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

  const gaugeBarColor =
    level === 'CRITICAL' ? 'bg-gradient-to-r from-red-600 to-rose-500' :
    level === 'HIGH' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
    level === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
    'bg-gradient-to-r from-emerald-500 to-teal-400';

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
      {/* Glow Accent */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Warehouse Risk Score</h3>
            <p className="text-xs text-slate-400">Continuous 0-100 composite risk analysis</p>
          </div>
        </div>

        <button
          onClick={fetchRiskScore}
          title="Recalculate Risk"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchRiskScore} className="underline font-semibold ml-2">Retry</button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Main Risk Gauge Display */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Overall Risk Level</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{score}</span>
                <span className="text-xs text-slate-400 font-medium">/ 100</span>
              </div>
            </div>

            <div className={cn('px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider border shadow-md', riskBadgeStyle)}>
              {level} RISK
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Risk Intensity</span>
              <span className="font-semibold text-slate-300">{score}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className={cn('h-full rounded-full transition-all duration-700 ease-out', gaugeBarColor)}
                style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
              />
            </div>
          </div>

          {/* Risk Factors Breakdown */}
          {riskData?.risk_factors && (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Stock Risk</span>
                <span className="text-sm font-bold text-slate-200">{riskData.risk_factors.stock_risk}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Rack Risk</span>
                <span className="text-sm font-bold text-slate-200">{riskData.risk_factors.rack_bottleneck_risk}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Alert Risk</span>
                <span className="text-sm font-bold text-slate-200">{riskData.risk_factors.alert_system_risk}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

WarehouseRiskScoreWidget.displayName = 'WarehouseRiskScoreWidget';
export default WarehouseRiskScoreWidget;
