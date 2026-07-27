import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Grid } from 'lucide-react';
import type { InventoryByRackItem } from '../../services/dashboardService';

export interface InventoryByRackChartProps {
  data: InventoryByRackItem[];
  loading?: boolean;
}

export const InventoryByRackChart: React.FC<InventoryByRackChartProps> = ({ data, loading }) => {
  const chartData = useMemo(() => {
    return data.slice(0, 12).map((item) => ({
      rack: item.rack_code,
      material: item.material_name,
      occupied: item.occupied,
      capacity: item.capacity,
      utilization: item.utilization
    }));
  }, [data]);

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Grid className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Inventory by Rack
            </h3>
            <p className="text-[11px] text-slate-400">Stock distribution across physical warehouse racks</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {data.length} Racks
        </span>
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <p className="text-slate-400">Material: {d.material}</p>
                      <p className="text-emerald-400 font-mono mt-1">Occupied: {d.occupied.toLocaleString()} Units</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="occupied" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
