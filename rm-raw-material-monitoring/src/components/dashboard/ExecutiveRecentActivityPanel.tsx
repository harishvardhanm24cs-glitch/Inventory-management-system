import React from 'react';
import { Activity, Clock, QrCode, ArrowDownRight, ArrowUpRight, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ActivityItem {
  id: string;
  type: 'inward' | 'outward' | 'alert' | 'report' | 'system';
  title: string;
  subtitle: string;
  time: string;
  user: string;
}

const defaultActivities: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'inward',
    title: 'Inward Scan Completed',
    subtitle: 'Received 450 units of Resin Epoxy (Batch #EP-774)',
    time: '12 mins ago',
    user: 'John Doe (Warehouse Ops)'
  },
  {
    id: 'act-2',
    type: 'alert',
    title: 'Low Stock Threshold Reached',
    subtitle: 'Titanium Dioxide White drop below 50 units in Rack A-02',
    time: '45 mins ago',
    user: 'System Monitor'
  },
  {
    id: 'act-3',
    type: 'outward',
    title: 'Material Dispensed to Line 2',
    subtitle: 'Transferred 120 L Solvent Thinner to Mixing Station',
    time: '1.5 hours ago',
    user: 'Sarah Smith (Floor Supervisor)'
  },
  {
    id: 'act-4',
    type: 'report',
    title: 'Monthly Audit Report Exported',
    subtitle: 'PDF summary generated for Executive Management',
    time: '3 hours ago',
    user: 'Admin User'
  }
];

export const ExecutiveRecentActivityPanel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Warehouse Activity
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Real-time audit log of scans, stock movements, and system events
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          Live Feed
        </span>
      </div>

      <div className="space-y-4 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
        {defaultActivities.map((act) => (
          <div key={act.id} className="relative flex items-start gap-4 pl-2">
            <div className="relative z-10 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm shrink-0 mt-0.5">
              {act.type === 'inward' && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />}
              {act.type === 'outward' && <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />}
              {act.type === 'alert' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              {act.type === 'report' && <FileText className="w-3.5 h-3.5 text-purple-600" />}
              {act.type === 'system' && <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">
                  {act.title}
                </h4>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {act.time}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                {act.subtitle}
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Logged by <span className="text-slate-600 font-semibold">{act.user}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">Placeholder Warehouse Activity Stream</span>
        <button
          onClick={() => navigate('/audit')}
          className="font-semibold text-cyan-600 hover:underline cursor-pointer"
        >
          View Full Audit Log →
        </button>
      </div>
    </div>
  );
};

export default ExecutiveRecentActivityPanel;
