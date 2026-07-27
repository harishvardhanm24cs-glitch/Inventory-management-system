import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowUpRight, Zap, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { warehouseIntelligenceEngine } from '../../services/warehouseIntelligenceEngine';
import type { StructuredRecommendation } from '../../services/warehouseIntelligenceEngine';

export const ExecutiveRecommendationPanel: React.FC = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<StructuredRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    setLoading(true);
    const data = await warehouseIntelligenceEngine.getRecommendations();
    setRecommendations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecommendations();
    
    const handleUpdate = () => {
      fetchRecommendations();
    };
    window.addEventListener('rack-inventory-update', handleUpdate);

    return () => {
      window.removeEventListener('rack-inventory-update', handleUpdate);
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              AI Warehouse Recommendations
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Real-time intelligence engine suggestions based on live warehouse metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={12} className="animate-spin text-violet-600" />}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-violet-50 text-violet-700 border border-violet-200">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
            Engine Active
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {loading && recommendations.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            Analyzing warehouse metrics...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            ✅ All warehouse metrics optimal. Zero critical stock or capacity risks detected.
          </div>
        ) : (
          recommendations.slice(0, 4).map((rec) => {
            const isCritical = rec.priority === 'CRITICAL' || rec.priority === 'HIGH';
            const isMedium = rec.priority === 'MEDIUM';

            return (
              <div
                key={rec.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200 gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCritical ? (
                      <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                    ) : isMedium ? (
                      <Zap className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                        {rec.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                        isCritical
                          ? 'bg-rose-50 text-rose-700 border-rose-200 font-black'
                          : isMedium
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">{rec.message}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-emerald-600">{rec.impact}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (rec.targetEntity?.type === 'rack') navigate('/racks');
                    else if (rec.targetEntity?.type === 'material') navigate('/inventory');
                    else navigate('/warehouse-utilization');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-violet-600 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer shrink-0 self-end sm:self-center"
                >
                  <span>Action</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">AI Warehouse Intelligence Engine Active</span>
        <button
          onClick={() => navigate('/recommendations')}
          className="font-semibold text-violet-600 hover:underline cursor-pointer"
        >
          View All Recommendations ({recommendations.length}) →
        </button>
      </div>
    </div>
  );
};

export default ExecutiveRecommendationPanel;
