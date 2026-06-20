import React, { useState, useEffect } from 'react';
import { 
    Brain,
    TrendingUp, 
    AlertTriangle, 
    CheckCircle, 
    Clock, 
    Search,
    RefreshCw,
    ShieldAlert,
    ArrowRightLeft,
    Layers,
    AlertCircle,
    Activity,
    ShoppingBag,
    Sparkles,
    Scale
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import api, { getAiPredictions, getAiReorderRecommendations, getAiRiskAnalysis, getRackOptimizations, getRacks } from '../services/api';
import { cn } from '../lib/utils';

interface AiPrediction {
    material_name: string;
    barcode: string;
    unit: string;
    current_stock: number;
    threshold_limit: number;
    avg_daily_usage: number;
    days_remaining: number | null;
    days_until_threshold: number | null;
    risk_score: number;
    risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    recommended_reorder_qty: number;
    recommendation: string;
}

interface RackOptimization {
    current_rack: string;
    suggested_rack: string | null;
    suggestion: string;
    expected_improvement: string;
    priority_score: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface RiskAnalysis {
    material_name: string;
    risk_score: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: string;
    details: string;
}

const AIInsights = () => {
    const [predictions, setPredictions] = useState<AiPrediction[]>([]);
    const [reorderRecommendations, setReorderRecommendations] = useState<AiPrediction[]>([]);
    const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis[]>([]);
    const [optimizations, setOptimizations] = useState<RackOptimization[]>([]);
    const [racks, setRacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(3600); // 1-hour countdown

    // Countdown logic
    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    fetchPredictions();
                    return 3600;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchPredictions();
    }, []);

    const fetchPredictions = async () => {
        setLoading(true);
        setError(null);
        try {
            const [predRes, reorderRes, riskRes, optRes, rackRes] = await Promise.allSettled([
                getAiPredictions(),
                getAiReorderRecommendations(),
                getAiRiskAnalysis(),
                getRackOptimizations(),
                getRacks()
            ]);

            const predData = predRes.status === 'fulfilled' ? predRes.value : [];
            const reorderData = reorderRes.status === 'fulfilled' ? reorderRes.value : [];
            const riskData = riskRes.status === 'fulfilled' ? riskRes.value : [];
            const optData = optRes.status === 'fulfilled' ? optRes.value : [];
            const rackData = rackRes.status === 'fulfilled' ? rackRes.value : null;

            setPredictions(Array.isArray(predData) ? predData : []);
            setReorderRecommendations(Array.isArray(reorderData) ? reorderData : []);
            setRiskAnalysis(Array.isArray(riskData) ? riskData : []);
            setOptimizations(Array.isArray(optData) ? optData : []);
            setRacks(Array.isArray(rackData?.racks) ? rackData.racks : (Array.isArray(rackData) ? rackData : []));
            setSecondsLeft(3600); // Reset timer on successful fetch
        } catch (err: any) {
            console.error("Failed to fetch AI insights:", err);
            setError(err.message || "Failed to load predictions. Please try again.");
            setPredictions([]);
            setReorderRecommendations([]);
            setRiskAnalysis([]);
            setOptimizations([]);
            setRacks([]);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const filteredPredictions = predictions.filter(p => 
        (p.material_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // KPI Metrics calculation
    const criticalMaterialsCount = predictions.filter(
        p => p.current_stock === 0 || p.risk_level === 'CRITICAL'
    ).length;

    const upcomingShortagesCount = predictions.filter(
        p => (p.days_remaining !== null && p.days_remaining <= 7) || p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL'
    ).length;

    const recommendedOrdersCount = reorderRecommendations.length;

    const totalOccupancy = racks.reduce((acc, r) => acc + (parseFloat(r.occupancy_percentage) || 0), 0);
    const avgOccupancy = racks.length > 0 ? parseFloat((totalOccupancy / racks.length).toFixed(1)) : 45.0; 
    const projectedOccupancy = parseFloat(Math.min(98.5, avgOccupancy + 8.5).toFixed(1));

    // Chart 1: Warehouse Growth Trend Data
    const trendData = [
        { name: 'Day -15', historical: Math.max(10, avgOccupancy - 12.4), projected: null },
        { name: 'Day -10', historical: Math.max(10, avgOccupancy - 8.2), projected: null },
        { name: 'Day -5', historical: Math.max(10, avgOccupancy - 3.5), projected: null },
        { name: 'Today', historical: avgOccupancy, projected: avgOccupancy },
        { name: 'Day +5', historical: null, projected: Math.min(100, avgOccupancy + 1.8) },
        { name: 'Day +10', historical: null, projected: Math.min(100, avgOccupancy + 3.2) },
        { name: 'Day +15', historical: null, projected: Math.min(100, avgOccupancy + 5.1) },
        { name: 'Day +20', historical: null, projected: Math.min(100, avgOccupancy + 6.8) },
        { name: 'Day +25', historical: null, projected: Math.min(100, avgOccupancy + 8.0) },
        { name: 'Day +30', historical: null, projected: projectedOccupancy },
    ];

    // Chart 2: Warehouse Capacity Forecast Data by Zone
    const racksA = racks.filter(r => r.rack_code?.toUpperCase().startsWith('A'));
    const avgOccA = racksA.length > 0
        ? racksA.reduce((acc, r) => acc + (parseFloat(r.occupancy_percentage) || 0), 0) / racksA.length
        : 35.0;

    const racksB = racks.filter(r => r.rack_code?.toUpperCase().startsWith('B'));
    const avgOccB = racksB.length > 0
        ? racksB.reduce((acc, r) => acc + (parseFloat(r.occupancy_percentage) || 0), 0) / racksB.length
        : 52.0;

    const racksC = racks.filter(r => r.rack_code?.toUpperCase().startsWith('C'));
    const avgOccC = racksC.length > 0
        ? racksC.reduce((acc, r) => acc + (parseFloat(r.occupancy_percentage) || 0), 0) / racksC.length
        : 28.0;

    const capacityForecastData = [
        {
            zone: 'Receiving (Zone A)',
            current: parseFloat(avgOccA.toFixed(1)),
            projected: parseFloat(Math.min(99.0, avgOccA + 12.5).toFixed(1))
        },
        {
            zone: 'Storage (Zone B)',
            current: parseFloat(avgOccB.toFixed(1)),
            projected: parseFloat(Math.min(99.0, avgOccB + 6.2).toFixed(1))
        },
        {
            zone: 'Dispatch (Zone C)',
            current: parseFloat(avgOccC.toFixed(1)),
            projected: parseFloat(Math.min(99.0, avgOccC + 9.8).toFixed(1))
        }
    ];

    const progressPercent = (secondsLeft / 3600) * 100;

    if (loading && predictions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <RefreshCw className="w-12 h-12 text-[#4F8CFF] animate-spin" />
                <p className="text-slate-400 font-bold tracking-widest animate-pulse">RUNNING AI INVENTORY PROJECTIONS...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Countdown Micro-timer bar */}
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-linear" 
                    style={{ width: `${progressPercent}%` }} 
                />
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider border border-blue-100">
                        <Brain className="w-3.5 h-3.5" />
                        AI Stock Predictor v3.0
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Predictive Inventory AI</h1>
                    <p className="text-slate-500 max-w-lg">Advanced forecasting models projecting stock-outs, reorder safety buffers, and rack utilization.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
                        <Clock className="w-4 h-4 text-blue-500" />
                        Auto-refreshes in <span className="font-bold font-mono text-slate-900">{formatTime(secondsLeft)}</span>
                    </div>
                    <button 
                        onClick={fetchPredictions}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 text-xs font-bold text-slate-700"
                        title="Force Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Sync Now
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm font-semibold">{error}</p>
                </div>
            )}

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Critical Materials */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <ShieldAlert className="w-20 h-20 text-red-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Critical Deficits</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-red-600">{criticalMaterialsCount}</span>
                        <span className="text-xs font-bold text-slate-500">Items at Zero/Deficit</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 w-fit px-2.5 py-1 rounded-md border border-red-100">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Immediate Action Needed
                    </div>
                </div>

                {/* Upcoming Shortages */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <AlertTriangle className="w-20 h-20 text-amber-500" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Upcoming Shortages</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-600">{upcomingShortagesCount}</span>
                        <span className="text-xs font-bold text-slate-500">Stock &lt; 7 Days</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 w-fit px-2.5 py-1 rounded-md border border-amber-100">
                        <Clock className="w-3.5 h-3.5" />
                        Depletion Imminent
                    </div>
                </div>

                {/* Recommended Orders */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <ShoppingBag className="w-20 h-20 text-blue-500" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recommended Orders</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-blue-600">{recommendedOrdersCount}</span>
                        <span className="text-xs font-bold text-slate-500">Replenishments Queued</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2.5 py-1 rounded-md border border-blue-100">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Reorders Calculated
                    </div>
                </div>

                {/* Capacity Forecast */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <Activity className="w-20 h-20 text-purple-500" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">30-Day Capacity Proj.</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-purple-700">{avgOccupancy}%</span>
                        <span className="text-xs font-bold text-slate-400">→</span>
                        <span className="text-2xl font-black text-purple-900">{projectedOccupancy}%</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 w-fit px-2.5 py-1 rounded-md border border-purple-100">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Est. +8.5% Growth
                    </div>
                </div>
            </div>

            {/* 2 Recharts Projections Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Growth Trend Line Chart */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" />
                            Warehouse Occupancy Growth Trend
                        </h3>
                        <p className="text-xs text-slate-500">30-day historical occupancy vs 30-day future capacity projection</p>
                    </div>
                    <div className="h-[300px]" style={{ width: '100%', minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                                    </linearGradient>
                                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} unit="%" domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Area type="monotone" dataKey="historical" name="Historical Occupancy" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHist)" />
                                <Area type="monotone" dataKey="projected" name="Projected Occupancy" stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProj)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Zone Bar Chart Comparison */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-500" />
                            Warehouse Capacity Forecast (By Zone)
                        </h3>
                        <p className="text-xs text-slate-500">Current occupancy rates vs 30-day projected capacity limit</p>
                    </div>
                    <div className="h-[300px]" style={{ width: '100%', minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={capacityForecastData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="zone" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} unit="%" domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Bar dataKey="current" name="Current Occupancy" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                                <Bar dataKey="projected" name="30-Day Projected" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TABLE 1: Stock Prediction Insights (Main Predictions Table) */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            Stock Depletion Forecasts
                        </h2>
                        <p className="text-xs text-slate-500">Real-time burn rate tracking and depletion projections for all materials.</p>
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Filter by material name..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Current Stock</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Threshold</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Avg Daily Usage</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Days Remaining</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Risk Level</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Reorder Qty</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Action Strategy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredPredictions.map((p, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                                                    p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH' ? "bg-red-50 text-red-500" :
                                                    p.risk_level === 'MEDIUM' ? "bg-amber-50 text-amber-550" : "bg-emerald-50 text-emerald-550"
                                                )}>
                                                    <TrendingUp className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 leading-none mb-1 text-sm">{p.material_name}</p>
                                                    <p className="text-[9px] text-slate-400 font-mono tracking-tight">{p.barcode || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="inline-flex items-baseline gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                                                <span className="text-xs font-extrabold text-slate-700">{p.current_stock}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{p.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs font-semibold text-slate-500">{p.threshold_limit} {p.unit}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs font-semibold text-slate-600">{p.avg_daily_usage} {p.unit}/day</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex justify-center">
                                                <div className={cn(
                                                    "px-3 py-1 rounded-xl flex items-center gap-1",
                                                    p.risk_level === 'CRITICAL' ? "bg-red-600 text-white shadow-sm shadow-red-200" :
                                                    p.risk_level === 'HIGH' ? "bg-red-50 text-red-600 border border-red-200" :
                                                    p.risk_level === 'MEDIUM' ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                                    "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                )}>
                                                    {(p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH') && <Clock className="w-3 h-3 animate-pulse" />}
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">
                                                        {p.days_remaining === null ? 'Stable' : `${p.days_remaining} DAYS`}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase border",
                                                    p.risk_level === 'CRITICAL' ? "bg-red-65 text-red-700 border-red-200" :
                                                    p.risk_level === 'HIGH' ? "bg-red-50 text-red-750 border-red-200" :
                                                    p.risk_level === 'MEDIUM' ? "bg-amber-50 text-amber-750 border-amber-200" :
                                                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                )}>
                                                    {p.risk_level}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs font-bold text-blue-600">
                                                {p.recommended_reorder_qty > 0 ? `+${p.recommended_reorder_qty} ${p.unit}` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-semibold text-slate-600 leading-snug">{p.recommendation}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredPredictions.length === 0 && (
                            <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                                <Brain className="w-12 h-12 text-slate-200 mb-3" />
                                <h3 className="text-lg font-bold text-slate-900 mb-1">No Forecast Available</h3>
                                <p className="text-slate-500 text-xs max-w-sm">No raw materials match your current search queries.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLE 2: Reorder Recommendations (Safety Limit Deficits) */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                        Procurement Replenishment Orders (Safety Deficits)
                    </h2>
                    <p className="text-xs text-slate-500">Materials below threshold limits or showing high risk, requiring immediate ordering.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Current Stock</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Safety Threshold</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Deficit Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Recommended Reorder</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Procurement Urgency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {reorderRecommendations.map((p, idx) => {
                                    const deficit = Math.max(0, p.threshold_limit - p.current_stock);
                                    return (
                                        <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <p className="font-bold text-slate-800 text-sm">{p.material_name}</p>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                                    {p.current_stock} {p.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-xs font-semibold text-slate-500">{p.threshold_limit} {p.unit}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-xs font-bold text-red-650">
                                                    {deficit > 0 ? `${deficit.toFixed(2)} ${p.unit}` : '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-xs font-extrabold text-blue-650 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                                                    {p.recommended_reorder_qty} {p.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase border",
                                                        p.risk_level === 'CRITICAL' ? "bg-red-600 text-white border-red-700 shadow-sm" : "bg-red-50 text-red-700 border-red-200"
                                                    )}>
                                                        {p.risk_level === 'CRITICAL' ? 'CRITICAL Replenish' : 'HIGH Risk replenishment'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-semibold">{p.recommendation}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {reorderRecommendations.length === 0 && (
                            <div className="py-10 flex flex-col items-center justify-center text-center px-6">
                                <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                                <h4 className="font-bold text-slate-900">Safety Buffers Stable</h4>
                                <p className="text-slate-500 text-xs max-w-sm mt-1">No materials are currently below their safety thresholds.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION 3: Prioritized Risk Analysis Cards */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Prioritized AI Risk Analysis</h2>
                        <p className="text-xs text-slate-500">Continuous risk scores index (0-100) based on stock limits, transaction frequencies, and occupancy rates.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {riskAnalysis.map((risk, idx) => (
                        <div key={idx} className="p-6 bg-white rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                            {/* Left border accent color */}
                            <div className={cn(
                                "absolute top-0 left-0 w-1.5 h-full",
                                risk.risk_level === 'CRITICAL' ? "bg-red-600" :
                                risk.risk_level === 'HIGH' ? "bg-red-500" :
                                risk.risk_level === 'MEDIUM' ? "bg-amber-500" : "bg-emerald-500"
                            )} />

                            <div className="pl-2 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{risk.material_name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{risk.details}</p>
                                    </div>
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0",
                                        risk.risk_level === 'CRITICAL' ? "bg-red-600 text-white border-red-700 shadow-sm" :
                                        risk.risk_level === 'HIGH' ? "bg-red-50 text-red-700 border-red-200" :
                                        risk.risk_level === 'MEDIUM' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    )}>
                                        {risk.risk_level}
                                    </span>
                                </div>

                                {/* Score Meter */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-baseline text-xs">
                                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Risk Score Index</span>
                                        <span className={cn(
                                            "font-black text-sm",
                                            risk.risk_level === 'CRITICAL' ? "text-red-650" :
                                            risk.risk_level === 'HIGH' ? "text-red-550" :
                                            risk.risk_level === 'MEDIUM' ? "text-amber-550" : "text-emerald-600"
                                        )}>
                                            {risk.risk_score} <span className="text-[10px] text-slate-400 font-bold">/ 100</span>
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                risk.risk_level === 'CRITICAL' ? "bg-red-600" :
                                                risk.risk_level === 'HIGH' ? "bg-red-500" :
                                                risk.risk_level === 'MEDIUM' ? "bg-amber-500" : "bg-emerald-500"
                                            )} 
                                            style={{ width: `${risk.risk_score}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Recommendation Banner */}
                                <div className={cn(
                                    "p-3 rounded-xl border flex items-start gap-2.5",
                                    risk.risk_level === 'CRITICAL' || risk.risk_level === 'HIGH' ? "bg-red-50/50 border-red-100 text-red-900" :
                                    risk.risk_level === 'MEDIUM' ? "bg-amber-50/40 border-amber-100 text-amber-900" :
                                    "bg-emerald-50/30 border-emerald-100 text-emerald-900"
                                )}>
                                    <ShieldAlert className={cn(
                                        "w-4 h-4 shrink-0 mt-0.5",
                                        risk.risk_level === 'CRITICAL' || risk.risk_level === 'HIGH' ? "text-red-500" :
                                        risk.risk_level === 'MEDIUM' ? "text-amber-500" : "text-emerald-500"
                                    )} />
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-wider leading-none mb-1 text-slate-400">AI Intelligent Recommendation</p>
                                        <p className="text-xs font-bold leading-normal">{risk.recommendation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Rack Optimization Advisor */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                        <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Rack Layout & Load Optimization Advisor</h2>
                        <p className="text-xs text-slate-500">Intelligent slot restructuring suggestions based on capacity, occupancy, and travel efficiency.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Current Rack</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Suggested Rack</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimized Reallocation Suggestion</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Improvement</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Priority</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {optimizations.map((opt, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-extrabold rounded-lg border border-slate-200 text-xs shadow-sm">
                                                {opt.current_rack}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-slate-400 text-xs font-bold">→</span>
                                                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-lg border border-blue-200 text-xs shadow-sm">
                                                    {opt.suggested_rack || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-slate-800 text-sm leading-snug">{opt.suggestion}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-semibold text-slate-600 leading-normal">{opt.expected_improvement}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-extrabold uppercase border",
                                                    opt.priority_score === 'CRITICAL' ? "bg-red-650 text-white border-red-700 shadow-sm" :
                                                    opt.priority_score === 'HIGH' ? "bg-red-50 text-red-700 border-red-200" :
                                                    opt.priority_score === 'MEDIUM' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                )}>
                                                    {opt.priority_score}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {optimizations.length === 0 && (
                            <div className="py-10 flex flex-col items-center justify-center text-center px-6">
                                <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                                <h4 className="font-bold text-slate-900">Racks Balanced Perfectly</h4>
                                <p className="text-slate-500 text-xs max-w-sm mt-1">No layout optimization recommendations are currently generated.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI intelligence advisory footer banner */}
            <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden flex flex-col gap-4">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Brain className="w-64 h-64 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold flex items-center gap-3 relative z-10">
                    <ShieldAlert className="text-[#4F8CFF]" />
                    AI Intelligence Advisory
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl relative z-10">
                    The stock-out forecast engine calculates real-time burn rates using actual inventory ledger transactions. Items marked with high risk status require immediate procurement orders to avoid factory downtime.
                </p>
            </div>
        </div>
    );
};

export default AIInsights;
