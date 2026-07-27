import React, { useEffect, useState, useCallback, memo } from 'react';
import { Sparkles, AlertTriangle, ArrowRight, RefreshCw, CheckCircle2, Zap } from 'lucide-react';
import predictionEngineService from '../../services/predictionEngineService';
import type { PredictiveRecommendationItem } from '../../services/predictionEngineService';
import { cn } from '../../lib/utils';

export const AiRecommendationsWidget: React.FC = memo(() => {
  const [recommendations, setRecommendations] = useState<PredictiveRecommendationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictionEngineService.getRecommendations();
      if (res && Array.isArray(res.recommendations)) {
        setRecommendations(res.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('[AiRecommendationsWidget] fetch error:', err);
      setError(err?.message || 'Failed to load AI recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md animate-pulse min-h-[260px] flex flex-col justify-center items-center">
        <Sparkles className="w-7 h-7 text-indigo-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Loading AI Operational Recommendations...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
      {/* Background Glow Accent */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">AI Recommendations</h3>
            <p className="text-xs text-slate-400">Real-time intelligent action advisories</p>
          </div>
        </div>

        <button
          onClick={fetchRecommendations}
          title="Refresh recommendations"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchRecommendations} className="underline font-semibold ml-2">Retry</button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
          <p className="text-sm font-semibold text-slate-300">No Critical Actions Required</p>
          <p className="text-xs text-slate-500 mt-1">All raw material inventories and rack allocations are operating within target parameters.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {recommendations.map((rec) => {
            const isCritical = rec.priority === 'CRITICAL';
            const isHigh = rec.priority === 'HIGH';
            const isMedium = rec.priority === 'MEDIUM';

            const badgeBg = isCritical
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : isHigh
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : isMedium
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl bg-slate-850/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all group/card flex flex-col justify-between space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border', badgeBg)}>
                      {rec.priority}
                    </span>
                    <span className="text-xs font-semibold text-indigo-300">{rec.recommendation_type || 'Operational Advisory'}</span>
                  </div>
                  <Zap className="w-4 h-4 text-indigo-400 opacity-60 group-hover/card:opacity-100 transition-opacity" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover/card:text-indigo-200 transition-colors">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rec.message}</p>
                </div>

                {(rec.impact || rec.suggestedAction) && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
                    {rec.impact && (
                      <span className="text-[11px] text-slate-400">
                        Impact: <strong className="text-indigo-400 font-medium">{rec.impact}</strong>
                      </span>
                    )}
                    {rec.suggestedAction && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer ml-auto">
                        {rec.suggestedAction} <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

AiRecommendationsWidget.displayName = 'AiRecommendationsWidget';
export default AiRecommendationsWidget;
