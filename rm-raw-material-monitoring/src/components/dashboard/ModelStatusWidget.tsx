import React, { useEffect, useState, useCallback, memo } from 'react';
import { Cpu, CheckCircle2, RefreshCw, Layers, Zap, Server } from 'lucide-react';
import modelManagementService from '../../services/modelManagementService';
import type { ModelMetadata } from '../../services/modelManagementService';
import { cn } from '../../lib/utils';

export const ModelStatusWidget: React.FC = memo(() => {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await modelManagementService.getModels();
      setModels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[ModelStatusWidget] fetch error:', err);
      setError(err?.message || 'Failed to load model status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse min-h-[260px] flex flex-col justify-center items-center">
        <Cpu className="w-7 h-7 text-blue-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Loading ML Model Status & Registry...</p>
      </div>
    );
  }

  const activeModel = models.find((m) => m.is_active) || models[0];

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
      {/* Glow Accent */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Model Status</h3>
            <p className="text-xs text-slate-400">ML pipeline engine & active models</p>
          </div>
        </div>

        <button
          onClick={fetchModels}
          title="Refresh Model Registry"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchModels} className="underline font-semibold ml-2">Retry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Model Banner */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Active Model</span>
              <h4 className="text-sm font-bold text-blue-300 font-mono">{activeModel?.name || 'Statistical/Heuristic v1.0'}</h4>
              <span className="text-[10px] text-slate-400 font-semibold">{activeModel?.framework || 'Statistical'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Online
            </div>
          </div>

          {/* Model Registry List */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {models.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all',
                  m.is_active
                    ? 'bg-blue-950/40 border-blue-500/40 text-slate-200'
                    : 'bg-slate-850/40 border-slate-800 text-slate-400'
                )}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">{m.framework}</span>
                  {m.is_active && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ModelStatusWidget.displayName = 'ModelStatusWidget';
export default ModelStatusWidget;
