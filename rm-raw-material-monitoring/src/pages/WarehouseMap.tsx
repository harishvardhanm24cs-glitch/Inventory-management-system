import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Box, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Material {
    _id?: string;
    id?: string;
    name: string;
    stock?: number;
    weight?: number;
    location?: string;
}

const ZONES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'UNASSIGNED'];

export default function WarehouseMap() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const fetchMaterials = async () => {
        try {
            const data = await api.getMaterials();
            setMaterials(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load map data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, []);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('materialId', id);
        setDraggingId(id);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetZone: string) => {
        e.preventDefault();
        const materialId = e.dataTransfer.getData('materialId');
        if (!materialId) return;

        // Optimistically update UI
        setMaterials(prev => prev.map(m => {
            const mId = m._id || m.id;
            if (mId === materialId) {
                return { ...m, location: targetZone };
            }
            return m;
        }));

        try {
            await api.updateLocation(materialId, { location: targetZone });
            toast.success(`Moved to ${targetZone}`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to move material");
            fetchMaterials(); // Revert to source of truth
        }
    };

    if (loading) return <div className="p-8">Loading Warehouse Map...</div>;

    const materialsByZone = ZONES.reduce((acc, zone) => {
        if (zone === 'UNASSIGNED') {
            acc[zone] = materials.filter(m => {
                const loc = m.location?.toUpperCase();
                return !loc || !ZONES.includes(loc);
            });
        } else {
            acc[zone] = materials.filter(m => m.location?.toUpperCase() === zone);
        }
        return acc;
    }, {} as Record<string, Material[]>);

    return (
        <div className="p-4 md:p-8 min-h-screen bg-slate-50/50">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col mb-8 animate-in fade-in slide-in-from-top-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider border border-indigo-100 w-fit mb-3">
                        Phase 8 Update
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Interactive Map</h1>
                    <p className="text-slate-500 max-w-lg mt-2">Drag and Drop material pallets between physical storage zones to instantly synchronize the production inventory.</p>
                </div>

                <div className="flex overflow-x-auto gap-6 pb-8 snap-x">
                    {ZONES.map(zone => (
                        <div 
                            key={zone}
                            className="min-w-[300px] flex flex-col bg-slate-200/50 rounded-3xl p-4 transition-all snap-start shadow-sm border border-slate-200"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, zone)}
                        >
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="text-lg font-black text-slate-700 tracking-tight">
                                    {zone === 'UNASSIGNED' ? 'Receiving / Unassigned' : `Shelf Zone ${zone}`}
                                </h3>
                                <span className="bg-white text-slate-500 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                    {materialsByZone[zone].length} item(s)
                                </span>
                            </div>

                            <div className={`flex-1 flex flex-col gap-3 min-h-[300px] rounded-2xl transition-colors p-2 ${draggingId ? 'bg-indigo-50/50 border border-dashed border-indigo-200' : ''}`}>
                                {materialsByZone[zone].length === 0 && !draggingId && (
                                    <div className="m-auto flex flex-col items-center opacity-30">
                                        <HelpCircle className="w-10 h-10 mb-2" />
                                        <p className="text-sm font-bold uppercase tracking-widest">Empty</p>
                                    </div>
                                )}
                                
                                {materialsByZone[zone].map(m => {
                                    const mId = m._id || m.id || Math.random().toString();
                                    return (
                                        <div 
                                            key={mId}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, mId)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:scale-[1.02] flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                    <Box size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 leading-tight">{m.name}</p>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">
                                                        ID: {m.id || m._id?.slice(-6).toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-slate-900 leading-none">
                                                    {m.stock !== undefined ? m.stock : m.weight}
                                                </p>
                                                <span className="text-[10px] font-black text-slate-400 tracking-wider">KG</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
