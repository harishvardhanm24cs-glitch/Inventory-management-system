import React, { useEffect, useState } from 'react';
import { PackageX, ArrowUpRight, RefreshCw, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deadStockIntelligenceService } from '../../services/deadStockIntelligence';
import type { DeadStockReportPayload } from '../../services/deadStockIntelligence';

export const DeadStockCard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<DeadStockReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    const data = await deadStockIntelligenceService.getReport();
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
    const handleUpdate = () => fetchReport();
    window.addEventListener('rack-inventory-update', handleUpdate);
    return () => window.removeEventListener('rack-inventory-update', handleUpdate);
  }, []);

  const deadStockCount = report?.summary.dead_stock_count || 0;
  const deadStockPct = report?.summary.dead_stock_percentage || 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <PackageX className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Dead Stock Detection</h3>
            <p className="text-xs text-slate-500 font-medium">Inactive inventory items (&gt;45 days idle)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={12} className="animate-spin text-amber-600" />}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {deadStockCount} Inactive
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
        <div>
          <div className="text-[11px] font-medium text-slate-500">Dead Stock Ratio</div>
          <div className="text-lg font-black font-mono text-slate-900">{deadStockPct}%</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">Total Idle Items</div>
          <div className="text-lg font-black font-mono text-amber-600">{report?.summary.idle_count || 0}</div>
        </div>
      </div>

      <div className="space-y-2">
        {loading && !report ? (
          <div className="py-4 text-center text-xs font-semibold text-slate-400">Analyzing movement history...</div>
        ) : deadStockCount === 0 ? (
          <div className="py-4 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ✅ Zero dead stock detected. Active rotation maintained.
          </div>
        ) : (
          report?.dead_stock_materials.slice(0, 2).map((item) => (
            <div key={item.material_id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <div>
                <div className="text-xs font-bold text-slate-900">{item.material_name}</div>
                <div className="text-[11px] text-slate-500">Rack {item.rack_location} • Inactive {item.days_since_last_movement} days</div>
              </div>
              <button
                onClick={() => navigate('/racks')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-amber-700 px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
              >
                <ClipboardCheck size={11} /> Audit
              </button>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Dead Stock Intelligence Module</span>
        <button onClick={() => navigate('/warehouse-utilization')} className="font-semibold text-amber-600 hover:underline cursor-pointer flex items-center gap-1">
          Review Allocations <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default DeadStockCard;
