import React, { useState, useMemo, useEffect } from 'react';
import {
  Layout,
  RefreshCw,
  Search,
  Filter,
  Layers,
  MapPin,
  AlertTriangle,
  Inbox,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';

import type { UtilizationMetrics } from '../components/utilization/UtilizationMetricCards';
import { UtilizationMetricCards } from '../components/utilization/UtilizationMetricCards';
import type { RackCapacityItem } from '../components/utilization/UtilizationChartsSection';
import { UtilizationChartsSection } from '../components/utilization/UtilizationChartsSection';
import type { SelectedRackDetails } from '../components/utilization/RackDrillDownModal';
import { RackDrillDownModal } from '../components/utilization/RackDrillDownModal';

const WarehouseUtilizationDashboard: React.FC = () => {
  const { racks, warehouseStats, refreshData, lastUpdated, loading } = useInventory();
  const [selectedRack, setSelectedRack] = useState<SelectedRackDetails | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'occupied' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto-refresh interval (polls every 15s to update automatically after inventory changes)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Compute overall utilization metrics dynamically from racks and warehouseStats
  const metrics: UtilizationMetrics = useMemo(() => {
    const totalRackCount = racks.length;
    const emptyRackCount = racks.filter((r) => (parseFloat(String(r.quantity)) || 0) === 0).length;
    const occupiedRackCount = totalRackCount - emptyRackCount;

    const usedCapacity = racks.reduce((sum, r) => sum + (parseFloat(String(r.quantity)) || 0), 0);
    const totalCapacity = racks.reduce((sum, r) => sum + (parseFloat(String(r.max_capacity)) || 0), 0);
    const availableCapacity = Math.max(0, totalCapacity - usedCapacity);

    const occupancyPercentage = totalCapacity > 0
      ? parseFloat(((usedCapacity / totalCapacity) * 100).toFixed(1))
      : warehouseStats?.utilizationPercentage ?? 0;

    return {
      totalCapacity,
      usedCapacity,
      availableCapacity,
      occupancyPercentage,
      emptyRackCount,
      occupiedRackCount,
      totalRackCount
    };
  }, [racks, warehouseStats]);

  // Format rack data items for top capacity charts
  const racksChartData: RackCapacityItem[] = useMemo(() => {
    return racks.map((r) => {
      const q = parseFloat(String(r.quantity)) || 0;
      const c = parseFloat(String(r.max_capacity)) || 100;
      const pct = c > 0 ? parseFloat(((q / c) * 100).toFixed(1)) : 0;
      return {
        rackCode: r.rack_code,
        materialName: r.material_name || 'Unassigned',
        occupied: q,
        capacity: c,
        occupancyPercentage: pct
      };
    });
  }, [racks]);

  // Filtered racks for grid view
  const filteredRacks = useMemo(() => {
    return racks.filter((r) => {
      const qty = parseFloat(String(r.quantity)) || 0;
      if (filterMode === 'empty' && qty !== 0) return false;
      if (filterMode === 'occupied' && qty === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = r.rack_code.toLowerCase().includes(q);
        const matchMat = (r.material_name || '').toLowerCase().includes(q);
        const matchBatch = (r.batch_number || '').toLowerCase().includes(q);
        return matchCode || matchMat || matchBatch;
      }
      return true;
    });
  }, [racks, filterMode, searchQuery]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layout className="text-cyan-500" />
            Warehouse Utilization Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time physical capacity monitoring, occupancy metrics, and rack drill-down inspection
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Last Synced: {lastUpdated}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={() => refreshData()}
            className="bg-white border border-slate-200 text-xs font-semibold"
          >
            <RefreshCw size={14} className="mr-2 text-cyan-500" />
            Live Sync
          </Button>
        </div>
      </div>

      {/* 6 Summary Metric Cards */}
      <UtilizationMetricCards metrics={metrics} loading={loading} />

      {/* Utilization Visual Charts */}
      <UtilizationChartsSection
        metrics={metrics}
        racksData={racksChartData}
        loading={loading}
      />

      {/* Interactive Rack Inspection Grid */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="text-cyan-400 h-5 w-5" />
              Physical Rack Occupancy Grid
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any rack card to launch the drill-down inspection modal
            </p>
          </div>

          {/* Controls: Search & Filter Tabs */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Find rack code or material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({racks.length})
              </button>
              <button
                onClick={() => setFilterMode('occupied')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  filterMode === 'occupied'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Occupied ({metrics.occupiedRackCount})
              </button>
              <button
                onClick={() => setFilterMode('empty')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  filterMode === 'empty'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Empty ({metrics.emptyRackCount})
              </button>
            </div>
          </div>
        </div>

        {/* Rack Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRacks.map((rack) => {
            const qty = parseFloat(String(rack.quantity)) || 0;
            const cap = parseFloat(String(rack.max_capacity)) || 100;
            const limit = parseFloat(String(rack.threshold_limit)) || 10;

            const isEmpty = qty === 0 || !rack.material_name;
            const isCritical = qty > 0 && qty <= limit;
            const pct = cap > 0 ? parseFloat(((qty / cap) * 100).toFixed(1)) : 0;

            return (
              <div
                key={rack.id}
                onClick={() =>
                  setSelectedRack({
                    id: rack.id,
                    rack_code: rack.rack_code,
                    material_name: rack.material_name,
                    batch_number: rack.batch_number,
                    quantity: qty,
                    max_capacity: cap,
                    threshold_limit: limit,
                    occupancy_percentage: pct,
                    status_color: rack.status_color
                  })
                }
                className={`group relative overflow-hidden rounded-2xl border p-4 backdrop-blur-md transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
                  isEmpty
                    ? 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                    : isCritical
                    ? 'border-rose-500/40 bg-rose-950/20 hover:border-rose-400 animate-pulse'
                    : 'border-slate-800 bg-slate-950/80 hover:border-cyan-500/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Rack {rack.rack_code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      isEmpty
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : isCritical
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {isEmpty ? 'Empty' : isCritical ? 'Critical' : 'Occupied'}
                  </span>
                </div>

                {/* Stored Material */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                    {rack.material_name || 'Empty Slot'}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    Batch: {rack.batch_number || 'N/A'}
                  </p>
                </div>

                {/* Occupancy Fill Bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{qty.toLocaleString()} Units</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct <= 40 ? 'bg-emerald-500' : pct <= 80 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drill-Down Inspection Modal */}
      <RackDrillDownModal
        rack={selectedRack}
        onClose={() => setSelectedRack(null)}
      />
    </div>
  );
};

export default WarehouseUtilizationDashboard;
