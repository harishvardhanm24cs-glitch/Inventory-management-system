import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, RefreshCw, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { lowStockIntelligenceService } from '../../services/lowStockIntelligence';
import type { LowStockAnalysisItem } from '../../services/lowStockIntelligence';

export const CriticalMaterialsCard: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<LowStockAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const data = await lowStockIntelligenceService.getAnalysis();
    const criticals = data.filter(i => i.status === 'CRITICAL' || i.status === 'REORDER_SOON');
    setItems(criticals);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    const handleUpdate = () => fetchItems();
    window.addEventListener('rack-inventory-update', handleUpdate);
    return () => window.removeEventListener('rack-inventory-update', handleUpdate);
  }, []);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Critical Materials</h3>
            <p className="text-xs text-slate-500 font-medium">Materials breaching safety limits or near depletion</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={12} className="animate-spin text-rose-600" />}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {items.length} Risks
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {loading && items.length === 0 ? (
          <div className="py-6 text-center text-xs font-semibold text-slate-400">Loading critical materials...</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ✅ All raw materials safely above threshold limits.
          </div>
        ) : (
          items.slice(0, 3).map((item) => (
            <div key={item.material_id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{item.material_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                    item.status === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Stock: <strong className="text-slate-900">{item.current_stock} {item.unit}</strong> (Threshold: {item.threshold_limit} {item.unit}) • {item.suggested_timeframe}
                </div>
              </div>

              <button
                onClick={() => navigate('/inventory')}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:border-rose-300 transition-all shrink-0 cursor-pointer"
              >
                <ShoppingCart size={12} /> Reorder
              </button>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Low Stock Intelligence Module</span>
        <button onClick={() => navigate('/inventory')} className="font-semibold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
          View All Inventory <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default CriticalMaterialsCard;
