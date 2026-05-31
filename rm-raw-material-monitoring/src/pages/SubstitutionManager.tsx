import React, { useState } from 'react';
import { 
    Replace, 
    ArrowRightLeft, 
    Link, 
    Unlink, 
    Search,
    AlertCircle,
    CheckCircle2,
    Database
} from 'lucide-react';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { toast } from 'react-hot-toast';

const SubstitutionManager: React.FC = () => {
    const { materials, refreshData } = useInventory();
    const [selectedId, setSelectedId] = useState('');
    const [substituteId, setSubstituteId] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const currentMaterial = materials.find(m => m.id === selectedId);
    
    const filteredMaterials = materials.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(m => m.id !== selectedId);

    const handleSave = async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
            await api.updateSubstitute(selectedId, substituteId || null);
            toast.success('Substitution mapping updated');
            toast.success('Substitution mapping updated');
            refreshData();
        } catch (error) {
            toast.error('Failed to update mapping');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Replace size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Material Substitution Linker</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Phase 8: Intelligent Material Optimization</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selection Section */}
                <Card className="border-none shadow-xl shadow-slate-100 bg-white/80 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Search size={14} />
                            Select Target Material
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search RM Name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300"
                            />
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {materials.filter(m => 
                                m.name.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedId(m.id)}
                                    className={cn(
                                        "w-full p-3 rounded-xl border-2 text-left transition-all group relative overflow-hidden",
                                        selectedId === m.id 
                                            ? "border-indigo-600 bg-indigo-50" 
                                            : "border-transparent bg-slate-50 hover:bg-white hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-black text-slate-900 leading-tight">{m.name}</p>
                                            <p className="text-[10px] font-mono text-slate-400 mt-1">{m.id.substring(0, 12)}...</p>
                                        </div>
                                        {m.substituteId && (
                                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Link size={8} /> LINKED
                                            </span>
                                        )}
                                    </div>
                                    {selectedId === m.id && (
                                        <div className="absolute right-0 bottom-0 p-1 opacity-20">
                                            <CheckCircle2 size={32} className="text-indigo-600" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Mapping Section */}
                <Card className="border-none shadow-xl shadow-slate-100 bg-white/80 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <ArrowRightLeft size={14} />
                            Configure Substitute
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!selectedId ? (
                            <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 gap-4">
                                <AlertCircle size={48} className="opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-tighter italic">Select a material to begin mapping</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="p-4 bg-slate-900 rounded-2xl text-white">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Primary Material</p>
                                    <p className="text-sm font-bold">{currentMaterial?.name}</p>
                                    <div className="mt-3 flex items-center gap-4 text-[10px] font-mono opacity-60">
                                        <span>STOCK: {currentMaterial?.stock}{currentMaterial?.unit}</span>
                                        <span>•</span>
                                        <span>LIMIT: {currentMaterial?.minLimit}{currentMaterial?.unit}</span>
                                    </div>
                                </div>

                                <div className="flex justify-center py-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 relative">
                                        <ArrowRightLeft size={18} />
                                        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-slate-100 -z-10 -translate-y-[40px] translate-x-[-1px] h-[40px]" />
                                        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-slate-100 -z-10 translate-y-[10px] translate-x-[-1px] h-[40px]" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Assign Substitute</label>
                                    <select 
                                        value={substituteId}
                                        onChange={(e) => setSubstituteId(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="">-- No Substitute --</option>
                                        {filteredMaterials.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit} avail)</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 italic mt-2 mt-2 leading-relaxed">
                                        When {currentMaterial?.name} hits critical levels, the system will prioritize usage of the selected substitute to prevent production shutdown.
                                    </p>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className={cn(
                                        "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg",
                                        loading 
                                            ? "bg-slate-100 text-slate-400" 
                                            : "bg-indigo-600 text-white shadow-indigo-200 hover:scale-[1.02] active:scale-95"
                                    )}
                                >
                                    {loading ? <Database className="animate-spin" size={16} /> : <Link size={16} />}
                                    Save Mapping
                                </button>

                                {currentMaterial?.substituteId && (
                                    <button 
                                        onClick={() => { setSubstituteId(''); handleSave(); }}
                                        className="w-full text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Unlink size={12} /> Break Link
                                    </button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SubstitutionManager;
