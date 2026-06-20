import React, { useState, useEffect } from 'react';
import { QrCode, Search, Clipboard, Calendar, Box, MapPin, Download, Eye, ArrowLeft, ArrowRight, Loader2, Info } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import api from '../services/api';
import { cn } from '../lib/utils';

interface QRItem {
    id: number;
    barcode_id: string;
    material_name: string;
    batch_number: string | null;
    rack_code: string;
    quantity: number;
    status: 'Used' | 'Unused';
    qr_image_path: string;
    created_at: string;
}

const QRRegistry = () => {
    const { lastUpdated } = useInventory();
    
    const [qrList, setQrList] = useState<QRItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'used' | 'unused'>('all');
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const limit = 10;

    // Preview modal state
    const [selectedQR, setSelectedQR] = useState<QRItem | null>(null);

    const fetchQrCodes = async () => {
        setLoading(true);
        try {
            const res = await api.getQrList({
                q: searchQuery.trim() || undefined,
                status: statusFilter,
                page,
                limit
            });
            if (res && res.status === 'success') {
                setQrList(res.data || []);
                setTotalCount(res.total || 0);
                setTotalPages(res.pages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch QR codes list:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Reset to page 1 when search or status filters change
        setPage(1);
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        fetchQrCodes();
    }, [page, searchQuery, statusFilter, lastUpdated]);

    const handleDownload = (path: string, id: string) => {
        const imageUrl = `http://localhost:5000${path}`;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `qr_${id}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr));
    };

    const filterTabs = [
        { id: 'all', label: 'All QR Labels' },
        { id: 'unused', label: 'Unused (In Stock)' },
        { id: 'used', label: 'Used (Depleted)' }
    ];

    // Compute simple summaries based on current list state or totals
    const unusedCount = qrList.filter(item => item.status === 'Unused').length;
    const usedCount = qrList.filter(item => item.status === 'Used').length;

    return (
        <div className="p-6 space-y-6 animate-saas-fade">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Clipboard className="text-primary" />
                        QR Code Label Registry
                    </h1>
                    <p className="text-slate-500 text-sm">Review, print, and track all generated QR barcode indexes.</p>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="saas-card p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Printed QR Codes</span>
                        <h3 className="text-3xl font-black text-slate-800 mt-2 font-mono">{totalCount}</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block mt-3">All generated barcodes in database</span>
                </div>

                <div className="saas-card p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active (Unused)</span>
                        <h3 className="text-3xl font-black text-emerald-650 mt-2 font-mono">
                            {statusFilter === 'unused' ? totalCount : statusFilter === 'all' ? qrList.filter(i => i.status === 'Unused').length : '—'}
                        </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block mt-3">Containers currently containing raw material</span>
                </div>

                <div className="saas-card p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Depleted (Used)</span>
                        <h3 className="text-3xl font-black text-slate-700 mt-2 font-mono">
                            {statusFilter === 'used' ? totalCount : statusFilter === 'all' ? qrList.filter(i => i.status === 'Used').length : '—'}
                        </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block mt-3">Discarded or consumed packages</span>
                </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/40">
                    {filterTabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setStatusFilter(t.id as any)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                statusFilter === t.id
                                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/30"
                                    : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Search query */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search material or barcode ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden border border-slate-200/60 rounded-2xl shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200/60">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Barcode ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Material</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Storage Slot</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Stock</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : qrList.length > 0 ? (
                                qrList.map((item) => {
                                    const isUnused = item.status === 'Unused';
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <QrCode size={14} className="text-slate-400" />
                                                    <span className="font-bold text-slate-700 font-mono text-xs">#{item.barcode_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-primary shrink-0">
                                                        <Box size={14} />
                                                    </div>
                                                    <span className="font-semibold text-slate-800 text-sm">{item.material_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase",
                                                        item.rack_code !== 'Not Assigned' 
                                                            ? "bg-indigo-50 border-indigo-150 text-primary" 
                                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                                    )}>
                                                        {item.rack_code}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-750 font-bold">
                                                {item.quantity} <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">KG</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                    isUnused 
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                        : "bg-slate-100 text-slate-450 border-slate-200"
                                                )}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-slate-500 font-mono">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    <span>{formatDate(item.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedQR(item)}
                                                        className="p-1.5 bg-white border border-slate-200 hover:border-primary text-slate-600 hover:text-primary rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 text-[11px] font-bold"
                                                        title="Preview QR Code"
                                                    >
                                                        <Eye size={12} />
                                                        View QR
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <Clipboard className="w-10 h-10 text-slate-200 stroke-[1.2]" />
                                            <p className="text-xs font-semibold">No QR records found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center gap-4">
                        <span className="text-xs text-slate-405 font-bold">
                            Showing page <span className="font-bold text-slate-700">{page}</span> of <span className="font-bold text-slate-700">{totalPages}</span> ({totalCount} items)
                        </span>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm text-slate-600 transition-colors flex items-center gap-1 text-xs font-bold"
                            >
                                <ArrowLeft size={12} />
                                Prev
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm text-slate-600 transition-colors flex items-center gap-1 text-xs font-bold"
                            >
                                Next
                                <ArrowRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* QR Detail Preview Modal */}
            {selectedQR && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-saas-fade">
                    <div className="bg-white rounded-2xl border border-slate-250/60 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col relative animate-saas-scale">
                        {/* Header */}
                        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <QrCode size={16} className="text-primary animate-pulse" />
                                <span className="text-xs font-bold text-slate-800 tracking-tight">QR Barcode Label</span>
                            </div>
                            <button 
                                onClick={() => setSelectedQR(null)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>

                        {/* Image Body */}
                        <div className="p-6 flex flex-col items-center border-b border-slate-100 space-y-4">
                            <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl shadow-inner">
                                <img
                                    src={selectedQR.qr_image_path ? `http://localhost:5000${selectedQR.qr_image_path}` : ''}
                                    alt={`QR ${selectedQR.barcode_id}`}
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                            <div className="text-center">
                                <code className="text-xs font-bold text-slate-500 font-mono block">Barcode ID: #{selectedQR.barcode_id}</code>
                                <h4 className="text-base font-black text-slate-900 mt-1">{selectedQR.material_name}</h4>
                            </div>
                        </div>

                        {/* Detail Metadata Grid */}
                        <div className="px-5 py-4 bg-slate-50/50 text-xs font-semibold grid grid-cols-2 gap-4 border-b border-slate-100">
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rack Location</span>
                                <span className={cn(
                                    "inline-block mt-0.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase",
                                    selectedQR.rack_code !== 'Not Assigned' 
                                        ? "bg-indigo-50 border-indigo-150 text-primary" 
                                        : "bg-slate-50 border-slate-200 text-slate-400"
                                )}>
                                    {selectedQR.rack_code}
                                </span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Current Stock</span>
                                <span className="text-slate-850 font-bold block mt-0.5 font-mono">
                                    {selectedQR.quantity} KG
                                </span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bucket Status</span>
                                <span className={cn(
                                    "inline-block mt-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                    selectedQR.status === 'Unused' 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                        : "bg-slate-100 text-slate-450 border-slate-200"
                                )}>
                                    {selectedQR.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Generated On</span>
                                <span className="text-slate-600 font-bold block mt-0.5">
                                    {formatDate(selectedQR.created_at)}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-5 py-3.5 bg-slate-50 flex gap-2">
                            <button
                                onClick={() => selectedQR.qr_image_path && handleDownload(selectedQR.qr_image_path, selectedQR.barcode_id)}
                                disabled={!selectedQR.qr_image_path}
                                className="flex-1 py-2 px-3 bg-primary hover:bg-primary/95 disabled:bg-slate-350 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 text-xs"
                            >
                                <Download size={14} />
                                Download PNG
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRRegistry;
