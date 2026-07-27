import React from 'react';
import { Filter, X, RotateCcw, Calendar, Box, User, MapPin, ArrowRightLeft } from 'lucide-react';

export interface ReportFilterState {
  startDate: string;
  endDate: string;
  material: string;
  worker: string;
  rack: string;
  transactionType: 'all' | 'inward' | 'outward';
}

export interface ReportFilterDrawerProps {
  filters: ReportFilterState;
  onFilterChange: (updated: ReportFilterState) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ReportFilterDrawer: React.FC<ReportFilterDrawerProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  isOpen,
  onToggle
}) => {
  const hasActiveFilters =
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.material) ||
    Boolean(filters.worker) ||
    Boolean(filters.rack) ||
    filters.transactionType !== 'all';

  if (!isOpen) return null;

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 backdrop-blur-md transition-all shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Multi-Criteria Report Filters
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Start Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Calendar size={12} className="text-cyan-400" /> Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Calendar size={12} className="text-cyan-400" /> End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
          />
        </div>

        {/* Material Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Box size={12} className="text-amber-400" /> Material
          </label>
          <input
            type="text"
            placeholder="Material name / SKU..."
            value={filters.material}
            onChange={(e) => onFilterChange({ ...filters, material: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
          />
        </div>

        {/* Worker / Operator */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <User size={12} className="text-emerald-400" /> Worker / Operator
          </label>
          <input
            type="text"
            placeholder="Worker name..."
            value={filters.worker}
            onChange={(e) => onFilterChange({ ...filters, worker: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
          />
        </div>

        {/* Rack Code */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <MapPin size={12} className="text-indigo-400" /> Rack Code
          </label>
          <input
            type="text"
            placeholder="A-RACK-01..."
            value={filters.rack}
            onChange={(e) => onFilterChange({ ...filters, rack: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500"
          />
        </div>

        {/* Transaction Type */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ArrowRightLeft size={12} className="text-violet-400" /> Transaction Type
          </label>
          <select
            value={filters.transactionType}
            onChange={(e) =>
              onFilterChange({ ...filters, transactionType: e.target.value as 'all' | 'inward' | 'outward' })
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="inward">Inward Intake</option>
            <option value="outward">Outward Dispatch</option>
          </select>
        </div>
      </div>
    </div>
  );
};
