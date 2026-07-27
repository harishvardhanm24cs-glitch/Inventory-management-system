import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Check,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import type {
  OperationalRecommendation,
  RecommendationPriority,
  RecommendationCategory
} from '../../utils/recommendationEngine';

export interface OperationalRecommendationsPanelProps {
  recommendations: OperationalRecommendation[];
  loading?: boolean;
  onRefresh?: () => void;
}

const priorityBadgeStyles: Record<
  RecommendationPriority,
  {
    badge: string;
    border: string;
    icon: any;
    bg: string;
  }
> = {
  CRITICAL: {
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-extrabold animate-pulse',
    border: 'border-rose-500/40 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    icon: AlertCircle,
    bg: 'bg-rose-500/10 text-rose-400'
  },
  HIGH: {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold',
    border: 'border-amber-500/30 bg-slate-900/90',
    icon: AlertTriangle,
    bg: 'bg-amber-500/10 text-amber-400'
  },
  MEDIUM: {
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-semibold',
    border: 'border-cyan-500/30 bg-slate-900/90',
    icon: Sparkles,
    bg: 'bg-cyan-500/10 text-cyan-400'
  },
  LOW: {
    badge: 'bg-slate-700/40 text-slate-300 border-slate-600/40 font-medium',
    border: 'border-slate-800/80 bg-slate-900/80',
    icon: CheckCircle2,
    bg: 'bg-slate-800 text-slate-400'
  }
};

export const OperationalRecommendationsPanel: React.FC<OperationalRecommendationsPanelProps> = ({
  recommendations,
  loading,
  onRefresh
}) => {
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Record<string, boolean>>({});

  const toggleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      // Priority filter
      if (selectedPriority === 'urgent' && rec.priority !== 'CRITICAL' && rec.priority !== 'HIGH') {
        return false;
      }
      if (selectedPriority === 'utilization' && rec.category !== 'Warehouse Utilization') {
        return false;
      }
      if (selectedPriority === 'movement' && rec.category !== 'Material Movement' && rec.category !== 'Consumption Trend') {
        return false;
      }
      if (selectedPriority === 'inventory' && rec.category !== 'Inventory Level' && rec.category !== 'Threshold Warning') {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mTitle = rec.title.toLowerCase().includes(q);
        const mReason = rec.reason.toLowerCase().includes(q);
        const mAction = rec.suggestedAction.toLowerCase().includes(q);
        const mTarget = rec.targetEntity.toLowerCase().includes(q);
        return mTitle || mReason || mAction || mTarget;
      }

      return true;
    });
  }, [recommendations, selectedPriority, searchQuery]);

  const criticalCount = recommendations.filter((r) => r.priority === 'CRITICAL').length;
  const highCount = recommendations.filter((r) => r.priority === 'HIGH').length;

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="text-cyan-400 h-5 w-5 animate-pulse" />
              Automated Operational Recommendations Engine
            </h2>
            {criticalCount > 0 && (
              <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold px-2.5 py-0.5 animate-pulse">
                {criticalCount} Critical Action{criticalCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time automated suggestions evaluated from inventory thresholds, rack occupancy, and material velocity
          </p>
        </div>

        {/* Controls: Search & Tabs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search suggestions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-xs">
            <button
              onClick={() => setSelectedPriority('all')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedPriority === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({recommendations.length})
            </button>
            <button
              onClick={() => setSelectedPriority('urgent')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedPriority === 'urgent'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Urgent ({criticalCount + highCount})
            </button>
            <button
              onClick={() => setSelectedPriority('inventory')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedPriority === 'inventory'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setSelectedPriority('utilization')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedPriority === 'utilization'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Racks
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Evaluating operational rules & telemetry...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRecommendations.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
          <h3 className="text-base font-bold text-slate-200">All Operations Optimal</h3>
          <p className="text-xs text-slate-400 mt-1">
            No active recommendation warnings match your current filter settings.
          </p>
        </div>
      )}

      {/* Recommendations Cards Grid */}
      {!loading && filteredRecommendations.length > 0 && (
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => {
            const style = priorityBadgeStyles[rec.priority];
            const Icon = style.icon;
            const isAck = acknowledgedIds[rec.id];

            return (
              <div
                key={rec.id}
                className={`group rounded-2xl border p-5 transition-all duration-300 ${style.border} ${
                  isAck ? 'opacity-50 grayscale hover:grayscale-0' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.bg}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="space-y-2 flex-1">
                      {/* Priority, Category, & Title */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] border ${style.badge}`}>
                          {rec.priority} PRIORITY
                        </span>
                        <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                          {rec.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 ml-auto">
                          <Clock size={10} /> Evaluated: {rec.timestamp}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {rec.title}
                      </h3>

                      {/* Reason */}
                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs">
                        <p className="font-semibold text-slate-300">
                          <strong className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-0.5">
                            Reason / Trigger Rule:
                          </strong>
                          {rec.reason}
                        </p>
                      </div>

                      {/* Suggested Action */}
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs text-cyan-300">
                        <p className="font-medium flex items-start gap-1.5">
                          <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                          <span>
                            <strong className="font-bold text-cyan-200">Suggested Action: </strong>
                            {rec.suggestedAction}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Action */}
                  <div className="flex items-center gap-2 md:flex-col md:items-end justify-end shrink-0">
                    <button
                      onClick={() => toggleAcknowledge(rec.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                        isAck
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isAck ? 'Acknowledged' : 'Mark Resolved'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
