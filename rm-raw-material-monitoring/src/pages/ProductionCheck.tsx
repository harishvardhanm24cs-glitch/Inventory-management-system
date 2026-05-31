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

interface RecipeItem {
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

interface Product {
    productId: string;
    name: string;
    recipes: RecipeItem[];
}

const ProductionCheck: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [plannedQty, setPlannedQty] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const { materials } = useInventory();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await api.getProducts();
                if (Array.isArray(data)) {
                    setProducts(data);
                    if (data.length > 0) setSelectedProductId(data[0].productId);
                } else {
                    console.error("Products API returned non-array data:", data);
                    setProducts([]);
                }
            } catch (error) {
                console.error('Failed to fetch products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const selectedProduct = products.find(p => p.productId === selectedProductId);

    const checkReady = () => {
        if (!selectedProduct) return { isReady: false, shortages: [] };
        
        const shortages = selectedProduct.recipes.map(recipe => {
            const totalNeeded = recipe.quantityNeeded * plannedQty;
            const currentStock = recipe.material.stock;
            const isMissing = currentStock < totalNeeded;
            
            // Look for substitute if missing
            let substituteAvailable = false;
            let subName = '';
            let subStock = 0;

            if (isMissing && recipe.material.substituteId) {
                // Check if substitute has enough stock
                const sub = recipe.material.substitute;
                if (sub && sub.stock >= (totalNeeded - currentStock)) {
                    substituteAvailable = true;
                    subName = sub.name;
                    subStock = sub.stock;
                }
            }

            return {
                name: recipe.material.name,
                needed: totalNeeded,
                available: currentStock,
                unit: recipe.material.unit,
                isMissing,
                substituteAvailable,
                subName,
                subStock
            };
        });

        // Ready if no missing OR if all missing have substitutes (optional: usually we need manual confirmation, but for now we say ready if substitutes cover it)
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
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Product</label>
                            <select 
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                {products.map(p => (
                                    <option key={p.productId} value={p.productId}>{p.name}</option>
                                ))}
                                {products.length === 0 && <option disabled>No products found</option>}
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
                                {selectedProduct?.name}
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
                                    <p className="text-slate-500 font-bold text-sm italic">No recipe found for this product.</p>
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
