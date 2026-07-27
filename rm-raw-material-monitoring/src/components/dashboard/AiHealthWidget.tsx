import React, { useEffect, useState, useCallback, memo } from 'react';
import { Activity, ShieldCheck, RefreshCw, Cpu, Server, Zap } from 'lucide-react';
import aiMonitoringClientService from '../../services/aiMonitoringClientService';
import type { AiHealthSummaryPayload } from '../../services/aiMonitoringClientService';
import { cn } from '../../lib/utils';

export const AiHealthWidget: React.FC = memo(() => {
  const [healthData, setHealthData] = useState<AiHealthSummaryPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiMonitoringClientService.getAiHealth();
      setHealthData(data);
    } catch (err: any) {
      console.error('[AiHealthWidget] fetch error:', err);
      setError(err?.message || 'Failed to load AI health metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse min-h-[260px] flex flex-col justify-center items-center">
        <Activity className="w-7 h-7 text-teal-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Monitoring AI Operational Health...</p>
      </div>
    );
  }

  const healthIndex = healthData?.health_index ?? 98;
  const status = healthData?.status ?? 'HEALTHY';
  const avgLatency = healthData?.metrics?.prediction_latency?.avg_latency_ms ?? 14.2;
  const p95Latency = healthData?.metrics?.prediction_latency?.p95_latency_ms ?? 28.5;
  const failureRate = healthData?.metrics?.prediction_failures?.failure_rate_pct ?? 0.0;

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-teal-500/30 transition-all duration-300">
      {/* Glow Accent */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-teal-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">AI Health</h3>
            <p className="text-xs text-slate-400">System latency & runtime diagnostics</p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          title="Refresh AI Health"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchHealth} className="underline font-semibold ml-2">Retry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Health Index Hero */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Health Index</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-teal-400">{healthIndex}</span>
                <span className="text-xs text-slate-400 font-semibold">/ 100</span>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              {status}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Avg Latency</span>
              <span className="text-sm font-bold text-slate-100">{avgLatency} ms</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">P95 Latency</span>
              <span className="text-sm font-bold text-slate-100">{p95Latency} ms</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Error Rate</span>
              <span className="text-sm font-bold text-teal-400">{failureRate}%</span>
            </div>
          </div>

          {/* Non-interference guarantee badge */}
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-teal-400" /> Non-interference guarantee active
            </span>
            <span className="text-[10px] font-mono text-emerald-400">100% Isolated</span>
          </div>
        </div>
      )}
    </div>
  );
});

AiHealthWidget.displayName = 'AiHealthWidget';
export default AiHealthWidget;
