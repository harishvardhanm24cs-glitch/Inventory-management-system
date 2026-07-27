import React, { useEffect, useState } from 'react';
import { Bell, ArrowUpRight, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { smartAlertIntelligenceService } from '../../services/smartAlertIntelligence';
import type { SmartAlertReportPayload } from '../../services/smartAlertIntelligence';

export const PendingActionsCard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<SmartAlertReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    const data = await smartAlertIntelligenceService.getReport();
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
    const handleUpdate = () => fetchReport();
    window.addEventListener('rack-inventory-update', handleUpdate);
    return () => window.removeEventListener('rack-inventory-update', handleUpdate);
  }, []);

  const summary = report?.summary;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Pending Action Items</h3>
            <p className="text-xs text-slate-500 font-medium">Smart alert queue requiring operator action</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={12} className="animate-spin text-indigo-600" />}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {summary?.total_alerts || 0} Alerts
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-rose-500" />
          <span className="font-semibold text-slate-700">Critical:</span>
          <span className="font-bold text-slate-900">{summary?.critical_count || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <span className="font-semibold text-slate-700">Warnings:</span>
          <span className="font-bold text-slate-900">{summary?.warning_count || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="font-semibold text-slate-700">Optimal:</span>
          <span className="font-bold text-slate-900">{summary?.success_count || 0}</span>
        </div>
      </div>

      <div className="space-y-2">
        {loading && !report ? (
          <div className="py-4 text-center text-xs font-semibold text-slate-400">Loading pending action items...</div>
        ) : report?.alerts.length === 0 ? (
          <div className="py-4 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ✅ Zero pending action items. Operational queue clear.
          </div>
        ) : (
          report?.alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{alert.material} ({alert.rack})</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono border ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {alert.alert_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">{alert.suggested_action}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>AI Smart Alert System Module</span>
        <button onClick={() => navigate('/alerts')} className="font-semibold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1">
          Open Notification Portal <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default PendingActionsCard;
