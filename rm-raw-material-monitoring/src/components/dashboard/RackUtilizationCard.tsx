import React, { useEffect, useState } from 'react';
import { Layers, ArrowUpRight, RefreshCw, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rackOptimizationIntelligenceService } from '../../services/rackOptimizationIntelligence';
import type { RackOptimizationReportPayload } from '../../services/rackOptimizationIntelligence';

export const RackUtilizationCard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<RackOptimizationReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    const data = await rackOptimizationIntelligenceService.getReport();
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
          <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Rack Slot Utilization</h3>
            <p className="text-xs text-slate-500 font-medium">Capacity headroom & load balance analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={12} className="animate-spin text-violet-600" />}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-violet-50 text-violet-700 border border-violet-200">
            <Sliders size={12} /> {summary?.total_recommendations || 0} Optimizations
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
        <div>
          <div className="text-[11px] font-medium text-slate-500">Near Full (&gt;85%)</div>
          <div className="text-lg font-black font-mono text-rose-600">{summary?.near_full_racks_count || 0} Racks</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">Underutilized (&lt;20%)</div>
          <div className="text-lg font-black font-mono text-amber-600">{summary?.underutilized_racks_count || 0} Racks</div>
        </div>
      </div>

      <div className="space-y-2">
        {loading && !report ? (
          <div className="py-4 text-center text-xs font-semibold text-slate-400">Analyzing slot occupancy...</div>
        ) : report?.optimizations.length === 0 ? (
          <div className="py-4 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ✅ All rack slots optimally balanced across warehouse zones.
          </div>
        ) : (
          report?.optimizations.slice(0, 2).map((opt) => (
            <div key={opt.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{opt.current_rack} → {opt.suggested_rack || 'Consolidate'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-violet-50 text-violet-700 border border-violet-200">
                  {opt.optimization_type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">{opt.suggestion}</p>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Rack Optimization Intelligence Module</span>
        <button onClick={() => navigate('/racks')} className="font-semibold text-violet-600 hover:underline cursor-pointer flex items-center gap-1">
          Rack Inspector <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default RackUtilizationCard;
