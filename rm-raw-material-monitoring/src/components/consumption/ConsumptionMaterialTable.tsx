import React, { useState, useMemo } from 'react';
import { Search, Download, Zap, Clock, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { MaterialConsumptionItem } from '../../services/dashboardService';

export type ConsumptionCategoryFilter = 'all' | 'most' | 'least' | 'fast' | 'slow';

export interface ConsumptionMaterialTableProps {
  materials: MaterialConsumptionItem[];
  mostConsumed: MaterialConsumptionItem[];
  leastConsumed: MaterialConsumptionItem[];
  fastMoving: MaterialConsumptionItem[];
  slowMoving: MaterialConsumptionItem[];
  loading?: boolean;
}

export const ConsumptionMaterialTable: React.FC<ConsumptionMaterialTableProps> = ({
  materials,
  mostConsumed,
  leastConsumed,
  fastMoving,
  slowMoving,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<ConsumptionCategoryFilter>('most');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const displayList = useMemo(() => {
    let source: MaterialConsumptionItem[] = [];
    if (activeTab === 'most') source = mostConsumed;
    else if (activeTab === 'least') source = leastConsumed;
    else if (activeTab === 'fast') source = fastMoving;
    else if (activeTab === 'slow') source = slowMoving;
    else source = materials;

    if (!searchQuery.trim()) return source;

    const q = searchQuery.toLowerCase().trim();
    return source.filter(
      (m) => m.name.toLowerCase().includes(q) || m.barcode.toLowerCase().includes(q)
    );
  }, [activeTab, searchQuery, materials, mostConsumed, leastConsumed, fastMoving, slowMoving]);

  // Export dataset to CSV
  const handleExportCSV = () => {
    if (displayList.length === 0) return;

    const headers = [
      'Material ID',
      'Material Name',
      'Barcode SKU',
      'Current Stock (KG)',
      'Total Consumed (KG)',
      'Outward Transactions',
      'Daily Velocity (KG/Day)',
      'Velocity Category',
      'Last Outward Movement'
    ];

    const rows = displayList.map((m) => [
      m.id,
      `"${m.name.replace(/"/g, '""')}"`,
      m.barcode,
      m.currentStock,
      m.totalConsumed,
      m.transactionCount,
      m.dailyVelocity,
      m.velocityCategory,
      m.lastOutwardDate
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `material_consumption_report_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all shadow-xl space-y-6">
      {/* Header, Search & CSV Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="text-cyan-400 h-5 w-5" />
            Material Movement Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Classified material consumption profiles and velocity distribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search material name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-all cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab('most')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'most'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Most Consumed ({mostConsumed.length})
        </button>

        <button
          onClick={() => setActiveTab('least')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'least'
              ? 'bg-slate-700/40 text-slate-200 border border-slate-600/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" /> Least Consumed ({leastConsumed.length})
        </button>

        <button
          onClick={() => setActiveTab('fast')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'fast'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="h-3.5 w-3.5" /> Fast Moving ({fastMoving.length})
        </button>

        <button
          onClick={() => setActiveTab('slow')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'slow'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Slow Moving ({slowMoving.length})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Items ({materials.length})
        </button>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3">Material Name & SKU</th>
              <th className="py-3 px-3">Current Stock</th>
              <th className="py-3 px-3">Total Consumed</th>
              <th className="py-3 px-3">Outward Count</th>
              <th className="py-3 px-3">Daily Velocity</th>
              <th className="py-3 px-3">Movement Speed</th>
              <th className="py-3 px-3 text-right">Last Movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {displayList.map((item) => {
              const isFast = item.velocityCategory === 'Fast Moving';
              const isSlow = item.velocityCategory === 'Slow Moving';

              return (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                        SKU: {item.barcode}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3 font-mono font-medium text-slate-200">
                    {item.currentStock.toLocaleString()} {item.unit}
                  </td>

                  <td className="py-3.5 px-3 font-mono font-bold text-amber-400">
                    {item.totalConsumed.toLocaleString()} {item.unit}
                  </td>

                  <td className="py-3.5 px-3 font-mono text-slate-300">
                    {item.transactionCount} Tx
                  </td>

                  <td className="py-3.5 px-3 font-mono text-cyan-400">
                    {item.dailyVelocity} {item.unit}/Day
                  </td>

                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        isFast
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : isSlow
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {isFast && <Zap className="h-3 w-3" />}
                      {isSlow && <Clock className="h-3 w-3" />}
                      {item.velocityCategory}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                    {item.lastOutwardDate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
