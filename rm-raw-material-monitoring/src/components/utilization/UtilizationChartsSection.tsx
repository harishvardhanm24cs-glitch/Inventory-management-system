import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { PieChart as PieIcon, BarChart3, Layers } from 'lucide-react';
import type { UtilizationMetrics } from './UtilizationMetricCards';

export interface RackCapacityItem {
  rackCode: string;
  materialName: string;
  occupied: number;
  capacity: number;
  occupancyPercentage: number;
}

export interface UtilizationChartsSectionProps {
  metrics: UtilizationMetrics;
  racksData: RackCapacityItem[];
  loading?: boolean;
}

export const UtilizationChartsSection: React.FC<UtilizationChartsSectionProps> = ({
  metrics,
  racksData,
  loading
}) => {
  const pieData = useMemo(() => {
    return [
      { name: 'Used Capacity', value: metrics.usedCapacity, color: '#8b5cf6' },
      { name: 'Available Capacity', value: metrics.availableCapacity, color: '#334155' }
    ];
  }, [metrics]);

  const topRacksChartData = useMemo(() => {
    return racksData
      .slice(0, 10)
      .map((r) => ({
        rack: r.rackCode,
        material: r.materialName,
        occupied: r.occupied,
        capacity: r.capacity,
        pct: r.occupancyPercentage
      }));
  }, [racksData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-0 min-w-0 animate-pulse">
        <div className="lg:col-span-5 h-[380px] min-h-[380px] min-w-0 rounded-2xl border border-slate-800 bg-slate-900/60" />
        <div className="lg:col-span-7 h-[380px] min-h-[380px] min-w-0 rounded-2xl border border-slate-800 bg-slate-900/60" />
      </div>
    );
  }

  const occupiedPct = metrics.occupancyPercentage;
  const emptyPct = metrics.totalRackCount > 0 ? parseFloat(((metrics.emptyRackCount / metrics.totalRackCount) * 100).toFixed(1)) : 0;
  const occupiedRackPct = metrics.totalRackCount > 0 ? parseFloat(((metrics.occupiedRackCount / metrics.totalRackCount) * 100).toFixed(1)) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-0 min-w-0">
      {/* 1. Capacity Donut Gauge */}
      <div className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all hover:border-slate-700/60 shadow-md flex flex-col justify-between min-h-0 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <PieIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Overall Volume Utilization
              </h3>
              <p className="text-[11px] text-slate-400">Total occupied capacity ratio</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded border border-violet-500/20">
            {occupiedPct}%
          </span>
        </div>

        <div className="relative h-[250px] min-h-[250px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={250}>
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 shadow-xl text-xs">
                        <p className="font-bold text-slate-200">{d.name}</p>
                        <p className="text-violet-400 font-mono mt-0.5">{d.value.toLocaleString()} Units</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold font-mono text-white">{occupiedPct}%</span>
            <span className="text-[10px] uppercase text-slate-400 font-semibold">Occupied</span>
          </div>
        </div>

        {/* Rack Status Breakdown Progress Bar */}
        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Occupied Racks ({occupiedRackPct}%)
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-600" /> Empty Racks ({emptyPct}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${occupiedRackPct}%` }} />
            <div className="h-full bg-slate-600" style={{ width: `${emptyPct}%` }} />
          </div>
        </div>
      </div>

      {/* 2. Top Racks by Occupancy Bar Chart */}
      <div className="lg:col-span-7 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all hover:border-slate-700/60 shadow-md flex flex-col justify-between min-h-0 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Top Racks by Occupancy Load
              </h3>
              <p className="text-[11px] text-slate-400">Stored stock volume per rack location</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Top 10 Racks
          </span>
        </div>

        <div className="h-[300px] min-h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300}>
            <BarChart data={topRacksChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="rack" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl text-xs">
                        <p className="font-bold text-slate-200">Rack {d.rack}</p>
                        <p className="text-slate-400">Material: {d.material || 'Unassigned'}</p>
                        <p className="text-cyan-400 font-mono mt-1">Occupied: {d.occupied.toLocaleString()} Units</p>
                        <p className="text-slate-400 font-mono">Occupancy: {d.pct}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="occupied" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
