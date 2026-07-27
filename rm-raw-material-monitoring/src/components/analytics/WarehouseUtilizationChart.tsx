import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import type { WarehouseUtilizationData } from '../../services/dashboardService';

export interface WarehouseUtilizationChartProps {
  data: WarehouseUtilizationData | null;
  loading?: boolean;
}

export const WarehouseUtilizationChart: React.FC<WarehouseUtilizationChartProps> = ({ data, loading }) => {
  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Occupied Capacity', value: data.occupiedCapacity, color: '#8b5cf6' },
      { name: 'Available Capacity', value: data.availableCapacity, color: '#334155' }
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="h-[320px] w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 animate-pulse flex items-center justify-center">
        <div className="h-4 w-32 rounded bg-slate-800" />
      </div>
    );
  }

  const utilPct = data?.utilizationPercentage ?? 0;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all hover:border-slate-700/60 shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <PieIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Warehouse Utilization
            </h3>
            <p className="text-[11px] text-slate-400">Total occupied vs free storage volume</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
          {utilPct}%
        </span>
      </div>

      <div className="relative h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={200}>
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
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
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold font-mono text-white">{utilPct}%</span>
          <span className="text-[10px] uppercase text-slate-400 font-semibold">Occupied</span>
        </div>
      </div>

      {/* Metric Breakdown Summary */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
        <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/50">
          <span className="text-[10px] text-slate-400 uppercase block">Occupied</span>
          <span className="text-slate-200 font-bold">{data?.occupiedCapacity.toLocaleString() || 0}</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/50">
          <span className="text-[10px] text-slate-400 uppercase block">Available</span>
          <span className="text-slate-200 font-bold">
            {data?.availableCapacity && data.availableCapacity > 9999999 ? 'Unlimited' : (data?.availableCapacity.toLocaleString() || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};
