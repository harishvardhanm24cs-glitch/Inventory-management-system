import React, { useState } from 'react';
import { Box, Search, Filter, Calendar, AlertCircle, CheckCircle2, Clock, Hourglass } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';

const BatchInventory = () => {
    const { batches, loading, lastUpdated } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');

    const getDaysStored = (dateStr: string) => {
        const storedTime = new Date(dateStr).getTime();
        const diff = Date.now() - storedTime;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days < 0 ? 0 : days;
    };

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(dateStr));
    };

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

    // FIFO Calculations
    const activeBatches = batches.filter((b: any) => Number(b.quantity) > 0);
    const fifoQueue = [...activeBatches].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const oldestBatch = fifoQueue[0] || null;
    const newestBatch = fifoQueue[fifoQueue.length - 1] || null;

    const avgStorageTime = activeBatches.length > 0 
        ? Math.round(activeBatches.reduce((acc, b) => acc + getDaysStored(b.createdAt), 0) / activeBatches.length) 
        : 0;

    const overdueCount = activeBatches.filter(b => getDaysStored(b.createdAt) > 14).length;

    const filteredBatches = batches.filter(batch => 
        (batch.batchNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (batch.materialName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (batch.barcodeId || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 animate-saas-fade">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Batch Inventory</h1>
                    <p className="text-slate-500 text-sm">Monitor material batches, FIFO priority, and storage durations.</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                    {lastUpdated && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider self-center md:self-auto">
                            Last Updated: {lastUpdated}
                        </span>
                    )}
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
            </div>

            {/* FIFO Telemetry Widget */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Oldest Batch (Dispatch Priority 1) */}
                <div className="saas-card p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                                <Clock size={10} className="animate-spin" style={{ animationDuration: '3s' }} /> Dispatch Priority 1
                            </span>
                            <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-600">
                                <AlertCircle size={16} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Oldest Stored Batch</h4>
                            <div className="font-bold text-slate-800 text-sm mt-1 truncate">
                                {oldestBatch ? oldestBatch.materialName : 'No Active Batches'}
                            </div>
                            {oldestBatch && (
                                <div className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5">
                                    Batch: #{oldestBatch.batchNumber}
                                </div>
                            )}
                        </div>
                    </div>
                    {oldestBatch && (
                        <div className="mt-4 pt-3 border-t border-slate-105 flex justify-between items-baseline">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Stored duration</span>
                            <span className={cn(
                                "text-lg font-black font-mono",
                                getDaysStored(oldestBatch.createdAt) > 14 ? "text-rose-600" : "text-slate-700"
                            )}>
                                {getDaysStored(oldestBatch.createdAt)} <span className="text-[10px] font-bold uppercase">Days</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Card 2: Newest Batch */}
                <div className="saas-card p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                Recent Inward
                            </span>
                            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Newest Stored Batch</h4>
                            <div className="font-bold text-slate-800 text-sm mt-1 truncate">
                                {newestBatch ? newestBatch.materialName : 'No Active Batches'}
                            </div>
                            {newestBatch && (
                                <div className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5">
                                    Batch: #{newestBatch.batchNumber}
                                </div>
                            )}
                        </div>
                    </div>
                    {newestBatch && (
                        <div className="mt-4 pt-3 border-t border-slate-105 flex justify-between items-baseline">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Stored duration</span>
                            <span className="text-lg font-black font-mono text-slate-700">
                                {getDaysStored(newestBatch.createdAt)} <span className="text-[10px] font-bold uppercase">Days</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Card 3: Avg Storage Days */}
                <div className="saas-card p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                Avg Age
                            </span>
                            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
                                <Hourglass size={16} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Average Storage Duration</h4>
                            <div className="font-black text-slate-800 text-2xl mt-1 font-mono">
                                {avgStorageTime} <span className="text-xs font-bold text-slate-450 uppercase font-sans">Days</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium font-sans">Mean age of active material batches</p>
                        </div>
                    </div>
                </div>

                {/* Card 4: Overdue Batches */}
                <div className="saas-card p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                overdueCount > 0 
                                    ? "bg-rose-50 text-rose-600 border-rose-200" 
                                    : "bg-slate-50 text-slate-500 border-slate-200"
                            )}>
                                Storage Limit: 14d
                            </span>
                            <div className={cn(
                                "p-1.5 rounded-lg border",
                                overdueCount > 0 
                                    ? "bg-rose-50 border-rose-100 text-rose-600 animate-bounce" 
                                    : "bg-slate-50 border-slate-100 text-slate-400"
                            )}>
                                <Clock size={16} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Exceeded Max Storage</h4>
                            <div className={cn(
                                "font-black text-2xl mt-1 font-mono",
                                overdueCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-800"
                            )}>
                                {overdueCount} <span className="text-xs font-bold text-slate-400 uppercase font-sans">Batches</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium font-sans">
                                {overdueCount > 0 ? 'Requires immediate stock dispatch!' : 'All batches within storage limits'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel overflow-hidden border border-slate-200/60 rounded-2xl shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200/60">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Material</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timeline</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Storage Days</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">FIFO Priority</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredBatches.length > 0 ? (
                                filteredBatches.map((batch) => {
                                    const status = getStatus(batch.expiryDate);
                                    const StatusIcon = status.icon;
                                    
                                    const daysStored = getDaysStored(batch.createdAt);
                                    const isDepleted = Number(batch.quantity) <= 0;
                                    const isOverdue = !isDepleted && daysStored > 14;
                                    
                                    // Calculate FIFO priority rank
                                    const fifoRank = isDepleted 
                                        ? -1 
                                        : fifoQueue.findIndex(b => b.id === batch.id) + 1;
                                    
                                    return (
                                        <tr key={batch.id} className={cn(
                                            "hover:bg-slate-50/50 transition-colors group",
                                            isOverdue ? "bg-rose-50/15 border-l-2 border-l-rose-550" : ""
                                        )}>
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
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn(
                                                            "text-sm font-black font-mono",
                                                            isOverdue ? "text-rose-600 animate-pulse font-extrabold" : "text-slate-700"
                                                        )}>
                                                            {daysStored} Days
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                        {isOverdue ? "Overdue (Limit 14d)" : "In Storage"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isDepleted ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-450 border border-slate-200 uppercase">
                                                        Depleted
                                                    </span>
                                                ) : (
                                                    <span className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border font-sans",
                                                        fifoRank === 1 ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse font-extrabold" :
                                                        fifoRank === 2 ? "bg-amber-50 text-amber-605 border-amber-200" :
                                                        fifoRank === 3 ? "bg-blue-50 text-blue-600 border-blue-200" :
                                                        "bg-slate-50 text-slate-500 border-slate-200"
                                                    )}>
                                                        {fifoRank === 1 ? "Priority 1 (Oldest)" : `Priority ${fifoRank}`}
                                                    </span>
                                                )}
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
                                    <td colSpan={7} className="px-6 py-12 text-center">
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
