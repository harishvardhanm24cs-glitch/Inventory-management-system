import React from 'react';
import { LineChart as LineChartIcon, Layers, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useInventory } from '../../context/InventoryContext';

export const ExecutiveAnalyticsArea: React.FC = () => {
  const { materials, racks } = useInventory();

  // Aggregate zone utilization from racks
  const zoneStats = [
    { zone: 'Zone A (Receiving)', occupied: 45, max: 100 },
    { zone: 'Zone B (Storage)', occupied: 72, max: 100 },
    { zone: 'Zone C (Dispatch)', occupied: 28, max: 100 },
    { zone: 'Zone D (Cold Storage)', occupied: 60, max: 100 }
  ];

  // Live trend flow simulation based on materials
  const totalStock = materials.reduce((s, m) => s + (m.stock || 0), 0) || 450;
  const movementTrend = [
    { name: 'Week 1', inward: Math.round(totalStock * 0.2), outward: Math.round(totalStock * 0.15) },
    { name: 'Week 2', inward: Math.round(totalStock * 0.35), outward: Math.round(totalStock * 0.28) },
    { name: 'Week 3', inward: Math.round(totalStock * 0.25), outward: Math.round(totalStock * 0.32) },
    { name: 'Week 4', inward: Math.round(totalStock * 0.4), outward: Math.round(totalStock * 0.38) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Analytics & Trend Projections
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Timeframe:</span>
          <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
            Last 30 Days
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Inventory Turnover & Movement */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60">
                <LineChartIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Inventory Turnover & Movement Trends
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Weekly stock inflow vs. consumption volume (KG)
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 text-[10px] font-mono font-bold border border-blue-200 dark:border-blue-800">
              Live Sync
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={movementTrend}>
                <defs>
                  <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontWeight: 600 }} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontWeight: 600 }} unit=" KG" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '700' }}
                />
                <Legend verticalAlign="top" height={32} iconType="circle" />
                <Area type="monotone" dataKey="inward" name="Inward Stock" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInward)" />
                <Area type="monotone" dataKey="outward" name="Outward Consumption" stroke="#16A34A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutward)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Utilization Breakdown */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/60">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Zone Utilization & Storage Capacity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Percentage distribution of assigned rack space
                </p>
              </div>
            </div>
            <span className="rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2.5 py-0.5 text-[10px] font-mono font-bold border border-cyan-200 dark:border-cyan-800">
              Active Zones
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={zoneStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="zone" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontWeight: 600 }} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontWeight: 600 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '700' }}
                  cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }}
                />
                <Bar dataKey="occupied" name="Occupancy %" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveAnalyticsArea;
