import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, PackageCheck, Layers } from 'lucide-react';
import type { HealthCategoryCounts, StockHealthCategory } from '../../utils/inventoryIntelligenceUtils';

export interface IntelligenceSummaryBarProps {
  counts: HealthCategoryCounts;
  selectedCategory: StockHealthCategory | 'all';
  onSelectCategory: (category: StockHealthCategory | 'all') => void;
}

export const IntelligenceSummaryBar: React.FC<IntelligenceSummaryBarProps> = ({
  counts,
  selectedCategory,
  onSelectCategory
}) => {
  const cards = [
    {
      id: 'all' as const,
      label: 'All Materials',
      count: counts.total,
      icon: Layers,
      color: 'text-slate-300 border-slate-700 bg-slate-800/40',
      activeColor: 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
    },
    {
      id: 'healthy' as const,
      label: 'Healthy Stock',
      count: counts.healthy,
      icon: CheckCircle2,
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
      activeColor: 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
    },
    {
      id: 'low' as const,
      label: 'Low Stock',
      count: counts.low,
      icon: AlertTriangle,
      color: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
      activeColor: 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
    },
    {
      id: 'critical' as const,
      label: 'Critical Stock',
      count: counts.critical,
      icon: AlertCircle,
      color: counts.critical > 0 ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 animate-pulse' : 'text-rose-400 border-rose-500/20 bg-rose-500/10',
      activeColor: 'border-rose-500 bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
    },
    {
      id: 'overstock' as const,
      label: 'Overstock',
      count: counts.overstock,
      icon: PackageCheck,
      color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10',
      activeColor: 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedCategory === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectCategory(card.id)}
            className={`group flex items-center justify-between rounded-2xl border p-4 text-left backdrop-blur-md transition-all duration-200 cursor-pointer ${
              isSelected ? card.activeColor : card.color
            } hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">
                {card.label}
              </span>
              <h3 className="mt-1 text-2xl font-bold font-mono tracking-tight">
                {card.count.toLocaleString()}
              </h3>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/60 p-2">
              <Icon className="h-5 w-5" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
