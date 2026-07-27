import React from 'react';
import { Search, ArrowUpDown, X } from 'lucide-react';
import type { StockHealthCategory } from '../../utils/inventoryIntelligenceUtils';

export type SortOption = 'urgency' | 'name-asc' | 'name-desc' | 'qty-asc' | 'qty-desc';

export interface IntelligenceControlsBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: StockHealthCategory | 'all';
  onCategoryChange: (category: StockHealthCategory | 'all') => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const IntelligenceControlsBar: React.FC<IntelligenceControlsBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortOption,
  onSortChange
}) => {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 backdrop-blur-md transition-all shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search material name, barcode, or SKU..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Tabs & Sorting Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort Selector */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
            <ArrowUpDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="urgency" className="bg-slate-900 text-slate-200">Sort by Urgency</option>
              <option value="name-asc" className="bg-slate-900 text-slate-200">Name (A → Z)</option>
              <option value="name-desc" className="bg-slate-900 text-slate-200">Name (Z → A)</option>
              <option value="qty-asc" className="bg-slate-900 text-slate-200">Quantity (Low → High)</option>
              <option value="qty-desc" className="bg-slate-900 text-slate-200">Quantity (High → Low)</option>
            </select>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-xs">
            <button
              onClick={() => onCategoryChange('all')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onCategoryChange('critical')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCategory === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => onCategoryChange('low')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCategory === 'low'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Low
            </button>
            <button
              onClick={() => onCategoryChange('healthy')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCategory === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Healthy
            </button>
            <button
              onClick={() => onCategoryChange('overstock')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCategory === 'overstock'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overstock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
