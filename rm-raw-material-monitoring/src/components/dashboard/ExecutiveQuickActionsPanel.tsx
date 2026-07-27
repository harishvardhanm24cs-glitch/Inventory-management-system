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
      bgColor: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white',
      badge: 'Inventory'
    },
    {
      title: 'Scan Material',
      description: 'Launch QR/Barcode scanner for inward flow',
      icon: QrCode,
      path: '/scanner',
      bgColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-600 hover:text-white',
      badge: 'QR Scanner'
    },
    {
      title: 'View Rack',
      description: 'Inspect physical rack allocations and occupancy',
      icon: Grid,
      path: '/warehouse-utilization',
      bgColor: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-600 hover:text-white',
      badge: 'Utilization'
    },
    {
      title: 'Generate Report',
      description: 'Export stock, audit, and movement reports',
      icon: FileSpreadsheet,
      path: '/reports',
      bgColor: 'bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-600 hover:text-white',
      badge: 'Analytics'
    }
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Frequently executed warehouse management workflows
          </p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          4 Actions Available
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border transition-colors duration-200 ${action.bgColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-600">
                  {action.badge}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                  {action.title}
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary" />
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
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
