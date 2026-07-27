import React from 'react';
import { Calendar, Layers, Grid, ArrowRightLeft, Filter, RotateCcw } from 'lucide-react';
import type { AnalyticsFilterParams } from '../../services/dashboardService';

export interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterParams;
  onFilterChange: (newFilters: AnalyticsFilterParams) => void;
  availableMaterials: string[];
  availableRacks: string[];
  onReset: () => void;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filters,
  onFilterChange,
  availableMaterials,
  availableRacks,
  onReset
}) => {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 backdrop-blur-md transition-all shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Title / Label */}
        <div className="flex items-center gap-2 text-slate-200">
          <Filter className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Analytics Filters
          </span>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <select
              value={filters.dateRange || '30d'}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  dateRange: e.target.value as AnalyticsFilterParams['dateRange']
                })
              }
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="7d" className="bg-slate-900 text-slate-200">Last 7 Days</option>
              <option value="30d" className="bg-slate-900 text-slate-200">Last 30 Days</option>
              <option value="90d" className="bg-slate-900 text-slate-200">Last 90 Days</option>
              <option value="1y" className="bg-slate-900 text-slate-200">Last 1 Year</option>
              <option value="all" className="bg-slate-900 text-slate-200">All Time</option>
            </select>
          </div>

          {/* Material Selector */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
            <Layers className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <select
              value={filters.material || 'all'}
              onChange={(e) => onFilterChange({ ...filters, material: e.target.value })}
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Materials</option>
              {availableMaterials.map((mat) => (
                <option key={mat} value={mat} className="bg-slate-900 text-slate-200">
                  {mat}
                </option>
              ))}
            </select>
          </div>

          {/* Rack Selector */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
            <Grid className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <select
              value={filters.rack || 'all'}
              onChange={(e) => onFilterChange({ ...filters, rack: e.target.value })}
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer max-w-[120px]"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Racks</option>
              {availableRacks.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  Rack {r}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Selector */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
            <ArrowRightLeft className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <select
              value={filters.transactionType || 'all'}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  transactionType: e.target.value as AnalyticsFilterParams['transactionType']
                })
              }
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Transactions</option>
              <option value="inward" className="bg-slate-900 text-slate-200">Inward Only</option>
              <option value="outward" className="bg-slate-900 text-slate-200">Outward Only</option>
              <option value="moved" className="bg-slate-900 text-slate-200">Moved / Transferred</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
