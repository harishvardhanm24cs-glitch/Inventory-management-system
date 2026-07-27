import React from 'react';
import {
  Building2,
  PieChart,
  CheckCircle2,
  Percent,
  Inbox,
  ShieldCheck
} from 'lucide-react';

export interface UtilizationMetrics {
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  occupancyPercentage: number;
  emptyRackCount: number;
  occupiedRackCount: number;
  totalRackCount: number;
}

export interface UtilizationMetricCardsProps {
  metrics: UtilizationMetrics;
  loading?: boolean;
}

export const UtilizationMetricCards: React.FC<UtilizationMetricCardsProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-800 bg-slate-900/60 p-4" />
        ))}
      </div>
    );
  }

  const formatCapacity = (val: number) => {
    if (val >= 99999999) return 'Unlimited (999M+)';
    return val.toLocaleString();
  };

  const cards = [
    {
      title: 'Total Warehouse Cap.',
      value: formatCapacity(metrics.totalCapacity),
      unit: metrics.totalCapacity > 999999 ? '' : 'Units',
      icon: Building2,
      subtitle: `${metrics.totalRackCount} Total Racks`,
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      hoverBorder: 'hover:border-indigo-500/40 hover:shadow-indigo-500/10'
    },
    {
      title: 'Used Capacity',
      value: metrics.usedCapacity.toLocaleString(),
      unit: 'Units',
      icon: PieChart,
      subtitle: `${metrics.occupancyPercentage}% Volume Filled`,
      color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      hoverBorder: 'hover:border-violet-500/40 hover:shadow-violet-500/10'
    },
    {
      title: 'Available Capacity',
      value: formatCapacity(metrics.availableCapacity),
      unit: metrics.availableCapacity > 999999 ? '' : 'Units',
      icon: CheckCircle2,
      subtitle: 'Free Storage Volume',
      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      hoverBorder: 'hover:border-teal-500/40 hover:shadow-teal-500/10'
    },
    {
      title: 'Rack Occupancy %',
      value: `${metrics.occupancyPercentage}%`,
      unit: '',
      icon: Percent,
      subtitle: `${metrics.occupiedRackCount} of ${metrics.totalRackCount} Racks`,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      hoverBorder: 'hover:border-cyan-500/40 hover:shadow-cyan-500/10'
    },
    {
      title: 'Occupied Rack Count',
      value: metrics.occupiedRackCount.toLocaleString(),
      unit: 'Racks',
      icon: ShieldCheck,
      subtitle: 'Currently Stocked',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10'
    },
    {
      title: 'Empty Rack Count',
      value: metrics.emptyRackCount.toLocaleString(),
      unit: 'Racks',
      icon: Inbox,
      subtitle: 'Ready for Storage',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/40 hover:shadow-blue-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md transition-all duration-300 ${card.hoverBorder} hover:-translate-y-1 hover:shadow-lg`}
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
              <span className="text-2xl font-bold tracking-tight text-white">{card.value}</span>
              {card.unit && <span className="text-xs text-slate-400 font-sans font-medium">{card.unit}</span>}
            </div>

            <p className="mt-2 text-[10px] text-slate-400 truncate">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
};
