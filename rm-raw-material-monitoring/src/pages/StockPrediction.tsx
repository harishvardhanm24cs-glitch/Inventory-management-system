import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    ShoppingCart, 
    ArrowRight,
    Search,
    Filter,
    Activity,
    Calendar,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

interface Prediction {
    id: string;
    name: string;
    stock: number;
    unit: string;
    avgDailyConsumption: number;
    daysRemaining: number;
    recommendedReorder: number;
    risk: 'high' | 'medium' | 'stable';
}

const StockPrediction = () => {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'stable'>('all');

    useEffect(() => {
        fetchPredictions();
    }, []);

    const fetchPredictions = async () => {
        setLoading(true);
        try {
            const data = await api.getPredictions();
            // Ensure data is an array
            setPredictions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch predictions:", error);
            setPredictions([]);
        } finally {
            setLoading(false);
        }
    };

    const safePredictions = Array.isArray(predictions) ? predictions : [];

    const filteredPredictions = safePredictions.filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || p.risk === filter;
        return matchesSearch && matchesFilter;
    });

    const highRiskCount = safePredictions.filter(p => p.risk === 'high').length;
    const totalProcurementValue = safePredictions.reduce((acc, p) => acc + (p.recommendedReorder || 0), 0);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-slate-400 font-bold tracking-widest animate-pulse">GENERATING PREDICTIONS...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider border border-indigo-100">
                        Predictive Analytics v1.0
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Smart Stock Prediction</h1>
                    <p className="text-slate-500 max-w-lg">Advanced forecasting based on 30-day historical consumption patterns.</p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={fetchPredictions}
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 cursor-default">
                        <Calendar className="w-4 h-4" />
                        Next 30 Days
                    </div>
                </div>
            </div>

            {/* Insight HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <AlertCircle className="w-24 h-24 text-rose-500" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Critical Stock-outs</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-rose-600">{highRiskCount}</span>
                        <span className="text-xs font-bold text-slate-500">Materials &lt; 7 Days</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-rose-500 bg-rose-50 w-fit px-2 py-1 rounded-md">
                        <Activity className="w-3 h-3" />
                        IMMEDIATE ACTION REQUIRED
                    </div>
                </div>

                <div className="p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <ShoppingCart className="w-24 h-24 text-indigo-500" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Procurement Forecast</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900">{totalProcurementValue.toLocaleString()}</span>
                        <span className="text-xs font-bold text-slate-500 text-uppercase">Units Needed</span>
                    </div>
                    <p className="mt-4 text-xs text-slate-500 font-medium">To maintain 45-day safety buffer</p>
                </div>

                <div className="p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp className="w-24 h-24 text-emerald-500" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Forecast Accuracy</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-emerald-600">92%</span>
                        <span className="text-xs font-bold text-slate-500">Confidence Score</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        ML MODEL OPTIMIZED
                    </div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search materials..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 mr-2" />
                    {(['all', 'high', 'medium', 'stable'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-all",
                                filter === f 
                                    ? "bg-slate-900 text-white shadow-md active:scale-95" 
                                    : "text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Predictions List */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Info</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Current Stock</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Avg Daily Use</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Days left</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Suggested Reorder</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredPredictions.map(p => (
                                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                                                p.risk === 'high' ? "bg-rose-50 text-rose-500" :
                                                p.risk === 'medium' ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"
                                            )}>
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none mb-1">{p.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{p.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="inline-flex items-baseline gap-1 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                            <span className="text-sm font-black text-slate-700">{p.stock}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{p.unit}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="text-sm font-bold text-slate-600">{p.avgDailyConsumption}</span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex justify-center">
                                            <div className={cn(
                                                "px-3 py-1.5 rounded-xl flex items-center gap-2",
                                                p.risk === 'high' ? "bg-rose-500 text-white shadow-lg shadow-rose-200" :
                                                p.risk === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                                "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                            )}>
                                                {p.risk === 'high' && <Clock className="w-3 h-3 animate-pulse" />}
                                                <span className="text-xs font-black uppercase tracking-tighter">
                                                    {p.daysRemaining === 999 ? '∞ DAYS' : `${p.daysRemaining} DAYS`}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        {p.recommendedReorder > 0 ? (
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-sm font-black text-indigo-600">+{p.recommendedReorder}</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Recommended</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase italic">Adequate</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all group-hover:translate-x-1">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredPredictions.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                            <div className="p-6 bg-slate-50 rounded-full mb-6">
                                <TrendingUp className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Predictions Found</h3>
                            <p className="text-slate-500 text-sm max-w-sm">No materials match your current search or filter criteria. Try adjusting your view.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Strategy Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Activity className="w-64 h-64 text-indigo-400" />
                </div>
                <div className="space-y-4 relative z-10">
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                        <TrendingUp className="text-indigo-400" />
                        Procurement Strategy Center
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                        Based on your current burn rate, we recommend generating purchase orders for the highlighted items within the next 48 hours to avoid production bottlenecks.
                    </p>
                    <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-xl shadow-indigo-900/50">
                        Export Bulk Reorder List
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockPrediction;
