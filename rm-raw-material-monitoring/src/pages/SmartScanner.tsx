import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Box, 
    AlertCircle, 
    RefreshCw, 
    ArrowLeft, 
    History, 
    Zap, 
    ShieldCheck,
    Search,
    ArrowUpRight,
    TrendingUp,
    Activity,
    PieChart,
    Bell,
    CheckCircle2,
    Clock,
    Cpu
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';

const SmartScanner = () => {
    const { transactions, materials } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [anomalies, setAnomalies] = useState<any[]>([]);

    useEffect(() => {
        const fetchMLData = async () => {
            try {
                const res = await api.getAnomalies();
                setAnomalies(res);
            } catch (err) {
                console.error("ML Fetch Error:", err);
            }
        };
        fetchMLData();
    }, []);

    const filteredRegistry = materials.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const criticalMaterials = materials.filter(m => m.stock < 20);

    return (
        <div className="min-h-screen bg-[#F4F7FB] flex flex-col animate-fade-in">
            {/* Unified Top Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <Link to="/" className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 group transition-all">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight">AI Insights & Analytics</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">Predictive Intelligence Center</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Master Engine: Online</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
                {/* Executive Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'System Health', value: '99.8%', icon: Activity, color: 'text-primary' },
                        { label: 'Forecast Accuracy', value: '94.2%', icon: TrendingUp, color: 'text-emerald-500' },
                        { label: 'Active Alerts', value: criticalMaterials.length, icon: Bell, color: 'text-rose-500' },
                        { label: 'Engine Load', value: '12%', icon: Cpu, color: 'text-amber-500' }
                    ].map((stat, i) => (
                        <div key={i} className="saas-card p-6 flex items-center justify-between group hover:border-primary/20 transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                            </div>
                            <div className={cn("p-3 rounded-xl bg-slate-50 group-hover:scale-110 transition-transform", stat.color)}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Predictive Insights & Inventory Audit */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Predictive Alert Box */}
                        <div className="saas-card p-8 bg-slate-900 text-white border-none relative overflow-hidden">
                            <Zap size={120} className="absolute -bottom-8 -right-8 text-white/5 rotate-12" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full w-fit">
                                        <TrendingUp size={14} className="text-emerald-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Market Trend Detected</span>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight leading-tight max-w-md">
                                        Inventory levels for <span className="text-primary italic">Poly Resin</span> are trending low.
                                    </h2>
                                    <p className="text-white/60 text-sm font-medium leading-relaxed max-w-sm">
                                        Based on usage patterns from the last 14 days, we predict stock exhaustion within 48 hours.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Material Registry Audit */}
                        <div className="saas-card p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Material Health Audit</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Registry Status</p>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text"
                                        placeholder="Quick lookup..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-xs font-bold transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {filteredRegistry.slice(0, 8).map(item => (
                                    <div key={item.id} className="p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl flex items-center justify-between hover:bg-white hover:shadow-lg hover:border-white transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <Box size={20} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-slate-900 text-sm">{item.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Loc: {item.location} • ID: {item.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right hidden md:block">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Status</p>
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest",
                                                    item.status === 'good' ? "text-emerald-500" : "text-rose-500"
                                                )}>{item.status}</span>
                                            </div>
                                            <div className="text-right min-w-[80px]">
                                                <p className="text-base font-black text-slate-900">{item.stock} <span className="text-[10px] opacity-40">{item.unit}</span></p>
                                                <div className="h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                                                    <div 
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-1000",
                                                            item.stock > 50 ? "bg-emerald-500" : item.stock > 20 ? "bg-amber-500" : "bg-rose-500"
                                                        )} 
                                                        style={{ width: `${Math.min(item.stock, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredRegistry.length === 0 && (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                        <PieChart size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Matches Found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Operational Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Session Analytics */}
                        <div className="saas-card p-6">
                            <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
                                <History size={14} /> Efficiency Feed
                            </h3>
                            <div className="space-y-6">
                                {transactions.slice(0, 4).map((tx, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 transition-all group-hover:scale-150",
                                            tx.type === 'inward' ? "bg-emerald-500" : "bg-rose-500"
                                        )} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-900 leading-none truncate mb-1">{tx.materialName}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest",
                                                    tx.type === 'inward' ? "text-emerald-500" : "text-rose-500"
                                                )}>{tx.type} Logged</span>
                                                <span className="text-[10px] text-slate-300 font-bold">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {transactions.length === 0 && (
                                    <div className="text-center py-12 opacity-30">
                                        <Clock size={40} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Recent Activity</p>
                                    </div>
                                )}
                            </div>
                            <Link to="/transactions" className="mt-10 w-full py-4 bg-[#F0F7FF] text-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all group">
                                Deep History Audit <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Link>
                        </div>

                        {/* Inventory Heatmap / Alerts */}
                        <div className="saas-card p-6 bg-white border-rose-100 bg-gradient-to-br from-white to-rose-50/30">
                            <h4 className="font-black text-[10px] text-rose-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <AlertCircle size={14} /> Critical Stock Alerts
                            </h4>
                            <div className="space-y-4">
                                {criticalMaterials.slice(0, 3).map(item => (
                                    <div key={item.id} className="p-4 bg-white border border-rose-100 rounded-xl shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                                                <Bell size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 truncate max-w-[120px]">{item.name}</p>
                                                <p className="text-[9px] font-bold text-rose-500 uppercase">Below Threshold</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-rose-600">{item.stock} <span className="text-[10px] opacity-60">KG</span></p>
                                    </div>
                                ))}
                                {criticalMaterials.length === 0 && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">All levels optimal</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Learning Mode Insight */}
                        <div className="saas-card p-6 border-primary/20 bg-blue-50/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary text-white rounded-lg">
                                    <Cpu size={16} />
                                </div>
                                <h4 className="font-black text-xs text-primary uppercase tracking-widest">ML Calibration</h4>
                            </div>
                            <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">
                                {anomalies.length > 0 
                                    ? `Alert: ${anomalies.length} scan anomalies detected in the last session. Engine confidence recalibrating.` 
                                    : '"The vision engine has reached 99.8% confidence on Inward/Outward classification based on current stock deltas."'}
                            </p>
                            <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn("h-full w-[99.8%] rounded-full shadow-[0_0_8px_rgba(79,140,255,0.4)]", anomalies.length > 0 ? "bg-amber-500" : "bg-primary")} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartScanner;
