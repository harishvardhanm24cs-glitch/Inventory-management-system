import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { warehouseIntelligenceEngine } from '../../services/warehouseIntelligenceEngine';
import type { IntelligenceInsight } from '../../services/warehouseIntelligenceEngine';

export const WarehouseHealthCard: React.FC = () => {
  const [insight, setInsight] = useState<IntelligenceInsight | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsight = async () => {
    setLoading(true);
    const data = await warehouseIntelligenceEngine.getInsights();
    setInsight(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
    const handleUpdate = () => fetchInsight();
    window.addEventListener('rack-inventory-update', handleUpdate);
    return () => window.removeEventListener('rack-inventory-update', handleUpdate);
  }, []);

  const totalRisks = insight?.totalRiskItems || 0;
  const healthScore = Math.max(20, Math.min(100, 100 - totalRisks * 12));

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Warehouse Health Index</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time operational health & safety score</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={12} className="animate-spin text-emerald-600" />}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
            healthScore >= 80
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : healthScore >= 60
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${healthScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'} animate-ping`} />
            {healthScore >= 80 ? 'OPTIMAL' : healthScore >= 60 ? 'MONITOR' : 'ATTENTION'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="relative flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" className="text-slate-200" fill="transparent" />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={163}
                strokeDashoffset={163 - (163 * healthScore) / 100}
                className={healthScore >= 80 ? 'text-emerald-500' : healthScore >= 60 ? 'text-amber-500' : 'text-rose-500'}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-sm font-black font-mono text-slate-900">{healthScore}%</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Overall Efficiency</div>
            <div className="text-[11px] text-slate-500">{totalRisks === 0 ? 'Zero active risk factors' : `${totalRisks} active risk items detected`}</div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Critical Reorders
            </span>
            <span className="font-mono font-bold text-slate-900">{insight?.criticalReordersCount || 0}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Overloaded Racks
            </span>
            <span className="font-mono font-bold text-slate-900">{insight?.overloadedRacksCount || 0}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
        <span>Source: Live Warehouse Intelligence Engine</span>
        <span className="font-mono text-emerald-600 font-bold">Auto-Synced</span>
      </div>
    </div>
  );
};

export default WarehouseHealthCard;
