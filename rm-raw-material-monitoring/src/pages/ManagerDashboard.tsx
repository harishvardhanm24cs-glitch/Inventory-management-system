import React, { useState, useEffect } from 'react';
import {
    Package,
    Database,
    Grid,
    MapPin,
    Inbox,
    QrCode,
    ShieldCheck,
    Clock,
    AlertTriangle,
    Percent,
    RefreshCw,
    TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../services/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: any;
    colorClass: string;
    subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon: Icon,
    colorClass,
    subtitle
}) => {
    return (
        <div className="saas-card p-5 hover:scale-[1.02] transition-transform duration-300 bg-white">
            <div className="flex justify-between items-center mb-4">
                <div className={cn("icon-container", colorClass)}>
                    <Icon size={18} className="stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {value}
            </h3>
            {subtitle && <p className="text-[10px] text-slate-450 font-bold mt-2">{subtitle}</p>}
        </div>
    );
};

const ManagerDashboard: React.FC = () => {
    const { materials, loading: inventoryLoading } = useInventory();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const fetchStats = async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setIsRefreshing(true);
        try {
            const response = await api.getDashboardStats();
            if (response && response.data) {
                setStats(response.data);
                setError(null);
                const now = new Date();
                setLastUpdated(now.toTimeString().split(' ')[0]);
            } else if (response && response.total_materials !== undefined) {
                // Handle direct payload responses if any
                setStats(response);
                setError(null);
                const now = new Date();
                setLastUpdated(now.toTimeString().split(' ')[0]);
            } else {
                throw new Error("Invalid backend stats response format");
            }
        } catch (err: any) {
            console.error("Failed to fetch dashboard stats:", err);
            setError(err.message || "Failed to fetch warehouse statistics");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();

        // Auto Refresh every 10 seconds
        const interval = setInterval(() => {
            fetchStats(true);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <LoadingSpinner message="Retrieving warehouse management stats..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-[70vh] items-center justify-center p-6 text-center animate-saas-fade">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 mb-4">
                    <AlertTriangle size={36} className="stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Telemetry Retrieval Failed</h3>
                <p className="text-sm text-slate-405 mt-1 max-w-md">{error}</p>
                <Button 
                    onClick={() => fetchStats()} 
                    className="mt-6 bg-[#4F8CFF] hover:bg-[#3B82F6] text-white rounded-xl px-5 py-2.5 font-semibold active:scale-95 transition-all flex items-center gap-2"
                >
                    <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
                    Retry Sync
                </Button>
            </div>
        );
    }

    // Recharts Data Preparations
    const rackOccupancyData = stats ? [
        { name: 'Occupied Racks', value: Number(stats.occupied_racks), color: '#4F8CFF' },
        { name: 'Empty Racks', value: Number(stats.empty_racks), color: '#E2E8F0' }
    ] : [];

    const qrUsageData = stats ? [
        { name: 'Used QR Codes', value: Number(stats.used_qr_codes), color: '#10B981' },
        { name: 'Unused QR Codes', value: Number(stats.unused_qr_codes), color: '#F59E0B' }
    ] : [];

    // Sort materials by quantity descending to display material distribution
    const topMaterials = [...materials]
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 8)
        .map(m => ({
            name: m.name,
            quantity: m.stock
        }));

    const PIE_COLORS = ['#4F8CFF', '#E2E8F0'];
    const QR_COLORS = ['#10B981', '#F59E0B'];

    return (
        <div className="space-y-10 pb-20 animate-saas-fade">
            {/* Header section */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <TrendingUp className="text-[#4F8CFF]" />
                        Manager Command Center
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Warehouse status, alerts & stock utilization dashboard</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Sync Status: Updated {lastUpdated}
                        </span>
                    )}
                    <button
                        onClick={() => fetchStats(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl shadow-sm border border-slate-200 text-xs font-bold transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
                        Live Refresh (10s)
                    </button>
                </div>
            </header>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {/* 📦 Total Materials */}
                <StatsCard 
                    title="Total Materials" 
                    value={stats.total_materials} 
                    icon={Package} 
                    colorClass="text-blue-600 bg-blue-50 border border-blue-100/50" 
                    subtitle="Registered SKUs cataloged"
                />

                {/* 🏭 Total Inventory */}
                <StatsCard 
                    title="Total Inventory" 
                    value={`${stats.total_inventory.toLocaleString()} KG`} 
                    icon={Database} 
                    colorClass="text-indigo-600 bg-indigo-55 border border-indigo-100/50" 
                    subtitle="Sum of active materials"
                />

                {/* 🗄 Total Racks */}
                <StatsCard 
                    title="Total Racks" 
                    value={stats.total_racks} 
                    icon={Grid} 
                    colorClass="text-purple-600 bg-purple-50 border border-purple-100/50" 
                    subtitle="Warehouse physical slots"
                />

                {/* 📍 Occupied Racks */}
                <StatsCard 
                    title="Occupied Racks" 
                    value={stats.occupied_racks} 
                    icon={MapPin} 
                    colorClass="text-cyan-600 bg-cyan-50 border border-cyan-100/50" 
                    subtitle="Slots containing items"
                />

                {/* 📭 Empty Racks */}
                <StatsCard 
                    title="Empty Racks" 
                    value={stats.empty_racks} 
                    icon={Inbox} 
                    colorClass="text-slate-600 bg-slate-50 border border-slate-200/50" 
                    subtitle="Open slots available"
                />

                {/* 🔳 Total QR Codes */}
                <StatsCard 
                    title="Total QR Codes" 
                    value={stats.total_qr_codes} 
                    icon={QrCode} 
                    colorClass="text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100/50" 
                    subtitle="Printed QR tracker tags"
                />

                {/* ✅ Used QR Codes */}
                <StatsCard 
                    title="Used QR Codes" 
                    value={stats.used_qr_codes} 
                    icon={ShieldCheck} 
                    colorClass="text-emerald-600 bg-emerald-50 border border-emerald-100/50" 
                    subtitle="Assigned QR references"
                />

                {/* ⭕ Unused QR Codes */}
                <StatsCard 
                    title="Unused QR Codes" 
                    value={stats.unused_qr_codes} 
                    icon={Clock} 
                    colorClass="text-amber-600 bg-amber-50 border border-amber-100/50" 
                    subtitle="Unlinked tracker labels"
                />

                {/* ⚠ Active Alerts */}
                <StatsCard 
                    title="Active Alerts" 
                    value={stats.active_alerts} 
                    icon={AlertTriangle} 
                    colorClass={cn(
                        stats.active_alerts > 0 
                            ? "text-rose-600 bg-rose-100 animate-pulse border border-rose-300"
                            : "text-slate-400 bg-slate-50 border border-slate-200"
                    )} 
                    subtitle="Critical anomalies unresolved"
                />

                {/* 📊 Warehouse Utilization % */}
                <StatsCard 
                    title="Utilization %" 
                    value={`${stats.warehouse_utilization.toFixed(2)}%`} 
                    icon={Percent} 
                    colorClass="text-violet-600 bg-violet-50 border border-violet-100/50" 
                    subtitle="Net storage volume used"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Material Distribution Chart (Bar) */}
                <Card className="lg:col-span-6 border-none shadow-md overflow-hidden rounded-3xl bg-white">
                    <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Database size={16} className="text-[#4F8CFF]" />
                            Material Distribution (Top 8 Stock Volume)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[300px]" style={{ width: '100%', minHeight: 300 }}>
                            {topMaterials.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={topMaterials} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 700 }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 700 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '11px', fontWeight: '800' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="quantity" fill="#4F8CFF" radius={[6, 6, 0, 0]} barSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
                                    No material data available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Rack Occupancy Chart (Pie) */}
                <Card className="lg:col-span-3 border-none shadow-md overflow-hidden rounded-3xl bg-white">
                    <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Grid size={16} className="text-[#4F8CFF]" />
                            Rack Occupancy Ratio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        <div className="h-[200px] w-full" style={{ width: '100%', minHeight: 200 }}>
                            {Number(stats.total_racks) > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={rackOccupancyData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {rackOccupancyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
                                    No rack data available
                                </div>
                            )}
                        </div>
                        {Number(stats.total_racks) > 0 && (
                            <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold text-slate-550">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#4F8CFF]" />
                                    <span>Occupied ({stats.occupied_racks})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#E2E8F0]" />
                                    <span>Empty ({stats.empty_racks})</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3. QR Usage Chart (Pie/Donut) */}
                <Card className="lg:col-span-3 border-none shadow-md overflow-hidden rounded-3xl bg-white">
                    <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/20">
                        <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <QrCode size={16} className="text-[#4F8CFF]" />
                            QR Registry Allocation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        <div className="h-[200px] w-full" style={{ width: '100%', minHeight: 200 }}>
                            {Number(stats.total_qr_codes) > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={qrUsageData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {qrUsageData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={QR_COLORS[index % QR_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
                                    No QR codes generated
                                </div>
                            )}
                        </div>
                        {Number(stats.total_qr_codes) > 0 && (
                            <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold text-slate-550">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                                    <span>Used ({stats.used_qr_codes})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                                    <span>Unused ({stats.unused_qr_codes})</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ManagerDashboard;
