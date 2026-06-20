import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, 
    ShieldAlert, 
    Play, 
    ChevronRight, 
    Box, 
    Database, 
    ArrowRightLeft,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import { Card, CardContent } from '../components/ui/Card';

interface MaterialRequirement {
    materialId: string;
    quantityNeeded: number;
    material: {
        id: string;
        name: string;
        stock: number;
        unit: string;
        substituteId?: string | null;
        substitute?: {
            id: string;
            name: string;
            stock: number;
            unit: string;
        } | null;
    }
}

interface MaterialCheck {
    materialCheckId: string;
    name: string;
    requirements: MaterialRequirement[];
}

const ProductionCheck: React.FC = () => {
    const [materialsCheckList, setMaterialsCheckList] = useState<MaterialCheck[]>([]);
    const [selectedMaterialCheckId, setSelectedMaterialCheckId] = useState<string>('');
    const [plannedQty, setPlannedQty] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const { materials: contextMaterials } = useInventory();

    useEffect(() => {
        const fetchMaterialsCheck = async () => {
            try {
                const data = await api.getMaterials();
                if (Array.isArray(data)) {
                    const generatedCheckList: MaterialCheck[] = [];
                    
                    if (data.length > 0) {
                        const m1 = data[0];
                        generatedCheckList.push({
                            materialCheckId: 'MAT-CHECK-01',
                            name: `Gloss Finish (${m1.name || m1.material_name || 'Material 1'})`,
                            requirements: [
                                {
                                    materialId: String(m1.id),
                                    quantityNeeded: 100,
                                    material: {
                                        id: String(m1.id),
                                        name: m1.name || m1.material_name || 'Material 1',
                                        stock: Number(m1.stock || m1.quantity || 0),
                                        unit: m1.unit || 'KG',
                                        substituteId: null,
                                        substitute: null
                                    }
                                }
                            ]
                        });
                    }
                    
                    if (data.length > 1) {
                        const m2 = data[1];
                        generatedCheckList.push({
                            materialCheckId: 'MAT-CHECK-02',
                            name: `Matte Finish (${m2.name || m2.material_name || 'Material 2'})`,
                            requirements: [
                                {
                                    materialId: String(m2.id),
                                    quantityNeeded: 120,
                                    material: {
                                        id: String(m2.id),
                                        name: m2.name || m2.material_name || 'Material 2',
                                        stock: Number(m2.stock || m2.quantity || 0),
                                        unit: m2.unit || 'KG',
                                        substituteId: null,
                                        substitute: null
                                    }
                                }
                            ]
                        });
                    }

                    if (data.length > 1) {
                        const m1 = data[0];
                        const m2 = data[1];
                        generatedCheckList.push({
                            materialCheckId: 'MAT-CHECK-03',
                            name: 'Dual Blend Coating',
                            requirements: [
                                {
                                    materialId: String(m1.id),
                                    quantityNeeded: 60,
                                    material: {
                                        id: String(m1.id),
                                        name: m1.name || m1.material_name || 'Material 1',
                                        stock: Number(m1.stock || m1.quantity || 0),
                                        unit: m1.unit || 'KG',
                                        substituteId: null,
                                        substitute: null
                                    }
                                },
                                {
                                    materialId: String(m2.id),
                                    quantityNeeded: 50,
                                    material: {
                                        id: String(m2.id),
                                        name: m2.name || m2.material_name || 'Material 2',
                                        stock: Number(m2.stock || m2.quantity || 0),
                                        unit: m2.unit || 'KG',
                                        substituteId: null,
                                        substitute: null
                                    }
                                }
                            ]
                        });
                    }

                    // Fallback check if no materials exist in DB
                    if (generatedCheckList.length === 0) {
                        generatedCheckList.push({
                            materialCheckId: 'MAT-CHECK-FALLBACK',
                            name: 'Default Paint Mix',
                            requirements: []
                        });
                    }

                    setMaterialsCheckList(generatedCheckList);
                    if (generatedCheckList.length > 0) {
                        setSelectedMaterialCheckId(generatedCheckList[0].materialCheckId);
                    }
                } else {
                    console.error("Materials API returned non-array data:", data);
                    setMaterialsCheckList([]);
                }
            } catch (error) {
                console.error('Failed to generate materials check list:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMaterialsCheck();
    }, []);

    const selectedMaterialCheck = materialsCheckList.find(p => p.materialCheckId === selectedMaterialCheckId);

    const checkReady = () => {
        if (!selectedMaterialCheck) return { isReady: false, shortages: [] };
        
        const shortages = selectedMaterialCheck.requirements.map(reqItem => {
            const totalNeeded = reqItem.quantityNeeded * plannedQty;
            const currentStock = reqItem.material.stock;
            const isMissing = currentStock < totalNeeded;
            
            // Look for substitute if missing
            let substituteAvailable = false;
            let subName = '';
            let subStock = 0;

            if (isMissing && reqItem.material.substituteId) {
                // Check if substitute has enough stock
                const sub = reqItem.material.substitute;
                if (sub && sub.stock >= (totalNeeded - currentStock)) {
                    substituteAvailable = true;
                    subName = sub.name;
                    subStock = sub.stock;
                }
            }

            return {
                name: reqItem.material.name,
                needed: totalNeeded,
                available: currentStock,
                unit: reqItem.material.unit,
                isMissing,
                substituteAvailable,
                subName,
                subStock
            };
        });

        const isReady = !shortages.some(s => s.isMissing && !s.substituteAvailable);
        return { isReady, shortages };
    };

    const { isReady, shortages } = checkReady();

    if (loading) return <div className="p-8 text-center text-slate-500">Loading production data...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-primary" size={32} />
                    Production Feasibility Check
                </h1>
                <p className="text-slate-500 font-medium italic">Validate raw material readiness before initiating production cycles.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <Card className="md:col-span-1 border-none shadow-xl shadow-slate-100 bg-white/50 backdrop-blur-md">
                    <CardContent className="p-6 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Formulation</label>
                            <select 
                                value={selectedMaterialCheckId}
                                onChange={(e) => setSelectedMaterialCheckId(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                {materialsCheckList.map(p => (
                                    <option key={p.materialCheckId} value={p.materialCheckId}>{p.name}</option>
                                ))}
                                {materialsCheckList.length === 0 && <option disabled>No formulations found</option>}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Planned Qty (Units)</label>
                            <input 
                                type="number" 
                                min="1"
                                value={plannedQty}
                                onChange={(e) => setPlannedQty(parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
                                Result
                            </div>
                            
                            {isReady ? (
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center gap-2 text-center">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                        <Play size={24} fill="currentColor" />
                                    </div>
                                    <h3 className="text-emerald-700 font-black text-sm uppercase">Safe to Proceed</h3>
                                    <p className="text-[10px] text-emerald-600 font-medium">All materials available in stock.</p>
                                </div>
                            ) : (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex flex-col items-center gap-2 text-center">
                                    <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-200">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <h3 className="text-rose-700 font-black text-sm uppercase">Shutdown Risk</h3>
                                    <p className="text-[10px] text-rose-600 font-medium">Material shortage detected.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Requirements Panel */}
                <Card className="md:col-span-2 border-none shadow-2xl shadow-slate-200 bg-slate-900 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                <Database size={14} className="text-primary" />
                                Recipe Breakdown
                            </h3>
                            <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white uppercase italic">
                                {selectedMaterialCheck?.name}
                            </span>
                        </div>
                        
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                            {shortages.map((item, idx) => (
                                <div key={idx} className="p-5 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            item.isMissing ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                                        )}>
                                            {item.isMissing ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">{item.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Required: {item.needed} {item.unit}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Available</span>
                                            <span className={cn(
                                                "text-xs font-mono font-black",
                                                item.isMissing ? "text-rose-400" : "text-emerald-400"
                                            )}>{item.available}</span>
                                        </div>
                                        {item.isMissing && (
                                            <div className="text-right">
                                                <span className="text-[9px] font-black text-rose-500 uppercase animate-pulse block">Missing: {item.needed - item.available}</span>
                                                {item.substituteAvailable && (
                                                    <div className="mt-1 flex items-center justify-end gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                                        <ArrowRightLeft size={10} className="text-indigo-400" />
                                                        <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-tighter">Use {item.subName} ({item.subStock} avail)</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {shortages.length === 0 && (
                                <div className="p-12 text-center space-y-3">
                                    <ArrowRightLeft className="mx-auto text-slate-700" size={40} />
                                    <p className="text-slate-500 font-bold text-sm italic">No recipe found for this formulation.</p>
                                </div>
                            )}
                        </div>

                        {/* Summary Action */}
                        <div className="p-6 bg-white/[0.03] border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Box className="w-8 h-8 text-primary/40" />
                                <span className="text-slate-400 text-[10px] font-bold uppercase italic">Status: {isReady ? 'Clear for Production' : 'Production Blocked'}</span>
                            </div>
                            <button 
                                disabled={!isReady}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    isReady 
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105" 
                                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                                )}
                            >
                                Send Start Signal
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProductionCheck;
