import React, { useState, useEffect } from 'react';
import { 
    History, 
    ArrowDownRight, 
    ArrowUpRight, 
    User as UserIcon, 
    Clock, 
    Search, 
    Download, 
    Calendar,
    Tag, 
    Layers, 
    RefreshCw 
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import EmptyState from '../components/ui/EmptyState';

const Transactions = () => {
    const { transactions, refreshData, loading } = useInventory();
    const [searchQuery, setSearchQuery] = useState('');
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

    useEffect(() => {
        refreshData();
    }, []);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isWithinDays = (date: Date, days: number) => {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
    };

    const filteredTransactions = transactions.filter(trx => {
        const barcodeVal = trx.barcode || '';
        const matNameVal = trx.materialName || '';
        
        const matchesSearch = 
            barcodeVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
            matNameVal.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        const trxDate = new Date(trx.timestamp);
        if (timeFilter === 'today') {
            return isToday(trxDate);
        } else if (timeFilter === 'week') {
            return isWithinDays(trxDate, 7);
        } else if (timeFilter === 'month') {
            return isWithinDays(trxDate, 30);
        }
        return true;
    });

    const exportToCSV = () => {
        const headers = ['Date & Time', 'Barcode', 'Material', 'Rack', 'Quantity (KG)', 'Transaction Type', 'Operator', 'ID'];
        const csvRows = [
            headers.join(','),
            ...filteredTransactions.map(trx => [
                new Date(trx.timestamp).toLocaleString(),
                trx.barcode || 'N/A',
                trx.materialName,
                trx.location || 'Unassigned',
                trx.quantity,
                trx.type.toUpperCase(),
                trx.user,
                trx.id
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ];

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `transaction_history_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-900 p-4 md:p-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider border border-blue-100 w-fit mb-3">
                        Operational Ledger
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Transaction History</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Real-time audit log of all raw material movements, inward ingresses, and outward dispatches.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshData}
                        disabled={loading}
                        className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-50 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
                        title="Reload Data"
                    >
                        <RefreshCw size={18} className={cn(loading && "animate-spin")} />
                    </button>

                    <button
                        onClick={exportToCSV}
                        disabled={filteredTransactions.length === 0}
                        className="flex items-center gap-2 px-5 py-3 bg-[#4F8CFF] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/10 active:scale-95"
                    >
                        <Download size={15} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters and Search toolbar */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/60 border border-slate-150 rounded-3xl p-4 shadow-sm backdrop-blur-md">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                    {/* Search Field */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Barcode or Material..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all text-slate-900"
                        />
                    </div>

                    {/* Time Filter Buttons */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        {(['all', 'today', 'week', 'month'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setTimeFilter(mode)}
                                className={cn(
                                    "px-4 py-2 text-xs font-bold rounded-md transition-all capitalize",
                                    timeFilter === mode 
                                        ? "bg-white text-slate-800 shadow-sm" 
                                        : "text-slate-400 hover:text-slate-700"
                                )}
                            >
                                {mode === 'all' ? 'All Time' : mode}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2">
                    Found {filteredTransactions.length} records
                </div>
            </div>

            {/* Transactions Ledger Card */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-150">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Date & Time</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Barcode</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Material</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Rack</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Transaction Type</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none text-right">Quantity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Operator</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredTransactions.map((trx) => {
                                const trDate = new Date(trx.timestamp);
                                const isOutward = trx.type === 'outward';

                                return (
                                    <tr key={trx.id} className="group hover:bg-slate-50/30 transition-colors">
                                        {/* Date & Time */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                                                <Clock size={14} className="text-slate-350" />
                                                <span>
                                                    {trDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {trDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Barcode */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10.5px] bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg w-fit">
                                                <Tag size={12} className="text-slate-400" />
                                                <span className="font-bold uppercase tracking-wider">
                                                    {trx.barcode || 'N/A'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Material */}
                                        <td className="px-6 py-4.5">
                                            <div className="flex flex-col max-w-[200px]">
                                                <span className="font-extrabold text-slate-900 leading-tight truncate">
                                                    {trx.materialName}
                                                </span>
                                                <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                                                    ID: {trx.materialId}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Rack */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                                                <Layers size={13} className="text-[#4F8CFF] shrink-0" />
                                                <span className="font-bold">
                                                    {trx.location && trx.location !== 'Warehouse Zone A' ? `Rack ${trx.location}` : 'Unassigned'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Transaction Type */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                isOutward
                                                    ? "bg-rose-50 text-rose-600 border-rose-150"
                                                    : "bg-emerald-50 text-emerald-600 border-emerald-150"
                                            )}>
                                                {isOutward ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                {trx.type.toUpperCase()}
                                            </span>
                                        </td>

                                        {/* Quantity */}
                                        <td className="px-6 py-4.5 text-right whitespace-nowrap">
                                            <span className={cn(
                                                "font-black text-sm",
                                                isOutward ? "text-rose-600" : "text-emerald-600"
                                            )}>
                                                {isOutward ? '-' : '+'}{trx.quantity.toLocaleString()} KG
                                            </span>
                                        </td>

                                        {/* Operator */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                    <UserIcon size={12} className="text-slate-400" />
                                                </div>
                                                <span className="font-bold text-xs">{trx.user}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length === 0 && (
                    <div className="py-20 text-center flex justify-center">
                        <EmptyState
                            icon={History}
                            title="No matching transactions"
                            description="Adjust your search query or period filter to view movements."
                        />
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Transactions;
