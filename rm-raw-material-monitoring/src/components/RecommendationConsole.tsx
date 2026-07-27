import React from 'react';
import useRecommendationEngine from '../hooks/useRecommendationEngine';
import type { RecommendationCategory, RecommendationPriority } from '../services/recommendationEngineClientService';
import {
  Sparkles, RefreshCw, AlertOctagon, AlertTriangle, AlertCircle, Info,
  CheckCircle2, ArrowRight, ShieldCheck, Cpu, Filter, Layers, Clock
} from 'lucide-react';

const CATEGORY_CONFIG: Record<RecommendationCategory, { label: string; icon: string; color: string }> = {
  LOW_STOCK: { label: 'Low Stock', icon: '🚨', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  DEAD_STOCK: { label: 'Dead Stock', icon: '📦', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  WAREHOUSE_HEALTH: { label: 'Warehouse Health', icon: '🩺', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  RACK_OPTIMIZATION: { label: 'Rack Optimization', icon: '📐', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  CONSUMPTION_TREND: { label: 'Consumption Trend', icon: '📈', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  INVENTORY_EFFICIENCY: { label: 'Inventory Efficiency', icon: '⚡', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' }
};

const PRIORITY_BADGES: Record<RecommendationPriority, { border: string; bg: string; text: string; icon: any }> = {
  CRITICAL: { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertOctagon },
  HIGH: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangle },
  MEDIUM: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-300', icon: AlertCircle },
  LOW: { border: 'border-slate-700', bg: 'bg-slate-800/60', text: 'text-slate-400', icon: Info }
};

export const RecommendationConsole: React.FC = () => {
  const { data, recommendations, totalCount, activeCategory, setActiveCategory, activeStrategy, categoryCounts, loading, error, refresh } = useRecommendationEngine();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">AI Recommendation Engine</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md flex items-center gap-1">
                <Cpu className="w-3 h-3 text-amber-400" />
                {activeStrategy.replace('RecommendationStrategy', '')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Synthesized from Inventory · Transactions · Rack View · Alerts · Predictions · Warehouse Rules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Directives
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Category Count Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          {(Object.keys(CATEGORY_CONFIG) as RecommendationCategory[]).map(catKey => {
            const conf = CATEGORY_CONFIG[catKey];
            const count = categoryCounts[catKey] || 0;
            const isSelected = activeCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setActiveCategory(isSelected ? 'ALL' : catKey)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected ? 'ring-2 ring-amber-500/50 bg-slate-800' : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{conf.icon}</span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${conf.color}`}>
                    {count}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-200 truncate">{conf.label}</div>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Filter View:</span>
            <span className="font-bold text-white uppercase tracking-wider font-mono">
              {activeCategory === 'ALL' ? `ALL CATEGORIES (${totalCount})` : `${activeCategory} (${recommendations.length})`}
            </span>
          </div>
          {activeCategory !== 'ALL' && (
            <button onClick={() => setActiveCategory('ALL')} className="text-amber-400 hover:underline text-xs">
              Reset Category Filter
            </button>
          )}
        </div>

        {/* Recommendation Cards List */}
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <div>No active recommendations for selected view. Warehouse operations optimal!</div>
            </div>
          ) : (
            recommendations.map(rec => {
              const pBadge = PRIORITY_BADGES[rec.priority] || PRIORITY_BADGES.MEDIUM;
              const PriorityIcon = pBadge.icon;
              const catConf = CATEGORY_CONFIG[rec.category] || { label: rec.category, icon: '💡', color: 'text-slate-300 bg-slate-800' };

              return (
                <div
                  key={rec.id}
                  className={`p-5 rounded-2xl bg-slate-950/60 border ${pBadge.border} transition-all hover:border-slate-600 space-y-3 relative overflow-hidden`}
                >
                  {/* Priority Strip Indicator */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1 ${pBadge.bg}`} />

                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pl-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${pBadge.bg} ${pBadge.border} ${pBadge.text}`}>
                        <PriorityIcon className="w-3 h-3" />
                        {rec.priority}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${catConf.color}`}>
                        <span>{catConf.icon}</span> {catConf.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                      <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Confidence: <strong>{rec.confidence_score}%</strong></span>
                      </div>
                      <div className="text-slate-500 flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>{rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : 'Just now'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Reason */}
                  <div className="pl-2 space-y-1.5">
                    <h4 className="text-sm font-bold text-white tracking-wide">{rec.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-sans">
                      <strong className="text-slate-400 font-mono text-[10px] block mb-0.5 uppercase tracking-wider">REASON / TELEMETRY JUSTIFICATION:</strong>
                      {rec.reason}
                    </p>
                  </div>

                  {/* Suggested Action Directive */}
                  <div className="pl-2 flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 gap-3">
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                      <ArrowRight className="w-4 h-4 shrink-0 text-amber-400" />
                      <span><strong>SUGGESTED ACTION:</strong> {rec.suggested_action}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Extensibility & ML Model Notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400">
          <Sparkles className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <strong className="text-slate-200">ML Model Pluggable Architecture.</strong> Recommendations are generated using the <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">IRecommendationStrategy</code> interface. Future ML models (e.g. Deep Reinforcement Learning or Collaborative Filtering) can register into the backend registry to improve recommendation scoring without modifying UI components.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationConsole;
