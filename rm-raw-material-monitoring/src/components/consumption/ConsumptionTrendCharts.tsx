import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Calendar, Clock } from 'lucide-react';
import type { MaterialConsumptionAnalyticsData } from '../../services/dashboardService';

export interface ConsumptionTrendChartsProps {
  data: MaterialConsumptionAnalyticsData | null;
  loading?: boolean;
}

export const ConsumptionTrendCharts: React.FC<ConsumptionTrendChartsProps> = ({ data, loading }) => {
  const [activeTrendTab, setActiveTrendTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  if (loading || !data) {
    return (
      <div className="h-72 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 animate-pulse" />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all shadow-md space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Consumption Velocity Trends
            </h3>
            <p className="text-[11px] text-slate-400">Historical outward material volume movements</p>
          </div>
        </div>

        {/* Granularity Pill Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1 text-xs">
          <button
            onClick={() => setActiveTrendTab('daily')}
            className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
              activeTrendTab === 'daily'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setActiveTrendTab('weekly')}
            className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
              activeTrendTab === 'weekly'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setActiveTrendTab('monthly')}
            className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
              activeTrendTab === 'monthly'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[240px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={240}>
          {activeTrendTab === 'daily' ? (
            <AreaChart data={data.dailyConsumption} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDailyCons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 shadow-xl text-xs">
                        <p className="font-bold text-slate-200">{d.date}</p>
                        <p className="text-amber-400 font-mono mt-0.5">Outward: {d.consumed.toLocaleString()} KG</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="consumed" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorDailyCons)" />
            </AreaChart>
          ) : activeTrendTab === 'weekly' ? (
            <BarChart data={data.weeklyConsumption} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="week" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 shadow-xl text-xs">
                        <p className="font-bold text-slate-200">{d.week}</p>
                        <p className="text-amber-400 font-mono mt-0.5">Outward: {d.consumed.toLocaleString()} KG</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="consumed" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          ) : (
            <AreaChart data={data.monthlyConsumption} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMonthlyCons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 shadow-xl text-xs">
                        <p className="font-bold text-slate-200">{d.month}</p>
                        <p className="text-cyan-400 font-mono mt-0.5">Outward: {d.consumed.toLocaleString()} KG</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="consumed" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorMonthlyCons)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
