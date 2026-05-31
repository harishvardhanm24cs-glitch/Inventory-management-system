import React, { useState, useEffect } from 'react';
import { Layout, Box, Info, AlertTriangle, Search, Home } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';
import { useInventory } from '../context/InventoryContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
interface Material {
    id: string;
    name: string;
    stock: number;
    minLimit: number;
    criticalLimit: number;
    status?: string;
    rack?: string | null;
    level?: string | null;
    bin?: string | null;
    location?: string;
    weight?: number;
    imageUrl?: string;
}

const WarehouseTwin = () => {
    const { materials, loading } = useInventory();
    const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const rows = ['A', 'B', 'C', 'D', 'E'];
    const cols = Array.from({ length: 10 }, (_, i) => i + 1);

    const getMaterialAt = (r: string, c: string) => {
        return (materials as any[]).find((m: any) => {
            const loc = m.location?.toUpperCase() || m.warehouseLocation?.toUpperCase() || '';
            const shelfStr = `${r}${c}`.toUpperCase();
            if (loc === shelfStr || loc === `${r}-${c}`) return true;
            if (m.rack === r && m.bin === c) return true;
            return false;
        });
    };

    const getStatusColor = (material?: Material) => {
        if (!material) return 'bg-rose-50 border-rose-200 text-rose-400 opacity-60';
        return 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm';
    };
    const selectedMaterial = selectedShelf ? getMaterialAt(selectedShelf.charAt(0), selectedShelf.substring(1)) : null;

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50/50">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20">
                            Digital Twin v1.0
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Warehouse Visualization</h1>
                        <p className="text-slate-500 text-sm font-medium">Live interactive map of material stock across all storage zones.</p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search material..."
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all w-64 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-6 px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Occupied</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Empty</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Layout Grid */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative glass-panel rounded-3xl p-6 border border-white/40 shadow-xl overflow-x-auto min-h-[500px]">
                                <div className="grid grid-cols-11 gap-3 h-full min-w-[800px]">
                                    {/* Empty Corner */}
                                    <div className="h-8"></div>
                                    {/* Column Labels */}
                                    {cols.map(c => (
                                        <div key={c} className="h-8 flex items-center justify-center text-xs font-black text-slate-400">
                                            {c}
                                        </div>
                                    ))}

                                    {rows.map(r => (
                                        <React.Fragment key={r}>
                                            {/* Row Label */}
                                            <div className="w-8 h-12 flex items-center justify-center text-xs font-black text-slate-400">
                                                {r}
                                            </div>
                                            {/* Shelves */}
                                            {cols.map(c => {
                                                const binStr = c.toString();
                                                const material = getMaterialAt(r, binStr);
                                                const isSelected = selectedShelf === `${r}${binStr}`;
                                                
                                                // Highlight if matches search
                                                const matchesSearch = searchTerm && material?.name.toLowerCase().includes(searchTerm.toLowerCase());
                                                
                                                return (
                                                    <button
                                                        key={`${r}${c}`}
                                                        onClick={() => setSelectedShelf(`${r}${binStr}`)}
                                                        className={cn(
                                                            "h-14 rounded-xl border-2 transition-all duration-300 relative group/shelf flex items-center justify-center overflow-hidden active:scale-95",
                                                            getStatusColor(material),
                                                            isSelected ? "scale-105 border-primary ring-4 ring-primary/10 z-10" : "hover:scale-[1.02]",
                                                            matchesSearch ? "ring-2 ring-amber-400 border-amber-400 animate-pulse" : ""
                                                        )}
                                                    >
                                                        {material ? (
                                                            <div className="flex flex-col items-center w-full h-full justify-center relative p-1">
                                                                {material.imageUrl ? (
                                                                    <img src={material.imageUrl} alt={material.name} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover/shelf:opacity-40 transition-opacity" />
                                                                ) : (
                                                                    <div className="absolute inset-0 bg-emerald-500/[0.03]" />
                                                                )}
                                                                <span className="text-[7px] font-black uppercase text-center leading-tight z-10 text-emerald-700/80 group-hover/shelf:text-emerald-900 transition-colors truncate w-full px-1">
                                                                    {material.name}
                                                                </span>
                                                                <span className="text-[9px] font-black text-emerald-600 mt-0.5 z-10 bg-white/50 px-1 rounded shadow-sm border border-emerald-100">
                                                                    {material.stock !== undefined ? material.stock : material.weight}kg
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center transition-opacity relative z-10 group-hover/shelf:scale-110 duration-200">
                                                                <span className="text-[8px] font-black text-rose-300 uppercase tracking-[0.1em] group-hover/shelf:text-rose-400">
                                                                    EMPTY
                                                                </span>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="absolute inset-0 bg-white/0 group-hover/shelf:bg-white/10 transition-colors"></div>
                                                    </button>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Legend/Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                            <div className="p-5 bg-white rounded-2xl border border-slate-200/60 flex items-start gap-4 shadow-sm">
                                <div className="p-3 bg-indigo-50 rounded-xl">
                                    <Box className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Visual Auditing</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">Click any shelf to view detailed batch info, recent movements, and safety thresholds.</p>
                                </div>
                            </div>
                            <div className="p-5 bg-white rounded-2xl border border-slate-200/60 flex items-start gap-4 shadow-sm">
                                <div className="p-3 bg-rose-50 rounded-xl">
                                    <AlertTriangle className="w-6 h-6 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Critical Locations</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">Red highlighted areas indicate immediate production risk due to stock depletion.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shelf Detail Panel */}
                    <div className="lg:col-span-4 self-start animate-in fade-in slide-in-from-right-8 duration-1000 delay-150">
                        {selectedShelf ? (
                            <div className="glass-panel overflow-hidden border border-white/60 rounded-3xl shadow-2xl sticky top-8 transition-all duration-500">
                                <div className="aspect-video bg-slate-900 flex items-center justify-center relative group">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
                                    {selectedMaterial?.imageUrl ? (
                                        <img src={selectedMaterial.imageUrl} alt={selectedMaterial.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                                    ) : (
                                        <Box className="w-16 h-16 text-indigo-400 opacity-20 group-hover:scale-110 transition-transform duration-700 z-0 relative" />
                                    )}
                                    <div className="absolute bottom-6 left-6 right-6 z-20">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest mb-2">
                                            {selectedMaterial ? (
                                                <>Rack {selectedMaterial.rack} • Level {selectedMaterial.level || '1'} • Bin {selectedMaterial.bin}</>
                                            ) : (
                                                <>Zone {selectedShelf.charAt(0)} • Shelf {selectedShelf.substring(1)}</>
                                            )}
                                        </div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
                                            {selectedMaterial ? selectedMaterial.name : 'Empty Storage Unit'}
                                        </h2>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6 bg-white">
                                    {selectedMaterial ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Current Stock</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-black text-slate-900">{selectedMaterial.stock !== undefined ? selectedMaterial.stock : selectedMaterial.weight}</span>
                                                        <span className="text-xs font-bold text-slate-500 tracking-wider">KG</span>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Safety Level</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-xl font-bold text-indigo-600">{selectedMaterial.minLimit || 50}</span>
                                                        <span className="text-[10px] font-bold text-slate-500">MIN</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn(
                                                            "absolute h-full transition-all duration-1000",
                                                            (selectedMaterial.stock !== undefined ? selectedMaterial.stock : (selectedMaterial.weight || 0)) <= (selectedMaterial.criticalLimit || 10) ? 'bg-rose-500' : 
                                                            (selectedMaterial.stock !== undefined ? selectedMaterial.stock : (selectedMaterial.weight || 0)) <= (selectedMaterial.minLimit || 50) ? 'bg-amber-500' : 'bg-emerald-500'
                                                        )}
                                                        style={{ width: `${Math.min(( (selectedMaterial.stock !== undefined ? selectedMaterial.stock : (selectedMaterial.weight || 0)) / ((selectedMaterial.minLimit || 50) * 2)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <span>Empty</span>
                                                    <span>Target: {(selectedMaterial.minLimit || 50) * 2}</span>
                                                </div>
                                            </div>

                                            <Button 
                                                className="w-full h-14 rounded-2xl font-bold shadow-xl shadow-primary/10 transition-all gap-2"
                                            >
                                                <Info className="w-4 h-4" />
                                                View Production Impact
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="py-12 flex flex-col items-center gap-4 text-center">
                                            <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
                                                <Layout className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">Shelf Available</h3>
                                                <p className="text-xs text-slate-500 max-w-[200px] mt-1 italic">This location has no assigned material. Scan a pallet to assign here.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center opacity-50 group">
                                <div className="p-6 bg-slate-50 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Layout className="w-16 h-16 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-400">Interactive Control</h3>
                                <p className="text-sm text-slate-400 mt-2 max-w-[240px]">Select a shelf position from the warehouse grid to inspect inventory metrics.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarehouseTwin;
