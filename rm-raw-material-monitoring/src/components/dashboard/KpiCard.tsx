import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  colorScheme?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose' | 'slate';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    badge: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    badge: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-100',
    badge: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-100',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-100',
    badge: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  slate: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendType = 'up',
  colorScheme = 'blue'
}) => {
  const scheme = colorClasses[colorScheme] || colorClasses.blue;

  return (
    <div className="saas-card p-5 flex flex-col justify-between bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className={`p-2.5 rounded-xl ${scheme.bg} ${scheme.text} ${scheme.border} border`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
              trendType === 'up' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : trendType === 'down' 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {trendType === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {trendType === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {trendType === 'neutral' && <Minus className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {title}
        </p>

        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
          {value}
        </h3>
      </div>

      <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 font-medium">
        {description}
      </p>
    </div>
  );
};

export default KpiCard;
