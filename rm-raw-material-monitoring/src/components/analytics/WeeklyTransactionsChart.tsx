import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Calendar } from 'lucide-react';
import type { WeeklyTransactionItem } from '../../services/dashboardService';

export interface WeeklyTransactionsChartProps {
  data: WeeklyTransactionItem[];
  loading?: boolean;
}

export const WeeklyTransactionsChart: React.FC<WeeklyTransactionsChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-[320px] w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 animate-pulse flex items-center justify-center">
        <div className="h-4 w-32 rounded bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all hover:border-slate-700/60 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Weekly Transactions
            </h3>
            <p className="text-[11px] text-slate-400">Weekly transaction aggregates over recent weeks</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          Weekly View
        </span>
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="week" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl text-xs">
                      <p className="font-bold text-slate-200">{d.week}</p>
                      <p className="text-emerald-400 font-mono mt-1">Inward: {d.inward.toLocaleString()}</p>
                      <p className="text-amber-400 font-mono">Outward: {d.outward.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="inward" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="outward" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
