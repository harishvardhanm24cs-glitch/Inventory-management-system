import React, { useState, useEffect, useRef } from 'react';
import { Layers, Plus, Trash2, Edit, AlertTriangle, CheckCircle, Info, Database, Percent, ShieldCheck, ArrowDownRight, ArrowUpRight, Bell, Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';
import type { Rack } from '../context/InventoryContext';

export default function RackView() {
  const { racks, refreshData, loading, warehouseStats, lastUpdated } = useInventory();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'empty' | 'occupied'>('all');

  // Flash animation states
  const [flashingRacks, setFlashingRacks] = useState<Record<string, 'up' | 'down'>>({});
  const prevQuantitiesRef = useRef<Record<string, number>>({});

  // Form states
  const [rackCode, setRackCode] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [thresholdLimit, setThresholdLimit] = useState('10');

  // Flash animation trigger on racks update
  useEffect(() => {
    if (!racks || racks.length === 0) return;

    const flashes: Record<string, 'up' | 'down'> = {};
    let hasChanges = false;
    const isFirstLoad = Object.keys(prevQuantitiesRef.current).length === 0;

    racks.forEach(rack => {
      const currentQty = parseFloat(String(rack.quantity)) || 0;
      if (!isFirstLoad) {
        const prevQty = prevQuantitiesRef.current[rack.rack_code];
        if (prevQty !== undefined && prevQty !== currentQty) {
          flashes[rack.rack_code] = currentQty > prevQty ? 'up' : 'down';
          hasChanges = true;
        }
      }
      prevQuantitiesRef.current[rack.rack_code] = currentQty;
    });

    if (hasChanges) {
      setFlashingRacks(prev => ({ ...prev, ...flashes }));
      // Clear flashes after 1.5 seconds
      setTimeout(() => {
        setFlashingRacks(prev => {
          const updated = { ...prev };
          Object.keys(flashes).forEach(code => {
            delete updated[code];
          });
          return updated;
        });
      }, 1500);
    }
  }, [racks]);

  const handleOpenAddModal = () => {
    setRackCode('');
    setMaterialName('');
    setBatchNumber('');
    setQuantity('0');
    setMaxCapacity('100');
    setThresholdLimit('10');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (rack: Rack) => {
    setSelectedRack(rack);
    setRackCode(rack.rack_code);
    setMaterialName(rack.material_name || '');
    setBatchNumber(rack.batch_number || '');
    setQuantity(String(rack.quantity));
    setMaxCapacity(String(rack.max_capacity));
    setThresholdLimit(String(rack.threshold_limit));
    setIsEditModalOpen(true);
  };

  const handleAddRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackCode) {
      toast.error('Rack code is required');
      return;
    }

    try {
      const response = await api.addRack({
        rack_code: rackCode,
        material_name: materialName || null,
        batch_number: batchNumber || null,
        quantity: parseFloat(quantity) || 0,
        max_capacity: parseFloat(maxCapacity) || 100,
        threshold_limit: parseFloat(thresholdLimit) || 10,
      });

      if (response.status === 'success') {
        toast.success('Rack created successfully');
        setIsAddModalOpen(false);
        refreshData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create rack');
    }
  };

  const handleEditRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRack) return;

    try {
      const response = await api.updateRack(String(selectedRack.id), {
        rack_code: rackCode,
        material_name: materialName || null,
        batch_number: batchNumber || null,
        quantity: parseFloat(quantity) || 0,
        max_capacity: parseFloat(maxCapacity) || 100,
        threshold_limit: parseFloat(thresholdLimit) || 10,
      });

      if (response.status === 'success') {
        toast.success('Rack updated successfully');
        setIsEditModalOpen(false);
        refreshData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rack');
    }
  };

  const handleDeleteRack = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this storage rack?')) return;

    try {
      const response = await api.deleteRack(String(id));
      if (response.status === 'success') {
        toast.success('Rack deleted successfully');
        refreshData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rack');
    }
  };

  // Progress bar occupancy fill color mappings
  const getProgressBarFill = (pct: number) => {
    if (pct <= 40) return 'bg-emerald-500'; // 0-40% GREEN
    if (pct <= 80) return 'bg-amber-500';   // 41-80% YELLOW
    return 'bg-rose-600';                  // 81-100% RED
  };

  // Status color mappings based on occupancy rules (GREEN/YELLOW/RED)
  const getOccupancyColorStyles = (color: 'GREEN' | 'YELLOW' | 'RED') => {
    switch (color) {
      case 'GREEN':
        return {
          border: 'border-emerald-500 hover:border-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.04)]',
          badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          bullet: 'bg-emerald-500',
          bar: 'bg-emerald-500',
          pulse: ''
        };
      case 'YELLOW':
        return {
          border: 'border-amber-400 hover:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.04)]',
          badge: 'bg-amber-50 text-amber-600 border-amber-200',
          bullet: 'bg-amber-500',
          bar: 'bg-amber-500',
          pulse: ''
        };
      case 'RED':
      default:
        return {
          border: 'border-rose-500 hover:border-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.08)] ring-1 ring-rose-500/20',
          badge: 'bg-rose-50 text-rose-600 border-rose-200',
          bullet: 'bg-rose-500',
          bar: 'bg-rose-600',
          pulse: 'animate-pulse'
        };
    }
  };

  // Color mappings
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          bar: 'bg-emerald-500',
          glow: 'hover:shadow-emerald-500/10 hover:border-emerald-500/40',
          bullet: 'bg-emerald-500',
          cardBorder: 'border-slate-200',
          cardBg: 'bg-white',
          pulse: ''
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          bar: 'bg-amber-500',
          glow: 'hover:shadow-amber-500/10 hover:border-amber-500/40',
          bullet: 'bg-amber-500',
          cardBorder: 'border-slate-200',
          cardBg: 'bg-white',
          pulse: ''
        };
      case 'critical':
        return {
          bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
          bar: 'bg-rose-500',
          glow: 'hover:shadow-rose-500/20 hover:border-rose-400',
          bullet: 'bg-rose-500',
          cardBorder: 'border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.08)]',
          cardBg: 'bg-rose-50/10',
          pulse: 'animate-pulse'
        };
      case 'empty':
      default:
        return {
          bg: 'bg-slate-100 text-slate-500 border-slate-200',
          bar: 'bg-slate-200',
          glow: 'hover:shadow-slate-500/5 hover:border-slate-400',
          bullet: 'bg-slate-400',
          cardBorder: 'border-dashed border-slate-250',
          cardBg: 'bg-slate-50/40',
          pulse: ''
        };
    }
  };

  // Rack statistics computations
  const totalRacks = racks.length;
  const emptyRacks = racks.filter(r => {
    const q = parseFloat(String(r.quantity)) || 0;
    return q === 0;
  }).length;
  const occupiedRacks = totalRacks - emptyRacks;
  const criticalRacks = racks.filter(r => {
    const q = parseFloat(String(r.quantity)) || 0;
    const l = parseFloat(String(r.threshold_limit)) || 10;
    return q > 0 && q <= l;
  }).length;
  
  // Calculate average fill efficiency
  const totalQty = racks.reduce((sum, r) => sum + parseFloat(String(r.quantity)), 0);
  const totalCap = racks.reduce((sum, r) => sum + parseFloat(String(r.max_capacity)), 0);
  const fillEfficiency = totalCap > 0 ? parseFloat(((totalQty / totalCap) * 100).toFixed(1)) : 0.0;

  return (
    <div className="space-y-8 animate-fade-in text-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider border border-blue-100 w-fit mb-3">
            Industrial Visualization
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Rack Occupancy Monitor</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time physical capacity monitoring, occupancy metrics, and inventory alert consoles.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="px-6 rounded-xl text-sm font-bold shadow-lg shadow-primary/30"
        >
          <Plus size={18} className="mr-2" />
          Add Storage Rack
        </Button>
      </div>

      {/* Warehouse Statistics Engine */}
      {loading && !warehouseStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl h-24 flex items-center gap-4" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {/* Card 1: Total Racks */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
              <Database size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Racks</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{warehouseStats?.totalRacks ?? 0}</p>
            </div>
          </div>

          {/* Card 2: Occupied Racks */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Occupied Racks</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{warehouseStats?.occupiedRacks ?? 0}</p>
            </div>
          </div>

          {/* Card 3: Empty Racks */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
              <Inbox size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Empty Racks</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{warehouseStats?.emptyRacks ?? 0}</p>
            </div>
          </div>

          {/* Card 4: Warehouse Utilization % */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
              <Percent size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-450 uppercase tracking-wider">Warehouse Util %</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-slate-800 mt-1">{warehouseStats?.utilizationPercentage ?? 0}%</p>
              </div>
              <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    (warehouseStats?.utilizationPercentage ?? 0) <= 40 ? "bg-emerald-500" :
                    (warehouseStats?.utilizationPercentage ?? 0) <= 80 ? "bg-amber-500" : "bg-rose-500"
                  )} 
                  style={{ width: `${Math.min(warehouseStats?.utilizationPercentage ?? 0, 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Card 5: Critical Stock Count */}
          <div className={cn(
            "border p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all",
            (warehouseStats?.criticalCount ?? 0) > 0 ? "border-rose-200 bg-rose-50/10 shadow-[0_0_15px_rgba(244,63,94,0.02)]" : "bg-white border-slate-100"
          )}>
            <div className={cn(
              "p-3 rounded-xl",
              (warehouseStats?.criticalCount ?? 0) > 0 ? "bg-rose-50 text-rose-500 animate-pulse" : "bg-slate-50 text-slate-500"
            )}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className={cn(
                "text-xs font-black uppercase tracking-wider",
                (warehouseStats?.criticalCount ?? 0) > 0 ? "text-rose-500" : "text-slate-400"
              )}>Critical Stock Count</p>
              <p className={cn(
                "text-2xl font-black mt-1",
                (warehouseStats?.criticalCount ?? 0) > 0 ? "text-rose-600" : "text-slate-800"
              )}>{warehouseStats?.criticalCount ?? 0}</p>
            </div>
          </div>

          {/* Card 6: Low Stock Count */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
              <Bell size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-450 uppercase tracking-wider">Low Stock Count</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{warehouseStats?.lowStockCount ?? 0}</p>
            </div>
          </div>

          {/* Card 7: Today's Inward Transactions */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
              <ArrowDownRight size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-455 uppercase tracking-wider">Today's Inward</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{warehouseStats?.todayInward ?? 0} <span className="text-xs font-bold text-slate-400">Tx</span></p>
            </div>
          </div>

          {/* Card 8: Today's Outward Transactions */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
              <ArrowUpRight size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-455 uppercase tracking-wider">Today's Outward</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{warehouseStats?.todayOutward ?? 0} <span className="text-xs font-bold text-slate-400">Tx</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse occupancy grid layout */}
      {racks.length > 0 && (
        <div className="bg-white/80 border border-slate-150/40 rounded-3xl p-6 shadow-sm backdrop-blur-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-100 gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                Warehouse Grid Occupancy Display
              </h3>
              <p className="text-xs text-slate-450 mt-1 font-bold">{occupiedRacks} of {totalRacks} Slots Occupied ({fillEfficiency}% overall volume)</p>
            </div>
              <div className="flex flex-wrap gap-3 text-[9px] font-black uppercase tracking-wider">
               <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> 0-40% Occupancy</div>
               <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" /> 41-80% Occupancy</div>
               <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm animate-pulse" /> 81-100% Occupancy</div>
               <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm animate-pulse" /> Empty</div>
             </div>
           </div>
           <div className="flex flex-wrap gap-2.5 py-1">
             {racks.map(r => {
               const qty = parseFloat(String(r.quantity)) || 0;
               const limit = parseFloat(String(r.threshold_limit)) || 10;
               const isCrit = qty > 0 && qty <= limit;
               const statusColor = qty === 0 ? 'bg-blue-50/50 text-blue-600 border-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.1)] hover:bg-blue-500 hover:text-white font-bold' :
                                   isCrit ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse-red' :
                                   r.status_color === 'GREEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white' :
                                   r.status_color === 'YELLOW' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white' :
                                   'bg-rose-50 text-rose-600 border-rose-200 animate-pulse hover:bg-rose-500 hover:text-white';
              return (
                <div
                  key={r.id}
                  className={cn(
                    "px-3.5 py-2 border rounded-xl flex flex-col items-center justify-center font-mono text-[10px] font-black transition-all hover:scale-105 cursor-help",
                    statusColor
                  )}
                  title={`Rack ${r.rack_code}: ${r.material_name || 'Empty'} (${qty} KG)`}
                >
                  <span className="text-[7px] opacity-60 leading-none">RACK</span>
                  <span className="leading-none mt-0.5">{r.rack_code}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Racks Layout Grid */}
      <div className="bg-white/80 border border-slate-150/40 rounded-3xl p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              Physical Warehouse Layout
            </h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  filterMode === 'all' 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                All ({racks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('empty')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  filterMode === 'empty' 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                Show Empty Racks ({emptyRacks})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('occupied')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  filterMode === 'occupied' 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                Show Occupied Racks ({occupiedRacks})
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Last Updated: {lastUpdated}
              </span>
            )}
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              Auto-Sync Status Enabled
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-pulse">
            <LoadingSpinner />
            <p className="text-sm font-semibold text-slate-400">Syncing database maps...</p>
          </div>
        ) : racks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(filterMode === 'empty' 
              ? racks.filter(r => (parseFloat(String(r.quantity)) || 0) === 0) 
              : filterMode === 'occupied'
                ? racks.filter(r => (parseFloat(String(r.quantity)) || 0) > 0)
                : racks
            ).map(rack => {
              const qtyVal = parseFloat(String(rack.quantity)) || 0;
              const capVal = parseFloat(String(rack.max_capacity)) || 100;
              const limitVal = parseFloat(String(rack.threshold_limit)) || 10;

              // Frontend-driven status computation to enforce visual thresholds
              const calculatedStatus = qtyVal === 0 ? 'empty' :
                                       qtyVal < limitVal ? 'critical' :
                                       qtyVal <= limitVal * 1.2 ? 'warning' : 'healthy';

              const colors = getStatusColor(calculatedStatus);
              const occStyles = getOccupancyColorStyles(rack.status_color);
              const isEmpty = calculatedStatus === 'empty';
              const isCriticalStock = qtyVal > 0 && qtyVal <= limitVal;
              const flashDirection = flashingRacks[rack.rack_code];

              const cardBg = isEmpty ? "bg-slate-50/50" :
                             isCriticalStock ? "bg-rose-50/15" :
                             rack.status_color === 'RED' ? "bg-rose-50/10" :
                             rack.status_color === 'YELLOW' ? "bg-amber-50/5" : "bg-white";

              const cardGlow = isEmpty ? "hover:shadow-slate-500/10 hover:border-slate-400" :
                               isCriticalStock ? "hover:shadow-rose-500/30 hover:border-rose-500" :
                               rack.status_color === 'RED' ? "hover:shadow-rose-500/20 hover:border-rose-400" :
                               rack.status_color === 'YELLOW' ? "hover:shadow-amber-500/10 hover:border-amber-450" : "hover:shadow-emerald-500/10 hover:border-emerald-450";

              return (
                <div
                  key={rack.id}
                  className={cn(
                    "border p-5 rounded-2xl shadow-sm transition-all duration-500 hover:scale-[1.02] flex flex-col justify-between group relative overflow-hidden",
                    isEmpty ? "border-dashed border-slate-300 shadow-[0_0_15px_rgba(148,163,184,0.08)]" : 
                    isCriticalStock ? "animate-pulse-red border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] z-10" : 
                    occStyles.border,
                    cardBg,
                    cardGlow,
                    rack.status_color === 'RED' && "ring-2 ring-rose-500/20",
                    flashDirection === 'up' && "ring-4 ring-emerald-500/50 shadow-lg shadow-emerald-500/30 scale-[1.04] bg-emerald-50/10 border-emerald-400 z-10",
                    flashDirection === 'down' && "ring-4 ring-rose-500/50 shadow-lg shadow-rose-500/30 scale-[1.04] bg-rose-50/10 border-rose-400 z-10"
                  )}
                >
                  {/* Status Indicator Bar at top */}
                  <div className={cn("absolute top-0 left-0 right-0 h-1.5", isEmpty ? "bg-slate-300" : occStyles.bar)} />

                  {/* Flash Update indicator */}
                  {flashDirection && (
                    <div className={cn(
                      "absolute top-2 right-2 px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider animate-bounce z-20 shadow-sm border",
                      flashDirection === 'up' ? "bg-emerald-500 text-white border-emerald-600" : "bg-rose-500 text-white border-rose-600"
                    )}>
                      {flashDirection === 'up' ? "▲ inward sync" : "▼ outward sync"}
                    </div>
                  )}

                  <div>
                    {/* Header: Code & Status */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Rack Name</span>
                        <span className="text-xs font-black font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-150 uppercase tracking-wider w-fit">
                          {rack.rack_name || rack.rack_code}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {/* Flashing Alert Beacon for RED / CRITICAL STOCK status */}
                        {(rack.status_color === 'RED' || isCriticalStock) && !isEmpty && (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                          </span>
                        )}

                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.08em] border flex items-center gap-1.5",
                          isEmpty ? "bg-slate-100 text-slate-500 border-slate-200 font-bold" : 
                          isCriticalStock ? "bg-rose-100 text-rose-700 border-rose-300 font-extrabold animate-pulse" :
                          occStyles.badge
                        )}>
                          {isCriticalStock ? (
                            <AlertTriangle size={10} className="text-rose-700 animate-bounce" />
                          ) : (
                            <div className={cn("w-1.5 h-1.5 rounded-full", isEmpty ? "bg-slate-400" : occStyles.bullet, isEmpty ? "" : occStyles.pulse)} />
                          )}
                          {isEmpty ? "Empty Rack" : isCriticalStock ? "CRITICAL STOCK" : rack.status_color}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Stored Material</h4>
                        <p className={cn(
                          "font-bold text-sm mt-0.5 truncate",
                          isEmpty ? "text-slate-400 italic font-medium" : "text-slate-800"
                        )}>
                          {rack.material_name || "Available Space"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Batch Number</h4>
                          <p className={cn(
                            "font-bold text-xs mt-0.5 truncate",
                            isEmpty ? "text-slate-350 italic font-medium" : "text-slate-700"
                          )}>
                            {rack.batch_number || "N/A"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Safety Limit</h4>
                          <p className="font-bold text-slate-700 text-xs mt-0.5">
                            {limitVal} KG
                          </p>
                        </div>
                      </div>

                      {/* Critical Stock Alert Banner Message */}
                      {isCriticalStock && (
                        <div className="bg-rose-50 border border-rose-150 rounded-xl p-2.5 flex items-start gap-1.5 text-rose-700 text-[9px] font-bold leading-tight mt-1 animate-pulse">
                          <AlertTriangle size={12} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="uppercase tracking-wider">Critical Stock Alert</p>
                            <p className="text-rose-500 font-semibold mt-0.5">Current quantity ({qtyVal} KG) is below the safety threshold limit ({limitVal} KG).</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Occupancy and Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100/50 space-y-4">
                    {/* Progress Bar & Occupancy gauges */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Occupancy %</span>
                        <span className={cn(
                          "text-xs font-black",
                          isCriticalStock ? "text-rose-600" : "text-slate-805"
                        )}>
                          {rack.occupancy_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", getProgressBarFill(rack.occupancy_percentage))}
                          style={{ width: `${Math.min(rack.occupancy_percentage, 100)}%` }}
                        />
                      </div>
                      
                      {/* Capacity and Safety Limit Indicator Text */}
                      <div className="flex justify-between items-center mt-1.5">
                        <p className="text-[10px] text-slate-455 font-bold">
                          {isEmpty 
                            ? `Available Capacity: ${rack.capacity ?? capVal} KG` 
                            : `Current Stock: ${rack.current_stock ?? qtyVal} KG / Capacity: ${rack.capacity ?? capVal} KG`
                          }
                        </p>
                        {isCriticalStock && (
                          <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <AlertTriangle size={10} /> Below Limit
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metric HUD Grid */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-150/40">
                      <div className="text-center">
                        <p className="text-[7px] font-black text-slate-455 uppercase tracking-widest leading-none">
                          {isEmpty ? "Available Cap" : "Current Stock"}
                        </p>
                        <p className={cn(
                          "text-[10px] font-black mt-1 leading-none",
                          isEmpty ? "text-slate-500" : isCriticalStock ? "text-rose-600" : calculatedStatus === 'warning' ? "text-amber-600" : "text-slate-800"
                        )}>
                          {isEmpty ? `${rack.capacity ?? capVal} KG` : `${rack.current_stock ?? qtyVal} KG`}
                        </p>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <p className="text-[7px] font-black text-slate-455 uppercase tracking-widest leading-none">Capacity</p>
                        <p className="text-[10px] font-black text-slate-700 mt-1 leading-none">
                          {rack.capacity ?? capVal} KG
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[7px] font-black text-slate-455 uppercase tracking-widest leading-none">Occupancy %</p>
                        <p className={cn(
                          "text-[10px] font-black mt-1 leading-none",
                          isEmpty ? "text-slate-500 font-bold" : isCriticalStock ? "text-rose-600" : calculatedStatus === 'warning' ? "text-amber-600" : "text-slate-800"
                        )}>
                          {rack.occupancy_percentage}%
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-2">
                      {/* Ready status watermark for empty racks */}
                      {isEmpty ? (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50">
                          Empty Slot
                        </span>
                      ) : (
                        <div />
                      )}
                      
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(rack)}
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRack(rack.id)}
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Layers}
            title="No storage racks registered"
            description="Register physical warehouse racks to monitor real-time stocking capacity."
            action={{
              label: "Register Rack",
              onClick: handleOpenAddModal
            }}
          />
        )}
      </div>

      {/* Add Rack Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Register Storage Rack</h3>
            <p className="text-xs text-slate-500 mt-1">Configure physical rack storage constraints and materials.</p>
            
            <form onSubmit={handleAddRack} className="space-y-4 mt-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rack Code (Unique)</label>
                <input
                  type="text"
                  placeholder="e.g. A-RACK-01"
                  required
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                  value={rackCode}
                  onChange={e => setRackCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stored Material Name</label>
                <input
                  type="text"
                  placeholder="e.g. Blue Pigment (Leave blank if empty)"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                  value={materialName}
                  onChange={e => setMaterialName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g. B-012"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                  value={batchNumber}
                  onChange={e => setBatchNumber(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Max Cap (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                    value={maxCapacity}
                    onChange={e => setMaxCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Min Limit (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                    value={thresholdLimit}
                    onChange={e => setThresholdLimit(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold py-3 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl font-bold py-3 text-sm shadow-md"
                >
                  Register
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rack Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Edit Rack Configuration</h3>
            <p className="text-xs text-slate-500 mt-1">Modify physical capacities or material mapping for this slot.</p>
            
            <form onSubmit={handleEditRack} className="space-y-4 mt-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rack Code</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                  value={rackCode}
                  onChange={e => setRackCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stored Material Name</label>
                <input
                  type="text"
                  placeholder="e.g. Blue Pigment (Leave blank if empty)"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                  value={materialName}
                  onChange={e => setMaterialName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g. B-012"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                  value={batchNumber}
                  onChange={e => setBatchNumber(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Max Cap (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                    value={maxCapacity}
                    onChange={e => setMaxCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Min Limit (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-3 text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                    value={thresholdLimit}
                    onChange={e => setThresholdLimit(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold py-3 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl font-bold py-3 text-sm shadow-md"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline animations for dangerous stock alerts */}
      <style>{`
        @keyframes pulseRed {
          0%, 100% {
            border-color: rgba(244, 63, 94, 0.4);
            box-shadow: 0 0 10px rgba(244, 63, 94, 0.1);
          }
          50% {
            border-color: rgba(244, 63, 94, 1);
            box-shadow: 0 0 15px rgba(244, 63, 94, 0.35);
          }
        }
        .animate-pulse-red {
          animation: pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
