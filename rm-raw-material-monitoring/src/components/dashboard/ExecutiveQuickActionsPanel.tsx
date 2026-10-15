import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, QrCode, Grid, FileSpreadsheet, ArrowRight } from 'lucide-react';

export const ExecutiveQuickActionsPanel: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Add Material',
      description: 'Register new stock entry or batch item',
      icon: PlusCircle,
      path: '/inventory',
      bgColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
      badge: 'Inventory'
    },
    {
      title: 'Scan Material',
      description: 'Launch QR/Barcode scanner for inward flow',
      icon: QrCode,
      path: '/scanner',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
      badge: 'QR Scanner'
    },
    {
      title: 'View Rack',
      description: 'Inspect physical rack allocations and occupancy',
      icon: Grid,
      path: '/warehouse-utilization',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60',
      badge: 'Utilization'
    },
    {
      title: 'Generate Report',
      description: 'Export stock, audit, and movement reports',
      icon: FileSpreadsheet,
      path: '/reports',
      bgColor: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/60',
      badge: 'Analytics'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Frequently executed warehouse management workflows
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          4 Actions Available
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-2xs transition-all duration-200 text-left cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border transition-colors duration-200 ${action.bgColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {action.badge}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  {action.title}
                  <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-blue-600 dark:text-blue-400" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExecutiveQuickActionsPanel;
