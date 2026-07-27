import React from 'react';
import { BarChart2, LineChart, TrendingUp, Layers, Info, Filter } from 'lucide-react';

export const ExecutiveAnalyticsArea: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Analytics & Trend Projections
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Timeframe:</span>
          <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg shadow-sm">
            Last 30 Days
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placeholder Chart Card 1: Inventory Turnover & Volume Trends */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Inventory Turnover & Movement Trends
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Monthly stock inflow vs. production consumption volume
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 border border-slate-200">
              Future Chart Slot #1
            </span>
          </div>

          {/* Graphical Mockup Background with Grid Lines & Trend Graphic */}
          <div className="relative h-[280px] min-h-[280px] w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-between overflow-hidden">
            {/* SVG Background Mock Pattern */}
            <svg className="absolute inset-0 w-full h-full text-slate-200/60 pointer-events-none" preserveAspectRatio="none">
              <defs>
                <pattern id="grid-pattern-1" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern-1)" />
              {/* Mock Trend Line */}
              <path
                d="M 10 200 Q 120 100, 240 160 T 480 80 T 700 120"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeDasharray="6 6"
                className="opacity-40"
              />
              <path
                d="M 10 230 Q 140 180, 280 200 T 520 140 T 700 160"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3"
                strokeDasharray="6 6"
                className="opacity-40"
              />
            </svg>

            {/* Overlay Description & Legend */}
            <div className="relative z-10 w-full flex items-center justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Inward Stock
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Consumption
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Recharts Container Ready</span>
            </div>

            <div className="relative z-10 text-center space-y-2 my-auto max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm mx-auto flex items-center justify-center text-blue-600">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Turnover Chart Container</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect your backend aggregated time-series endpoint here to render live inventory velocity graphs.
              </p>
            </div>

            <div className="relative z-10 w-full flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-200/60">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>
        </div>

        {/* Placeholder Chart Card 2: Zone Utilization & Category Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Zone Utilization & Material Breakdown
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Distribution of stock across storage bays and material types
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 border border-slate-200">
              Future Chart Slot #2
            </span>
          </div>

          {/* Graphical Mockup Background with Donut / Bar Graphic */}
          <div className="relative h-[280px] min-h-[280px] w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-between overflow-hidden">
            {/* SVG Background Mock Pattern */}
            <svg className="absolute inset-0 w-full h-full text-slate-200/60 pointer-events-none" preserveAspectRatio="none">
              <defs>
                <pattern id="grid-pattern-2" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern-2)" />
            </svg>

            {/* Overlay Description & Legend */}
            <div className="relative z-10 w-full flex items-center justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" /> Resins
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Pigments
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Solvents
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Recharts Container Ready</span>
            </div>

            <div className="relative z-10 text-center space-y-2 my-auto max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm mx-auto flex items-center justify-center text-cyan-600">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Zone Distribution Slot</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect your rack capacity and category allocation metrics to render pie or stacked bar visualizations.
              </p>
            </div>

            <div className="relative z-10 w-full flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-200/60">
              <span>Zone A (45%)</span>
              <span>Zone B (30%)</span>
              <span>Zone C (15%)</span>
              <span>Zone D (10%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveAnalyticsArea;
