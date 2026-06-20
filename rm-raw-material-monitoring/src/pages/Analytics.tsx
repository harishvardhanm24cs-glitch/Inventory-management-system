import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, Box, AlertTriangle, Clock, Download, Filter, 
    BarChart3, PieChart as PieChartIcon, ArrowRightLeft, RefreshCw,
    Layers, QrCode, FileText, Grid, Database, Inbox, Activity, ShieldAlert,
    MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
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
    Legend,
    AreaChart,
    Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    colorClass, 
    subtitle 
}: { 
    title: string; 
    value: string | number; 
    icon: any; 
    colorClass: string; 
    subtitle?: string;
}) => {
    return (
        <Card className="border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-md">
            <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{title}</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
                    {subtitle && <p className="text-[10px] font-semibold text-slate-500">{subtitle}</p>}
                </div>
                <div className={cn("p-3 rounded-xl bg-slate-50 border border-slate-100", colorClass)}>
                    <Icon size={20} className="stroke-[2.5]" />
                </div>
            </CardContent>
        </Card>
    );
};

const Analytics = () => {
    const { materials, loading: inventoryLoading, warehouseStats } = useInventory();
    const [stockData, setStockData] = useState<any[]>([]);
    const [supplierData, setSupplierData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Traffic Analytics states
    const [trafficData, setTrafficData] = useState<any | null>(null);
    const [loadingTraffic, setLoadingTraffic] = useState(true);

    const stats = warehouseStats || {
        totalMaterials: materials.length,
        totalQrCodes: 0,
        usedQrCodes: 0,
        unusedQrCodes: 0,
        totalRacks: 0,
        occupiedRacks: 0,
        emptyRacks: 0,
        utilizationPercentage: 0,
        criticalAlertsCount: 0
    };

    const fetchTraffic = async () => {
        try {
            const res = await api.getTrafficAnalytics();
            if (res && res.data) {
                setTrafficData(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch traffic analytics:', error);
        } finally {
            setLoadingTraffic(false);
        }
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                // In a real app, these would be separate API calls
                // For now, we'll derive some from inventory and mock others
                setStockData(materials.slice(0, 8).map(m => ({
                    name: m.name,
                    stock: m.stock,
                    min: m.minLimit
                })));

                setSupplierData([
                    { name: 'Global Paints Co', value: 40 },
                    { name: 'Industrial Chem', value: 30 },
                    { name: 'Titanium Labs', value: 20 },
                    { name: 'Other', value: 10 },
                ]);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!inventoryLoading) {
            fetchAnalytics();
        }
    }, [materials, inventoryLoading]);

    // Live traffic auto-update interval (polls every 15 seconds)
    useEffect(() => {
        fetchTraffic();
        const interval = setInterval(fetchTraffic, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Intelligence</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Predictive monitoring and inventory performance metrics</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="bg-white border border-slate-200">
                        <Download size={16} className="mr-2" />
                        Export Data
                    </Button>
                    <Button>
                        <RefreshCw size={16} className="mr-2" />
                        Live Sync
                    </Button>
                </div>
            </div>

            {/* Warehouse Overview Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <StatsCard 
                    title="Total Materials" 
                    value={stats.totalMaterials} 
                    icon={Layers} 
                    colorClass="text-blue-600 bg-blue-55 border-blue-100" 
                    subtitle="Unique registered items"
                />
                <StatsCard 
                    title="Total QR Codes" 
                    value={stats.totalQrCodes} 
                    icon={QrCode} 
                    colorClass="text-indigo-600 bg-indigo-55 border-indigo-100" 
                    subtitle="Registered in QR Registry"
                />
                <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                    <StatsCard 
                        title="Used QRs" 
                        value={stats.usedQrCodes} 
                        icon={FileText} 
                        colorClass="text-emerald-600 bg-emerald-55 border-emerald-100" 
                    />
                    <StatsCard 
                        title="Unused QRs" 
                        value={stats.unusedQrCodes} 
                        icon={Clock} 
                        colorClass="text-amber-600 bg-amber-55 border-amber-100" 
                    />
                </div>
                <StatsCard 
                    title="Total Racks" 
                    value={stats.totalRacks} 
                    icon={Grid} 
                    colorClass="text-purple-600 bg-purple-55 border-purple-100" 
                    subtitle="Physical slot capacity"
                />
                <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                    <StatsCard 
                        title="Occupied Racks" 
                        value={stats.occupiedRacks} 
                        icon={Database} 
                        colorClass="text-cyan-600 bg-cyan-55 border-cyan-100" 
                    />
                    <StatsCard 
                        title="Empty Racks" 
                        value={stats.emptyRacks} 
                        icon={Inbox} 
                        colorClass="text-slate-600 bg-slate-55 border-slate-100" 
                    />
                </div>
                <StatsCard 
                    title="Warehouse Utilization" 
                    value={`${stats.utilizationPercentage.toFixed(2)}%`} 
                    icon={Activity} 
                    colorClass="text-violet-600 bg-violet-55 border-violet-100" 
                    subtitle="Stock volume occupancy"
                />
                <div className="lg:col-span-3">
                    <Card className={cn(
                        "border shadow-sm transition-all duration-300 rounded-2xl overflow-hidden backdrop-blur-md",
                        stats.criticalAlertsCount > 0 
                            ? "bg-rose-50/50 border-rose-200 shadow-rose-100/50 animate-in fade-in" 
                            : "bg-white/60 border-slate-100"
                    )}>
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3.5 rounded-xl border",
                                    stats.criticalAlertsCount > 0 
                                        ? "text-rose-600 bg-rose-100/80 border-rose-300 animate-pulse" 
                                        : "text-slate-400 bg-slate-50 border-slate-100"
                                )}>
                                    <ShieldAlert size={24} className="stroke-[2.5]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Active Critical Alerts</p>
                                    <h3 className={cn(
                                        "text-lg font-extrabold tracking-tight mt-0.5",
                                        stats.criticalAlertsCount > 0 ? "text-rose-700" : "text-slate-900"
                                    )}>
                                        {stats.criticalAlertsCount} active anomaly notifications
                                    </h3>
                                </div>
                            </div>
                            <Button 
                                variant="secondary" 
                                onClick={() => window.location.href = '/alerts'}
                                className={cn(
                                    "rounded-xl font-bold text-xs uppercase tracking-wider px-4 py-2 border",
                                    stats.criticalAlertsCount > 0 
                                        ? "text-rose-700 bg-white border-rose-300 hover:bg-rose-50" 
                                        : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                View Logs
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Warehouse Traffic Analytics Section */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Activity className="text-[#4F8CFF] animate-pulse" />
                            Warehouse Traffic Analytics
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Real-time throughput and storage cell movement frequencies</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Live Sync Active
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatsCard 
                        title="Most Active Rack" 
                        value={trafficData?.mostActiveRack?.rack_code || 'N/A'} 
                        icon={MapPin} 
                        colorClass="text-blue-600 bg-blue-50 border-blue-100" 
                        subtitle={`Total actions: ${trafficData?.mostActiveRack?.count || 0}`}
                    />
                    <StatsCard 
                        title="Least Active Rack" 
                        value={trafficData?.leastActiveRack?.rack_code || 'N/A'} 
                        icon={Inbox} 
                        colorClass="text-slate-500 bg-slate-50 border-slate-100" 
                        subtitle={`Total actions: ${trafficData?.leastActiveRack?.count || 0}`}
                    />
                    <StatsCard 
                        title="Most Moved Material" 
                        value={trafficData?.mostMovedMaterial?.material_name || 'N/A'} 
                        icon={Layers} 
                        colorClass="text-purple-600 bg-purple-50 border-purple-100" 
                        subtitle={`Total moves: ${trafficData?.mostMovedMaterial?.count || 0}`}
                    />
                    <StatsCard 
                        title="Today's Movements" 
                        value={trafficData?.todayMovements || 0} 
                        icon={Clock} 
                        colorClass="text-amber-600 bg-amber-50 border-amber-100" 
                        subtitle="Scans logged today"
                    />
                    <StatsCard 
                        title="This Week Movements" 
                        value={trafficData?.thisWeekMovements || 0} 
                        icon={TrendingUp} 
                        colorClass="text-emerald-600 bg-emerald-50 border-emerald-100" 
                        subtitle="Scans in last 7 days"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Traffic Trend Chart */}
                <Card className="lg:col-span-7 border-none shadow-md overflow-hidden rounded-2xl">
                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#4F8CFF]" />
                            Warehouse Activity Trend (Last 7 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[300px]">
                            {loadingTraffic ? (
                                <LoadingSpinner message="Calculating throughput trends..." />
                            ) : trafficData?.dailyMovements?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={trafficData.dailyMovements}>
                                        <defs>
                                            <linearGradient id="colorMovements" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4F8CFF" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#4F8CFF" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                        />
                                        <Area type="monotone" dataKey="count" name="Movements" stroke="#4F8CFF" strokeWidth={3} fillOpacity={1} fill="url(#colorMovements)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState 
                                    icon={Activity}
                                    title="No Movements Recorded"
                                    description="Perform inward, outward, or rack movements to display activity charts."
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Rack Load Distribution */}
                <Card className="lg:col-span-5 border-none shadow-md overflow-hidden rounded-2xl">
                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Grid size={18} className="text-[#4F8CFF]" />
                            Rack Activity Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[300px]">
                            {loadingTraffic ? (
                                <LoadingSpinner message="Evaluating load distribution..." />
                            ) : trafficData?.rackActivity?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={trafficData.rackActivity}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="rack_code" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="count" name="Actions" fill="#A855F7" radius={[6, 6, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState 
                                    icon={Grid}
                                    title="No Rack Activity"
                                    description="Racks will display activity data as material is stored and dispatched."
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Stock Chart */}
                <Card className="lg:col-span-8 border-none shadow-md overflow-hidden rounded-2xl">
                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Box size={18} className="text-primary" />
                            Inventory Health Index
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[400px]">
                            {loading || inventoryLoading ? (
                                <LoadingSpinner message="Compiling real-time health data..." />
                            ) : stockData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={stockData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="stock" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={32} />
                                        <Bar dataKey="min" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState 
                                    icon={BarChart3}
                                    title="No Analytics Data"
                                    description="Register materials to see real-time performance tracking."
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Donut Chart */}
                <Card className="lg:col-span-4 border-none shadow-md overflow-hidden rounded-2xl">
                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <PieChartIcon size={18} className="text-primary" />
                            Supplier Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[400px]">
                            {loading || inventoryLoading ? (
                                <LoadingSpinner message="Mapping source data..." />
                            ) : (
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={supplierData}
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {supplierData.map((_entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Analytics;
