import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Layers } from 'lucide-react';
import type { MaterialDistributionItem } from '../../services/dashboardService';

const COLOR_PALETTE = [
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#6366f1'  // indigo
];

export interface MaterialDistributionChartProps {
  data: MaterialDistributionItem[];
  loading?: boolean;
}

export const MaterialDistributionChart: React.FC<MaterialDistributionChartProps> = ({ data, loading }) => {
  const chartData = useMemo(() => {
    return data.map((item, idx) => ({
      name: item.name,
      value: item.value,
      percentage: item.percentage,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Material Distribution
            </h3>
            <p className="text-[11px] text-slate-400">Share of total warehouse inventory volume</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
          {data.length} Categories
        </span>
      </div>

      <div className="h-[250px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={250}>
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
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
                      <p className="text-teal-400 font-mono mt-0.5">
                        Volume: {d.value.toLocaleString()} ({d.percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
