import React from 'react';
import { ShoppingCart, AlertCircle, Clock, CheckCircle2, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Material {
    id: string;
    name: string;
    stock: number;
    minLimit: number;
    unit: string;
    substituteId?: string | null;
    substitute?: Material | null;
}

interface ReorderSummaryProps {
    materials: Material[];
}

const ReorderSummary: React.FC<ReorderSummaryProps> = ({ materials }) => {
    const recommendations = materials.map(m => {
        let recommendation = 'Normal';
        let priority = 3; // 1: Critical, 2: Warning, 3: Normal

        if (m.stock <= m.minLimit) {
            recommendation = 'Critical';
            priority = 1;
        } else if (m.stock <= m.minLimit * 1.2) {
            recommendation = 'Warning';
            priority = 2;
        }

        return { ...m, recommendation, priority };
    })
    .filter(m => m.priority < 3)
    .sort((a, b) => a.priority - b.priority);

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                        <ShoppingCart size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Reorder Recommendations</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Intelligent Procurement</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">
                    {recommendations.length} Pending
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {recommendations.length > 0 ? (
                    recommendations.map((m) => (
                        <div 
                            key={m.id} 
                            className={cn(
                                "group p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                                m.priority === 1 
                                    ? "bg-rose-50/50 border-rose-100 hover:border-rose-200" 
                                    : "bg-amber-50/50 border-amber-100 hover:border-amber-200"
                            )}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{m.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1",
                                            m.priority === 1 ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                                        )}>
                                            {m.priority === 1 ? <AlertCircle size={8} /> : <Clock size={8} />}
                                            {m.recommendation === 'Critical' ? 'Reorder Immediately' : 'Reorder Soon'}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold">{m.id}</span>
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-black text-slate-900 leading-none">{m.stock}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                            {m.unit} / {m.minLimit} MIN
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Substitution Hint */}
                            {m.priority === 1 && m.substituteId && (
                                <div className="mt-3 p-2 bg-indigo-600/10 rounded-xl flex items-center justify-between gap-2 border border-indigo-600/20">
                                    <div className="flex items-center gap-2">
                                        <ArrowRightLeft size={10} className="text-indigo-600" />
                                        <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Substitution Available</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-700">{m.substitute?.name || 'Linked Substitute'}</span>
                                </div>
                            )}

                            <div className="mt-3 overflow-hidden h-1.5 w-full bg-slate-200/50 rounded-full">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-1000 ease-out",
                                        m.priority === 1 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                    )}
                                    style={{ width: `${Math.min((m.stock / m.minLimit) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <div className="p-4 bg-emerald-50 rounded-full text-emerald-500 mb-4 scale-125">
                            <CheckCircle2 size={32} />
                        </div>
                        <h4 className="font-bold text-slate-800">Inventory Optimized</h4>
                        <p className="text-xs text-slate-500 max-w-[200px] mt-1 italic">All materials are currently above their respective safety thresholds.</p>
                    </div>
                )}
            </div>

            {recommendations.length > 0 && (
                <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                    <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 group">
                        Generate Purchase Orders
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReorderSummary;
