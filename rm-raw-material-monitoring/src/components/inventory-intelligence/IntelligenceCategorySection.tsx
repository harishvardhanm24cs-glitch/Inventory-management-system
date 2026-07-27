import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Package, AlertTriangle, AlertCircle, CheckCircle2, PackageCheck } from 'lucide-react';
import type { ClassifiedMaterialItem, StockHealthCategory } from '../../utils/inventoryIntelligenceUtils';

export interface IntelligenceCategorySectionProps {
  category: StockHealthCategory;
  title: string;
  description: string;
  items: ClassifiedMaterialItem[];
}

const categoryTheme: Record<
  StockHealthCategory,
  {
    icon: LucideIcon;
    bgHeader: string;
    borderSection: string;
    badgeColor: string;
    barColor: string;
    statusBg: string;
  }
> = {
  critical: {
    icon: AlertCircle,
    bgHeader: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    borderSection: 'border-rose-500/30 bg-slate-900/90',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    barColor: 'bg-rose-500',
    statusBg: 'bg-rose-950/40 text-rose-300 border-rose-500/30'
  },
  low: {
    icon: AlertTriangle,
    bgHeader: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderSection: 'border-amber-500/30 bg-slate-900/90',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    barColor: 'bg-amber-500',
    statusBg: 'bg-amber-950/40 text-amber-300 border-amber-500/30'
  },
  healthy: {
    icon: CheckCircle2,
    bgHeader: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderSection: 'border-emerald-500/30 bg-slate-900/90',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    barColor: 'bg-emerald-500',
    statusBg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
  },
  overstock: {
    icon: PackageCheck,
    bgHeader: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    borderSection: 'border-indigo-500/30 bg-slate-900/90',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    barColor: 'bg-indigo-500',
    statusBg: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'
  }
};

export const IntelligenceCategorySection: React.FC<IntelligenceCategorySectionProps> = ({
  category,
  title,
  description,
  items
}) => {
  const theme = categoryTheme[category];
  const Icon = theme.icon;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-2xl border ${theme.borderSection} p-6 backdrop-blur-md transition-all shadow-lg space-y-4`}>
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${theme.bgHeader}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-mono font-bold border ${theme.badgeColor}`}>
          {items.length} {items.length === 1 ? 'Material' : 'Materials'}
        </span>
      </div>

      {/* Materials Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3">Material Name & SKU</th>
              <th className="py-3 px-3">Current Quantity</th>
              <th className="py-3 px-3">Min Threshold</th>
              <th className="py-3 px-3">Max Threshold</th>
              <th className="py-3 px-3 text-right">Recommended Status & Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {items.map((item) => {
              // Calculate stock level progress percentage (relative to maxThreshold)
              const maxVal = item.maxThreshold > 0 ? item.maxThreshold : item.minThreshold * 4;
              const fillPct = Math.min(100, Math.max(5, (item.stock / maxVal) * 100));

              return (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                  {/* Material Name */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Barcode: {item.barcode} • Rack: {item.location}
                      </span>
                    </div>
                  </td>

                  {/* Current Quantity */}
                  <td className="py-3.5 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-sm font-bold text-white">{item.stock.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </div>
                      <div className="h-1.5 w-28 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${theme.barColor}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Min Threshold */}
                  <td className="py-3.5 px-3 font-mono font-medium text-slate-300">
                    {item.minThreshold.toLocaleString()} {item.unit}
                  </td>

                  {/* Max Threshold */}
                  <td className="py-3.5 px-3 font-mono font-medium text-slate-300">
                    {item.maxThreshold >= 99999999 ? 'Unlimited' : `${item.maxThreshold.toLocaleString()} ${item.unit}`}
                  </td>

                  {/* Recommended Status */}
                  <td className="py-3.5 px-3 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${theme.statusBg}`}>
                        {item.recommendedStatus}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium mt-1">
                        Action: {item.actionRequired}
                      </span>
                    </div>
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
