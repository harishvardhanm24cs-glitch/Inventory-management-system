
import {
    Box,
    TrendingUp,
    Settings,
    History,
    Bell,
    ChevronRight,
    Camera
} from 'lucide-react';
import DashboardTile from '../components/dashboard/DashboardTile';
import ReorderSummary from '../components/dashboard/ReorderSummary';
import { Card, CardContent } from '../components/ui/Card';
import type { UserRole } from '../types';
import { useInventory } from '../context/InventoryContext';

type DashboardTileData = {
    icon: any;
    label: string;
    to: string;
    color: string;
    roles?: UserRole[]; // Optional: if not specified, available to all roles
};

const Dashboard = () => {
    const { materials, alerts } = useInventory();

    const totalLiquids = materials
        .filter(m => m.unit === 'L')
        .reduce((acc, m) => acc + m.stock, 0);

    const activeAlertsCount = alerts.length;
    const trackedCount = materials.length;

    const tiles: DashboardTileData[] = [
        { icon: Camera, label: 'Smart Scanner', to: '/scanner', color: '#3B82F6' },
        { icon: Box, label: 'Inventory List', to: '/inventory', color: '#10B981' },
        { icon: Settings, label: 'Limit Config', to: '/settings', color: '#6B7280' },
        { icon: TrendingUp, label: 'Analytics', to: '/analytics', color: '#A855F7' },
        { icon: History, label: 'Ledger Registry', to: '/transactions', color: '#F59E0B' },
        { icon: Bell, label: 'Alert Center', to: '/alerts', color: '#EF4444' },
    ];

    return (
        <div className="space-y-10 pb-20 animate-saas-fade">
            
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitor</h1>
                    <p className="text-sm text-slate-500 mt-1">Industrial inventory control & real-time monitoring unit</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">System Active</span>
                </div>
            </header>

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

            <div className="grid grid-cols-1 gap-6">
                <ReorderSummary materials={materials} />
            </div>
        </div>
    );
};

export default Dashboard;
