import React, { useState, useEffect, useRef } from 'react';
import { Layers, Plus, Trash2, Edit, AlertTriangle, CheckCircle, Info, Database, Percent, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

interface Rack {
  id: number;
  rack_code: string;
  material_name: string | null;
  batch_number: string | null;
  quantity: string | number;
  max_capacity: string | number;
  threshold_limit: string | number;
  status: 'healthy' | 'warning' | 'critical' | 'empty';
  occupancy_percentage: number;
}

export default function RackView() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);

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

  const fetchRacks = async () => {
    try {
      const response = await api.getRacks();
      let newRacks: Rack[] = [];
      if (response && response.racks) {
        newRacks = response.racks;
      } else if (Array.isArray(response)) {
        newRacks = response;
      }

      // Check for quantity changes
      const flashes: Record<string, 'up' | 'down'> = {};
      let hasChanges = false;
      const isFirstLoad = Object.keys(prevQuantitiesRef.current).length === 0;

      newRacks.forEach(rack => {
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

      setRacks(newRacks);
    } catch (err: any) {
      console.error('Failed to load racks:', err.message);
      toast.error('Failed to load rack visualization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRacks();
    const interval = setInterval(() => {
      fetchRacks();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, []);

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
        fetchRacks();
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
        fetchRacks();
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
        setRacks(prev => prev.filter(r => r.id !== id));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rack');
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
    return q > 0 && q < l;
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

      {/* Rack Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
            <Database size={22} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Racks</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalRacks}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Occupied</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{occupiedRacks}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Empty Racks</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{emptyRacks}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Critical Stock</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{criticalRacks}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
            <Percent size={22} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider font-semibold">Fill Efficiency</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{fillEfficiency}%</p>
          </div>
        </div>
      </div>

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
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Healthy (&gt;120%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" /> Warning (100%-120%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm animate-pulse" /> Critical (&lt;100%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-200 rounded-sm" /> Empty</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 py-1">
            {racks.map(r => {
              const qty = parseFloat(String(r.quantity)) || 0;
              const lim = parseFloat(String(r.threshold_limit)) || 10;
              const status = qty === 0 ? 'empty' :
                             qty < lim ? 'critical' :
                             qty <= lim * 1.2 ? 'warning' : 'healthy';

              const statusColor = status === 'healthy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white' :
                                  status === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white' :
                                  status === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse hover:bg-rose-500 hover:text-white' :
                                  'bg-slate-50 text-slate-400 border-slate-200';
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            Physical Warehouse Layout
          </h2>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            Auto-Sync Status Enabled
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-pulse">
            <LoadingSpinner />
            <p className="text-sm font-semibold text-slate-400">Syncing database maps...</p>
          </div>
        ) : racks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {racks.map(rack => {
              const qtyVal = parseFloat(String(rack.quantity)) || 0;
              const capVal = parseFloat(String(rack.max_capacity)) || 100;
              const limitVal = parseFloat(String(rack.threshold_limit)) || 10;

              // Frontend-driven status computation to enforce visual thresholds
              const calculatedStatus = qtyVal === 0 ? 'empty' :
                                       qtyVal < limitVal ? 'critical' :
                                       qtyVal <= limitVal * 1.2 ? 'warning' : 'healthy';

              const colors = getStatusColor(calculatedStatus);
              const isEmpty = calculatedStatus === 'empty';
              const isCritical = calculatedStatus === 'critical';
              const flashDirection = flashingRacks[rack.rack_code];
              
              return (
                <div
                  key={rack.id}
                  className={cn(
                    "border p-5 rounded-2xl shadow-sm transition-all duration-500 hover:scale-[1.02] flex flex-col justify-between group relative overflow-hidden",
                    colors.cardBorder,
                    colors.cardBg,
                    colors.glow,
                    isCritical && "ring-2 ring-rose-500/20",
                    flashDirection === 'up' && "ring-4 ring-emerald-500/50 shadow-lg shadow-emerald-500/30 scale-[1.04] bg-emerald-50/10 border-emerald-400 z-10",
                    flashDirection === 'down' && "ring-4 ring-rose-500/50 shadow-lg shadow-rose-500/30 scale-[1.04] bg-rose-50/10 border-rose-400 z-10"
                  )}
                >
                  {/* Status Indicator Bar at top */}
                  <div className={cn("absolute top-0 left-0 right-0 h-1.5", colors.bar)} />

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
                      <span className="text-xs font-black font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-150 uppercase tracking-wider">
                        {rack.rack_code}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        {/* Flashing Alert Beacon for Critical */}
                        {isCritical && (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                          </span>
                        )}

                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.08em] border flex items-center gap-1.5",
                          colors.bg,
                          isCritical ? "text-rose-600 bg-rose-50 border-rose-200" : ""
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", colors.bullet, isCritical && colors.pulse)} />
                          {calculatedStatus}
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
                          {rack.material_name || "Available for Storage"}
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
                    </div>
                  </div>

                  {/* Occupancy and Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100/50 space-y-4">
                    {/* Progress Bar & Occupancy gauges */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Occupancy</span>
                        <span className={cn(
                          "text-xs font-black",
                          isCritical ? "text-rose-600" : "text-slate-805"
                        )}>
                          {rack.occupancy_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                          style={{ width: `${Math.min(rack.occupancy_percentage, 100)}%` }}
                        />
                      </div>
                      
                      {/* Capacity and Safety Limit Indicator Text */}
                      <div className="flex justify-between items-center mt-1.5">
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {qtyVal} / {capVal} KG Stored
                        </p>
                        {isCritical && (
                          <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <AlertTriangle size={10} /> Below Limit
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metric HUD Grid */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-150/40">
                      <div className="text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Stock</p>
                        <p className={cn(
                          "text-[10px] font-black mt-1 leading-none",
                          isCritical ? "text-rose-600" : calculatedStatus === 'warning' ? "text-amber-600" : "text-slate-800"
                        )}>
                          {qtyVal} KG
                        </p>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Max Cap</p>
                        <p className="text-[10px] font-black text-slate-700 mt-1 leading-none">
                          {capVal} KG
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Util %</p>
                        <p className={cn(
                          "text-[10px] font-black mt-1 leading-none",
                          isCritical ? "text-rose-600" : calculatedStatus === 'warning' ? "text-amber-600" : "text-slate-800"
                        )}>
                          {Math.round((qtyVal / capVal) * 100)}%
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
    </div>
  );
}
