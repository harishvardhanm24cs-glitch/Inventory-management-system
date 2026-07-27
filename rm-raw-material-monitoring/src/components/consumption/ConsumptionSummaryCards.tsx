import React from 'react';
import { ArrowUpRight, Zap, Clock, Activity } from 'lucide-react';
import type { MaterialConsumptionAnalyticsData } from '../../services/dashboardService';

export interface ConsumptionSummaryCardsProps {
  data: MaterialConsumptionAnalyticsData | null;
  loading?: boolean;
}

export const ConsumptionSummaryCards: React.FC<ConsumptionSummaryCardsProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-800 bg-slate-900/60 p-4" />
        ))}
      </div>
    );
  }

  const totalVolume = data.allMaterials.reduce((acc, m) => acc + m.totalConsumed, 0);
  const fastMover = data.fastMoving.length > 0 ? data.fastMoving[0].name : 'N/A';
  const slowCount = data.slowMoving.length;
  const avgVelocity = data.allMaterials.length > 0
    ? (totalVolume / data.allMaterials.length).toFixed(1)
    : '0.0';

  const cards = [
    {
      title: 'Total Consumed Volume',
      value: totalVolume.toLocaleString(),
      unit: 'KG',
      icon: ArrowUpRight,
      subtitle: `${data.allMaterials.length} Tracked SKUs`,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      title: 'Top Fast Mover',
      value: fastMover,
      unit: '',
      icon: Zap,
      subtitle: `${data.fastMoving.length} Fast Moving Materials`,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      title: 'Slow Moving Materials',
      value: slowCount.toLocaleString(),
      unit: 'SKUs',
      icon: Clock,
      subtitle: 'Zero or Low Turnover in Period',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    {
      title: 'Avg Material Velocity',
      value: avgVelocity,
      unit: 'KG / Item',
      icon: Activity,
      subtitle: 'Overall Turnover Rate',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">
                {card.title}
              </span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg border p-1.5 ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold tracking-tight text-white truncate max-w-[200px]">
                {card.value}
              </span>
              {card.unit && <span className="text-xs text-slate-400 font-sans font-medium">{card.unit}</span>}
            </div>

            <p className="mt-2 text-[10px] text-slate-400 truncate">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
};
