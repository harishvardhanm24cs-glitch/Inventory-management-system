import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Activity } from 'lucide-react';
import type { DailyMovementItem } from '../../services/dashboardService';

export interface DailyMovementChartProps {
  data: DailyMovementItem[];
  loading?: boolean;
}

export const DailyMovementChart: React.FC<DailyMovementChartProps> = ({ data, loading }) => {
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Daily Material Movement
            </h3>
            <p className="text-[11px] text-slate-400">Daily breakdown of inward scans vs outward dispatches</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inward
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Outward
          </span>
        </div>
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl text-xs">
                      <p className="font-bold text-slate-200">{d.date}</p>
                      <p className="text-emerald-400 font-mono mt-1">Inward: {d.inward.toLocaleString()}</p>
                      <p className="text-amber-400 font-mono">Outward: {d.outward.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="inward"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorInward)"
            />
            <Area
              type="monotone"
              dataKey="outward"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorOutward)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
