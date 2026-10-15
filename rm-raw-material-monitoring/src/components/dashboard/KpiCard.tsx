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
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-800/60'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-800/60'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-800/60'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800/60'
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/60',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-100 dark:border-violet-800/60'
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/60',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-100 dark:border-cyan-800/60'
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-100 dark:border-rose-800/60'
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700'
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
    <div className="saas-card p-5 flex flex-col justify-between bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className={`p-2.5 rounded-xl ${scheme.bg} ${scheme.text} ${scheme.border} border`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
              trendType === 'up' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' 
                : trendType === 'down' 
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800' 
                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}>
              {trendType === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {trendType === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {trendType === 'neutral' && <Minus className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
          {title}
        </p>

        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
          {value}
        </h3>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
        {description}
      </p>
    </div>
  );
};

export default KpiCard;
