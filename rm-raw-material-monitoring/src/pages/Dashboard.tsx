import React, { useState, useEffect } from 'react';
import {
    Box,
    TrendingUp,
    Settings,
    History,
    Bell,
    ChevronRight,
    Camera,
    Database,
    ShieldCheck,
    Inbox,
    Package,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Percent,
    Clock,
    Brain,
    Sparkles,
    QrCode
} from 'lucide-react';
import DashboardTile from '../components/dashboard/DashboardTile';
import ReorderSummary from '../components/dashboard/ReorderSummary';
import { Card, CardContent } from '../components/ui/Card';
import type { UserRole } from '../types';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { cn } from '../lib/utils';

type DashboardTileData = {
    icon: any;
    label: string;
    to: string;
    color: string;
    roles?: UserRole[]; // Optional: if not specified, available to all roles
};

const getSafeNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
};

const Dashboard = () => {
    const { role } = useAuth();
    const { materials, alerts, warehouseStats, batches, lastUpdated, loading: statsLoading } = useInventory();

    const [predictions, setPredictions] = useState<any[]>([]);
    const [loadingPredictions, setLoadingPredictions] = useState(true);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const res = await api.getPredictions();
                if (res && res.data) {
                    setPredictions(res.data);
                } else if (Array.isArray(res)) {
                    setPredictions(res);
                }
            } catch (err) {
                console.error("Failed to fetch predictions:", err);
            } finally {
                setLoadingPredictions(false);
            }
        };
        fetchPredictions();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchPredictions, 30000);
        return () => clearInterval(interval);
    }, [lastUpdated]);

    // Handle early loading screen if data is not loaded yet
    if (statsLoading && !warehouseStats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary" />
                <p className="text-sm font-semibold text-slate-600 animate-pulse">Loading Dashboard...</p>
            </div>
        );
    }

    const safeMaterials = materials || [];
    const safeAlerts = alerts || [];
    const safeBatches = batches || [];

    const totalLiquids = safeMaterials
        .filter(m => m && m.unit === 'L')
        .reduce((acc, m) => acc + getSafeNumber(m?.stock), 0);

    const activeAlertsCount = safeAlerts.length;
    const trackedCount = safeMaterials.length;

    // FIFO Calculations
    const activeBatches = safeBatches.filter((b: any) => b && getSafeNumber(b.quantity) > 0);
    const fifoQueue = [...activeBatches].sort((a, b) => {
        const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
    });

    // Oldest and Newest
    const oldestBatch = fifoQueue[0] || null;
    const newestBatch = fifoQueue[fifoQueue.length - 1] || null;

    const getDaysStored = (dateStr: string) => {
        if (!dateStr) return 0;
        const storedTime = new Date(dateStr).getTime();
        if (isNaN(storedTime)) return 0;
        const diff = Date.now() - storedTime;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days < 0 ? 0 : days;
    };

    // Cast and validate all API stats safely
    const safeTotalMaterials = getSafeNumber(warehouseStats?.totalMaterials ?? warehouseStats?.total_materials ?? safeMaterials.length);
    const safeTotalInventory = getSafeNumber(warehouseStats?.totalWeight ?? warehouseStats?.total_inventory ?? warehouseStats?.totalInventory ?? safeMaterials.reduce((acc, m) => acc + getSafeNumber(m?.stock), 0));
    const safeTotalQrCodes = getSafeNumber(warehouseStats?.totalQrCodes ?? warehouseStats?.total_qr_codes);
    const safeUsedQrCodes = getSafeNumber(warehouseStats?.usedQrCodes ?? warehouseStats?.used_qr_codes);
    const safeUnusedQrCodes = getSafeNumber(warehouseStats?.unusedQrCodes ?? warehouseStats?.unused_qr_codes);
    const safeTotalRacks = getSafeNumber(warehouseStats?.totalRacks ?? warehouseStats?.total_racks);
    const safeWarehouseUtilization = getSafeNumber(warehouseStats?.warehouseUtilization ?? warehouseStats?.warehouse_utilization ?? warehouseStats?.utilizationPercentage ?? warehouseStats?.occupancyPercentage);
    const safeActiveRacks = getSafeNumber(warehouseStats?.activeRacks ?? warehouseStats?.occupiedRacks ?? warehouseStats?.occupied_racks);
    const safeEmptyRacks = getSafeNumber(warehouseStats?.emptyRacks ?? warehouseStats?.empty_racks);
    const safeCriticalMaterials = getSafeNumber(warehouseStats?.criticalMaterials ?? warehouseStats?.critical_materials);
    const safeTodayInward = getSafeNumber(warehouseStats?.todayInward ?? warehouseStats?.today_inward);
    const safeTodayOutward = getSafeNumber(warehouseStats?.todayOutward ?? warehouseStats?.today_outward);

    const tiles: DashboardTileData[] = [
        { icon: Camera, label: 'Smart Scanner', to: '/scanner', color: '#3B82F6' },
        { icon: Box, label: 'Inventory List', to: '/inventory', color: '#10B981' },
        { icon: Settings, label: 'Limit Config', to: '/settings', color: '#6B7280' },
        { icon: TrendingUp, label: 'Analytics', to: '/analytics', color: '#A855F7' },
        { icon: History, label: 'Ledger Registry', to: '/transactions', color: '#F59E0B' },
        { icon: Bell, label: 'Alert Center', to: '/alerts', color: '#EF4444' },
        { icon: Database, label: 'Audit Log', to: '/audit', color: '#3B82F6' },
    ];

    return (
        <div className="space-y-10 pb-20 animate-saas-fade">
            
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitor</h1>
                    <p className="text-sm text-slate-500 mt-1">Industrial inventory control & real-time monitoring unit</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Last Updated: {lastUpdated}
                        </span>
                    )}
                    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">System Active</span>
                    </div>
                </div>
            </header>

            {/* Conditional Dashboard HUD based on Role */}
            {role === 'manager' ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <h2 className="text-sm font-bold text-slate-405 uppercase tracking-widest ml-1">Manager Command HUD</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* 1. Total Materials */}
                        <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div className="icon-container bg-blue-50 text-blue-600">
                                    <Package size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Total Materials</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {safeTotalMaterials.toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">Active catalog SKUs</p>
                        </div>

                        {/* 2. Total Inventory */}
                        <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div className="icon-container bg-indigo-50 text-indigo-600">
                                    <Database size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Total Inventory</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {safeTotalInventory.toLocaleString()} <span className="text-xs font-semibold text-slate-400">KG</span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">Total stock volume weight</p>
                        </div>

                        {/* 3. Total QR Codes */}
                        <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div className="icon-container bg-purple-50 text-purple-600">
                                    <QrCode size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Total QR Codes</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {safeTotalQrCodes.toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">All registered track tags</p>
                        </div>

                        {/* 4. Used QR Codes */}
                        <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div className="icon-container bg-emerald-50 text-emerald-600">
                                    <ShieldCheck size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Used QR Codes</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {safeUsedQrCodes.toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">Scanned & stored in racks</p>
                        </div>

                        {/* 5. Unused QR Codes */}
                        <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div className="icon-container bg-amber-50 text-amber-600">
                                    <Clock size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Unused QR Codes</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {safeUnusedQrCodes.toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">Pending initial inward scan</p>
                        </div>

                        {/* 6. Total Racks */}
                        <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div className="icon-container bg-slate-100 text-slate-500">
                                    <Box size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Total Racks</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {safeTotalRacks.toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">Physical storage locations</p>
                        </div>

                        {/* 7. Warehouse Utilization */}
                        <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div className="icon-container bg-cyan-50 text-cyan-600">
                                    <Percent size={18} />
                                </div>
                                <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Warehouse Utilization</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {safeWarehouseUtilization.toLocaleString()}%
                            </h3>
                            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full transition-all duration-500",
                                        safeWarehouseUtilization < 70 ? "bg-emerald-500" :
                                        safeWarehouseUtilization < 90 ? "bg-amber-500" : "bg-rose-500"
                                    )} 
                                    style={{ width: `${Math.min(safeWarehouseUtilization, 100)}%` }} 
                                />
                            </div>
                        </div>

                        {/* 8. Active Alerts */}
                        <div className={cn(
                            "saas-card p-5 hover:scale-[1.01] transition-transform duration-300",
                            activeAlertsCount > 0 ? "border-rose-200 bg-rose-50/10 shadow-[0_0_15px_rgba(244,63,94,0.02)]" : ""
                        )}>
                            <div className="flex justify-between items-center mb-4">
                                <div className={cn(
                                    "icon-container",
                                    activeAlertsCount > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-500"
                                )}>
                                    <Bell size={18} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    activeAlertsCount > 0 ? "text-rose-500" : "text-slate-400"
                                )}>Active Alerts</span>
                            </div>
                            <h3 className={cn(
                                "text-2xl font-bold",
                                activeAlertsCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-800"
                            )}>{activeAlertsCount.toLocaleString()}</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">Active system warnings</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Metrics Row - Phase 19 Alignment */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="saas-card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="icon-container bg-blue-50 text-[#4F8CFF]">
                                    <Box size={20} />
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Critical Stock</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{totalLiquids.toLocaleString()}</h3>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Liters</span>
                            </div>
                            <div className="mt-6 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#4F8CFF] w-2/3" />
                            </div>
                        </div>

                        <div className="saas-card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="icon-container bg-purple-50 text-purple-600">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Forecast</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">72</h3>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hours Remaining</span>
                            </div>
                            <div className="mt-6 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 w-3/4" />
                            </div>
                        </div>

                        <div className="saas-card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="icon-container bg-emerald-50 text-emerald-600">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Accuracy</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">98.4</h3>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% Efficiency</span>
                            </div>
                            <div className="mt-6 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[98.4%]" />
                            </div>
                        </div>
                    </div>

                    {/* Warehouse Analytics Panel */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Warehouse Analytics</h2>
                            <span className="text-[10px] font-black text-slate-450 bg-white border border-slate-150 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="font-mono uppercase tracking-wider text-slate-500">Live Telemetry (10s)</span>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Utilization Card */}
                            <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="icon-container bg-blue-50 text-blue-600">
                                        <Percent size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Utilization</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{safeWarehouseUtilization.toLocaleString()}%</h3>
                                <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            safeWarehouseUtilization < 70 ? "bg-emerald-500" :
                                            safeWarehouseUtilization < 90 ? "bg-amber-500" : "bg-rose-500"
                                        )} 
                                        style={{ width: `${Math.min(safeWarehouseUtilization, 100)}%` }} 
                                    />
                                </div>
                            </div>

                            {/* Total Racks Card */}
                            <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="icon-container bg-indigo-50 text-indigo-600">
                                        <Database size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Total Racks</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{safeTotalRacks.toLocaleString()}</h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">Physical storage locations</p>
                            </div>

                            {/* Occupied Slots Card */}
                            <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="icon-container bg-emerald-50 text-emerald-600">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Occupied Slots</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{safeActiveRacks.toLocaleString()}</h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">Active stocked slots</p>
                            </div>

                            {/* Empty Slots Card */}
                            <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="icon-container bg-slate-100 text-slate-500">
                                        <Inbox size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Empty Slots</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{safeEmptyRacks.toLocaleString()}</h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">Available free slots</p>
                            </div>

                            {/* Total Materials Card */}
                            <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="icon-container bg-purple-50 text-purple-600">
                                        <Package size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Total Materials</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{safeTotalMaterials.toLocaleString()}</h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">Registered SKUs in system</p>
                            </div>

                            {/* Critical Materials Card */}
                            <div className={cn(
                                "saas-card p-5 hover:scale-[1.01] transition-transform duration-300",
                                safeCriticalMaterials > 0 ? "border-rose-200 bg-rose-50/10 shadow-[0_0_15px_rgba(244,63,94,0.02)]" : ""
                            )}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className={cn(
                                        "icon-container",
                                        safeCriticalMaterials > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-500"
                                    )}>
                                        <AlertTriangle size={18} />
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        safeCriticalMaterials > 0 ? "text-rose-500" : "text-slate-400"
                                    )}>Critical Materials</span>
                                </div>
                                <h3 className={cn(
                                    "text-2xl font-bold",
                                    safeCriticalMaterials > 0 ? "text-rose-600 animate-pulse" : "text-slate-800"
                                )}>{safeCriticalMaterials.toLocaleString()}</h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">Active stock deficits</p>
                            </div>

                            {/* Today's Inward Card */}
                            <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="icon-container bg-emerald-50 text-emerald-600">
                                        <ArrowDownRight size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest font-mono">Today's Inward</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{safeTodayInward.toLocaleString()} <span className="text-xs font-semibold text-slate-400">KG</span></h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">Received today</p>
                            </div>

                            {/* Today's Outward Card */}
                            <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="icon-container bg-amber-50 text-amber-600">
                                        <ArrowUpRight size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest font-mono">Today's Outward</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">{safeTodayOutward.toLocaleString()} <span className="text-xs font-semibold text-slate-400">KG</span></h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">Dispatched today</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Operational Control Grid */}
            <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {tiles.map((tile) => (
                        <DashboardTile
                            key={tile.label}
                            icon={tile.icon}
                            label={tile.label}
                            to={tile.to}
                            color={tile.color}
                        />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReorderSummary materials={materials} />

                {/* FIFO Dispatch Monitor Widget */}
                <div className="saas-card p-6 flex flex-col justify-between h-full">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                    <Clock className="text-primary" size={18} />
                                    FIFO Dispatch Monitor
                                </h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">First-In, First-Out sequence tracking for optimal rotation</p>
                            </div>
                            <span className="text-[10px] font-black text-slate-455 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                Active Batches: {activeBatches.length}
                            </span>
                        </div>

                        {/* Summary: Oldest & Newest */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block">Oldest Batch (Dispatch First)</span>
                                    <span className="text-xs font-bold text-slate-700 block mt-1.5 truncate">
                                        {oldestBatch ? `${oldestBatch.materialName}` : 'No Active Batches'}
                                    </span>
                                    {oldestBatch && (
                                        <span className="text-[10px] font-mono text-slate-450 block mt-0.5">#{oldestBatch.batchNumber}</span>
                                    )}
                                </div>
                                {oldestBatch && (
                                    <div className="mt-3 flex items-baseline gap-1.5">
                                        <span className={cn(
                                            "text-lg font-black",
                                            getDaysStored(oldestBatch.createdAt) > 14 ? "text-rose-600 animate-pulse" : "text-slate-800"
                                        )}>
                                            {getDaysStored(oldestBatch.createdAt)}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Days Stored</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block">Newest Batch</span>
                                    <span className="text-xs font-bold text-slate-700 block mt-1.5 truncate">
                                        {newestBatch ? `${newestBatch.materialName}` : 'No Active Batches'}
                                    </span>
                                    {newestBatch && (
                                        <span className="text-[10px] font-mono text-slate-455 block mt-0.5">#{newestBatch.batchNumber}</span>
                                    )}
                                </div>
                                {newestBatch && (
                                    <div className="mt-3 flex items-baseline gap-1.5">
                                        <span className="text-lg font-black text-slate-800">
                                            {getDaysStored(newestBatch.createdAt)}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Days Stored</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top FIFO Priority Queue Table */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-wider pl-1">FIFO Queue & Dispatch Order</h4>
                            {fifoQueue.length > 0 ? (
                                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                                    <div className="divide-y divide-slate-100">
                                        {fifoQueue.slice(0, 4).map((batch, index) => {
                                            const days = getDaysStored(batch.createdAt);
                                            const isOverdue = days > 14;
                                            
                                            return (
                                                <div key={batch.id} className={cn(
                                                    "p-3 flex justify-between items-center gap-4 transition-colors",
                                                    isOverdue ? "bg-rose-50/10 border-l-2 border-l-rose-500" : "hover:bg-slate-50/40"
                                                )}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                                            index === 0 ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse font-extrabold" :
                                                            index === 1 ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                            "bg-slate-100 text-slate-500 border-slate-200"
                                                        )}>
                                                            {index === 0 ? "Priority 1" : `Priority ${index + 1}`}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate">{batch.materialName}</p>
                                                            <code className="text-[9px] font-bold text-slate-400 font-mono mt-0.5 block">Batch: #{batch.batchNumber}</code>
                                                        </div>
                                                    </div>

                                                    <div className="text-right flex items-center gap-4 shrink-0 font-mono">
                                                        <div>
                                                            <div className="flex items-center gap-1">
                                                                <span className={cn(
                                                                    "text-xs font-black",
                                                                    isOverdue ? "text-rose-600 animate-pulse" : "text-slate-700"
                                                                )}>
                                                                    {days} Days
                                                                </span>
                                                                {isOverdue && (
                                                                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                                                                )}
                                                            </div>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mt-0.5">Age</span>
                                                        </div>

                                                        <div className="border-l border-slate-155 pl-4 text-right">
                                                            <span className="text-xs font-bold text-slate-700 block">{batch.quantity} KG</span>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mt-0.5">Stock</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center justify-center text-slate-400">
                                    <Clock size={24} className="stroke-[1.5] mb-2" />
                                    <p className="text-xs font-semibold">No stock batches in database</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Stock Prediction Widget */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Brain className="text-purple-500" size={18} />
                        AI Demand & Shortage Predictor
                    </h2>
                    <span className="text-[10px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                        <Sparkles size={12} className="text-purple-500 animate-pulse" />
                        <span className="font-mono uppercase tracking-wider">Predictive AI Engine Active</span>
                    </span>
                </div>

                <div className="glass-panel overflow-hidden border border-slate-200/60 rounded-2xl shadow-sm bg-white p-6">
                    {loadingPredictions ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-semibold text-slate-400">Analyzing historical consumption trends...</p>
                        </div>
                    ) : predictions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200/60">
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-555 uppercase tracking-wider">Material Name</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-555 uppercase tracking-wider">Stock Level</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-555 uppercase tracking-wider">Consumption Trend</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-555 uppercase tracking-wider">Risk Score</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-555 uppercase tracking-wider">Est. Depletion</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-555 uppercase tracking-wider">Est. Reorder Date</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-555 uppercase tracking-wider">Rec. Reorder Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {predictions.map((p) => {
                                        const isHighRisk = p.risk === 'High';
                                        const isMediumRisk = p.risk === 'Medium';
                                        
                                        return (
                                            <tr key={p.id} className={cn(
                                                "hover:bg-slate-50/40 transition-colors group",
                                                isHighRisk ? "bg-rose-50/5" : ""
                                            )}>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 group-hover:text-primary transition-colors">{p.materialName}</span>
                                                        <span className="text-[10px] text-slate-405 font-mono mt-0.5">{p.barcode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-baseline gap-1 font-mono">
                                                        <span className="font-bold text-slate-700 text-sm">{p.quantity}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">{p.unit}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {p.trend === 'Increasing' ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                                                <ArrowUpRight size={12} className="animate-bounce" />
                                                                INCREASING
                                                            </span>
                                                        ) : p.trend === 'Decreasing' ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                                <ArrowDownRight size={12} />
                                                                DECREASING
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                                                <TrendingUp size={12} className="text-slate-400" />
                                                                STABLE
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col w-24 gap-1.5">
                                                        <div className="flex justify-between items-center font-mono">
                                                            <span className={cn(
                                                                "text-[10px] font-black px-1.5 py-0.2 rounded border",
                                                                isHighRisk ? "bg-rose-50 text-rose-600 border-rose-150" :
                                                                isMediumRisk ? "bg-amber-50 text-amber-600 border-amber-150" :
                                                                "bg-slate-50 text-slate-500 border-slate-150"
                                                            )}>
                                                                {p.risk}
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-700">{p.riskScore}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn(
                                                                    "h-full transition-all duration-300",
                                                                    isHighRisk ? "bg-rose-500" :
                                                                    isMediumRisk ? "bg-amber-500" : "bg-slate-400"
                                                                )}
                                                                style={{ width: `${p.riskScore}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-mono">
                                                    <div className="flex flex-col">
                                                        <span className={cn(
                                                            "text-sm font-black",
                                                            isHighRisk ? "text-rose-600 animate-pulse font-extrabold" : "text-slate-700"
                                                        )}>
                                                            {p.depletionDate ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(p.depletionDate)) : 'N/A'}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold font-sans uppercase tracking-wider mt-0.5">
                                                            {p.daysUntilDepletion} {p.daysUntilDepletion === 1 ? 'day' : 'days'} left
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-mono">
                                                    <div className="flex flex-col">
                                                        <span className={cn(
                                                            "text-sm font-black",
                                                            p.daysUntilReorder === 0 ? "text-rose-600 font-extrabold animate-pulse" : "text-slate-700"
                                                        )}>
                                                            {p.daysUntilReorder === 0 ? 'REORDER NOW' : p.reorderDate ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(p.reorderDate)) : 'N/A'}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold font-sans uppercase tracking-wider mt-0.5">
                                                            {p.daysUntilReorder === 0 ? 'safety limit hit' : `${p.daysUntilReorder} days lead`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-sm font-black text-slate-700">
                                                            {getSafeNumber(p?.recommendedReorderQty).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{p?.unit || ''}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                            <Brain size={24} className="mb-2 text-slate-300" />
                            <p className="text-xs font-semibold">No materials to run predictions on.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

class DashboardErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("DashboardErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 bg-rose-50/10 border border-rose-100 rounded-2xl shadow-sm">
                    <AlertTriangle className="text-rose-500 mb-3 animate-bounce" size={32} />
                    <h2 className="text-base font-bold text-slate-800">Dashboard data unavailable</h2>
                    <p className="text-xs text-slate-550 mt-1">An unexpected error occurred while rendering the dashboard.</p>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        Retry Loading
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

const SafeDashboard = () => (
    <DashboardErrorBoundary>
        <Dashboard />
    </DashboardErrorBoundary>
);

export default SafeDashboard;
