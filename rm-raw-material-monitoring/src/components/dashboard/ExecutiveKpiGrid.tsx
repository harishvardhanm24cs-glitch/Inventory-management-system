import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Warehouse,
  PieChart,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Server,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useInventory } from '../../context/InventoryContext';

export interface KpiItem {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  colorScheme: 'blue' | 'indigo' | 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose' | 'slate';
}

export const ExecutiveKpiGrid: React.FC = () => {
  const { warehouseStats, materials, racks } = useInventory();

  const totalCap = racks.reduce((s, r) => s + (parseFloat(String(r.max_capacity)) || 0), 0) || 120000;
  const totalWeight = materials.reduce((s, m) => s + (m.stock || 0), 0);
  const activeCount = materials.length;
  const occupiedCount = warehouseStats?.occupiedRacks ?? racks.filter(r => (parseFloat(String(r.quantity)) || 0) > 0).length;
  const totalRacksCount = warehouseStats?.totalRacks ?? racks.length;
  const lowStockCount = warehouseStats?.lowStockCount ?? materials.filter(m => m.status === 'low' || m.status === 'critical').length;
  const utilPct = warehouseStats?.utilizationPercentage ?? (totalCap > 0 ? ((totalWeight / totalCap) * 100).toFixed(1) : '78.4');
  const todayInward = warehouseStats?.todayInward ?? 0;
  const todayOutward = warehouseStats?.todayOutward ?? 0;
  const dailyFlow = todayInward + todayOutward;
  const healthScore = warehouseStats?.systemHealthScore ?? 100;

  const kpis: KpiItem[] = [
    {
      id: 'total-capacity',
      title: 'Total Storage Capacity',
      value: `${totalCap.toLocaleString('en-IN')} KG`,
      description: `Registered across ${totalRacksCount || 4} warehouse racks`,
      icon: Warehouse,
      trend: 'Active',
      trendType: 'up',
      colorScheme: 'blue'
    },
    {
      id: 'occupancy-rate',
      title: 'Overall Occupancy Rate',
      value: `${utilPct}%`,
      description: 'Real-time capacity utilization',
      icon: PieChart,
      trend: Number(utilPct) > 80 ? 'High' : 'Optimal',
      trendType: Number(utilPct) > 80 ? 'down' : 'up',
      colorScheme: Number(utilPct) > 80 ? 'amber' : 'violet'
    },
    {
      id: 'active-materials',
      title: 'Active Raw Materials',
      value: `${activeCount} SKUs`,
      description: `Total ${totalWeight.toLocaleString('en-IN')} KG in stock`,
      icon: Boxes,
      trend: `${activeCount} items`,
      trendType: 'up',
      colorScheme: 'cyan'
    },
    {
      id: 'material-flow',
      title: 'Daily Material Flow',
      value: `${dailyFlow} Transfers`,
      description: `⬇ ${todayInward} Inward | ⬆ ${todayOutward} Outward today`,
      icon: TrendingUp,
      trend: todayInward > 0 ? `+${todayInward} in` : 'Live',
      trendType: 'up',
      colorScheme: 'emerald'
    },
    {
      id: 'stock-alerts',
      title: 'Low Stock Alerts',
      value: `${lowStockCount} Items`,
      description: 'Below minimum threshold',
      icon: AlertTriangle,
      trend: lowStockCount > 0 ? 'Action Required' : 'All Good',
      trendType: lowStockCount > 0 ? 'down' : 'neutral',
      colorScheme: lowStockCount > 0 ? 'rose' : 'emerald'
    },
    {
      id: 'racks-occupied',
      title: 'Storage Racks Occupied',
      value: `${occupiedCount} / ${totalRacksCount}`,
      description: `${totalRacksCount > 0 ? Math.round((occupiedCount / totalRacksCount) * 100) : 0}% total rack space assigned`,
      icon: Server,
      trend: 'Live Sync',
      trendType: 'neutral',
      colorScheme: 'indigo'
    },
    {
      id: 'turnaround-speed',
      title: 'Turnaround Speed',
      value: 'Instant Scan',
      description: 'Continuous camera vision active',
      icon: Zap,
      trend: 'Hands-Free',
      trendType: 'up',
      colorScheme: 'amber'
    },
    {
      id: 'sensor-status',
      title: 'AI System Health',
      value: `${healthScore}%`,
      description: 'Real-time database & vision feed',
      icon: ShieldCheck,
      trend: healthScore >= 90 ? 'Optimal' : 'Check Alert',
      trendType: healthScore >= 90 ? 'up' : 'down',
      colorScheme: healthScore >= 90 ? 'emerald' : 'rose'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Executive Key Performance Indicators
        </h2>
        <span className="text-xs font-mono text-slate-400">8 Real-Time Core Metrics</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
            trend={kpi.trend}
            trendType={kpi.trendType}
            colorScheme={kpi.colorScheme}
          />
        ))}
      </div>
    </div>
  );
};

export default ExecutiveKpiGrid;
