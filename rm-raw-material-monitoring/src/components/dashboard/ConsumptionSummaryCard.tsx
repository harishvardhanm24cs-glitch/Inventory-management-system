import React, { useEffect, useState } from 'react';
import { TrendingUp, ArrowUpRight, RefreshCw, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { consumptionIntelligenceService } from '../../services/consumptionIntelligence';
import type { ConsumptionReportPayload } from '../../services/consumptionIntelligence';

export const ConsumptionSummaryCard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<ConsumptionReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    const data = await consumptionIntelligenceService.getReport();
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
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Consumption Velocity</h3>
            <p className="text-xs text-slate-500 font-medium">Daily, weekly & monthly material throughput</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={12} className="animate-spin text-blue-600" />}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <BarChart2 size={12} /> Live Multi-Horizon
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-500">Daily Avg</div>
          <div className="text-base font-black font-mono text-slate-900 mt-0.5">{summary?.total_warehouse_daily_consumption || 0}</div>
          <div className="text-[9px] text-slate-400">KG / day</div>
        </div>
        <div className="border-x border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-500">Weekly Avg</div>
          <div className="text-base font-black font-mono text-blue-600 mt-0.5">{summary?.total_warehouse_weekly_consumption || 0}</div>
          <div className="text-[9px] text-slate-400">KG / week</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-500">Monthly Avg</div>
          <div className="text-base font-black font-mono text-indigo-600 mt-0.5">{summary?.total_warehouse_monthly_consumption || 0}</div>
          <div className="text-[9px] text-slate-400">KG / month</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-900">Top Consumed Materials</div>
        {loading && !report ? (
          <div className="py-4 text-center text-xs font-semibold text-slate-400">Calculating consumption rates...</div>
        ) : report?.most_consumed.length === 0 ? (
          <div className="py-3 text-center text-xs font-semibold text-slate-400">No outward transactions recorded.</div>
        ) : (
          report?.most_consumed.slice(0, 2).map((item) => (
            <div key={item.material_id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <div>
                <div className="text-xs font-bold text-slate-900">{item.material_name}</div>
                <div className="text-[11px] text-slate-500">Total Outward: {item.total_consumed} {item.unit}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                item.trend === 'Increasing' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {item.trend}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Consumption Intelligence Module</span>
        <button onClick={() => navigate('/batch-usage')} className="font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
          Full Trends <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default ConsumptionSummaryCard;
