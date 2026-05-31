import React, { useState, useEffect } from 'react';
import { Box, Search, Filter, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

interface Batch {
    id: string;
    materialId: string;
    materialName: string;
    barcodeId: string;
    batchNumber: string;
    manufactureDate: string;
    expiryDate: string;
    quantity: number;
    createdAt: string;
}

const BatchInventory = () => {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const data = await api.getBatches();
                if (Array.isArray(data)) {
                    setBatches(data);
                } else {
                    console.error("Batch API returned non-array data:", data);
                    setBatches([]);
                }
            } catch (error) {
                console.error("Failed to fetch batches:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    const getStatus = (expiryDate: string) => {
        const exp = new Date(expiryDate);
        const now = new Date();
        
        if (exp.getTime() < now.getTime()) {
            return { label: 'Expired', color: 'bg-red-500/20 text-red-500 border-red-500/50', icon: AlertCircle };
        }
        
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (exp.getTime() - now.getTime() < thirtyDaysInMs) {
            return { label: 'Expiring Soon', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50', icon: Clock };
        }
        
        return { label: 'Valid', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50', icon: CheckCircle2 };
    };

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(dateStr));
    };

    const filteredBatches = batches.filter(batch => 
        batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.barcodeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Batch Inventory</h1>
                    <p className="text-slate-500 text-sm">Monitor material batches and expiry timelines.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search batch, material, or barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        />
                    </div>
                    <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        <Filter className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </div>

            <div className="glass-panel overflow-hidden border border-slate-200/60 rounded-2xl shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200/60">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Material</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timeline</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredBatches.length > 0 ? (
                                filteredBatches.map((batch) => {
                                    const status = getStatus(batch.expiryDate);
                                    const StatusIcon = status.icon;
                                    
                                    return (
                                        <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">#{batch.batchNumber}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{batch.barcodeId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                        <Box size={18} className="text-primary" />
                                                    </div>
                                                    <span className="font-semibold text-slate-700">{batch.materialName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {batch.quantity} <span className="text-xs text-slate-400">kg</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>Mfg: {formatDate(batch.manufactureDate)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                        <Calendar className="w-3 h-3 text-red-400" />
                                                        <span>Exp: {formatDate(batch.expiryDate)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                                                    status.color
                                                )}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label.toUpperCase()}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Box className="w-12 h-12 text-slate-200" />
                                            <p className="text-slate-500 font-medium">No batches found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BatchInventory;
