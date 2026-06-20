import React, { useState, useEffect, useCallback } from 'react';
import { 
    Database, 
    Calendar, 
    Search, 
    Download, 
    RefreshCw, 
    FileText, 
    FileSpreadsheet, 
    ChevronLeft, 
    ChevronRight, 
    Filter, 
    Clock, 
    ArrowDownRight, 
    ArrowUpRight, 
    AlertTriangle, 
    Mail,
    X
} from 'lucide-react';
import api, { getAuditLogs, exportAuditLogs } from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';

interface AuditRecord {
    id: number;
    action_type: string;
    material_name: string | null;
    qr_code: string | null;
    rack_code: string | null;
    user_name: string;
    action_details: string | null;
    timestamp: string;
}

interface SummaryStats {
    today_actions: number;
    inward_count: number;
    outward_count: number;
    alerts_generated: number;
    emails_sent: number;
}

const AuditLog: React.FC = () => {
    // Audit Records & Pagination state
    const [records, setRecords] = useState<AuditRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<SummaryStats>({
        today_actions: 0,
        inward_count: 0,
        outward_count: 0,
        alerts_generated: 0,
        emails_sent: 0
    });
    
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedActionType, setSelectedActionType] = useState('All');
    const [filterDate, setFilterDate] = useState('');
    const [filterMaterial, setFilterMaterial] = useState('');
    const [filterRack, setFilterRack] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Sorting state
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

    // Auto Refresh state
    const [autoRefresh, setAutoRefresh] = useState(true);

    const actionTypes = [
        'All',
        'QR Generated',
        'Inward Scan',
        'Outward Scan',
        'Material Created',
        'Material Updated',
        'Material Deleted',
        'Rack Assignment',
        'Rack Transfer',
        'Threshold Alert',
        'Email Alert',
        'AI Recommendation Generated',
        'User Login',
        'User Logout'
    ];

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                limit,
                sortBy,
                sortOrder,
                action_type: selectedActionType,
                date: filterDate || undefined,
                material_name: filterMaterial || undefined,
                rack_code: filterRack || undefined,
                user_name: filterUser || undefined,
                q: searchQuery || undefined
            };

             const res = await getAuditLogs(params);
             if (res && res.status === 'success') {
                 setRecords(Array.isArray(res.data) ? res.data : []);
                 setTotalPages(res.pages || 1);
                 setTotalRecords(res.total || 0);
                 if (res.stats) {
                     setStats(res.stats);
                 }
             } else {
                 setRecords([]);
             }
         } catch (err: any) {
             console.error('Failed to fetch audit logs:', err);
             toast.error(err.message || 'Failed to fetch audit logs');
             setRecords([]);
         } finally {
             setLoading(false);
         }
    }, [page, limit, sortBy, sortOrder, selectedActionType, filterDate, filterMaterial, filterRack, filterUser, searchQuery]);

    // Fetch logs on change
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Live Auto Refresh (every 10 seconds)
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchLogs();
        }, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(prev => (prev === 'DESC' ? 'ASC' : 'DESC'));
        } else {
            setSortBy(field);
            setSortOrder('DESC');
        }
        setPage(1);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedActionType('All');
        setFilterDate('');
        setFilterMaterial('');
        setFilterRack('');
        setFilterUser('');
        setPage(1);
        toast.success('Filters cleared');
    };

    const handleExportCSV = async () => {
        const toastId = toast.loading('Compiling CSV logs...');
        try {
            const params = {
                action_type: selectedActionType,
                date: filterDate || undefined,
                material_name: filterMaterial || undefined,
                rack_code: filterRack || undefined,
                user_name: filterUser || undefined,
                q: searchQuery || undefined,
                sortBy,
                sortOrder
            };
            const res = await exportAuditLogs(params);
            
            if (res && res.status === 'success' && Array.isArray(res.data)) {
                let csvContent = 'data:text/csv;charset=utf-8,';
                csvContent += 'ID,Timestamp,User,Action Type,Material Name,QR Code,Rack Code,Details\n';
                
                res.data.forEach((r: AuditRecord) => {
                    const row = [
                        r.id,
                        `"${new Date(r.timestamp).toLocaleString()}"`,
                        `"${r.user_name}"`,
                        `"${r.action_type}"`,
                        `"${r.material_name || ''}"`,
                        `"${r.qr_code || ''}"`,
                        `"${r.rack_code || ''}"`,
                        `"${(r.action_details || '').replace(/"/g, '""')}"`
                    ].join(',');
                    csvContent += row + '\n';
                });

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `Industrial_Audit_Log_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('CSV Export downloaded!', { id: toastId });
            } else {
                throw new Error('No data retrieved to export');
            }
        } catch (err: any) {
            console.error('Failed to export CSV:', err);
            toast.error(err.message || 'Failed to export CSV', { id: toastId });
        }
    };

    const handleExportPDF = async () => {
        const toastId = toast.loading('Compiling PDF document...');
        try {
            const params = {
                action_type: selectedActionType,
                date: filterDate || undefined,
                material_name: filterMaterial || undefined,
                rack_code: filterRack || undefined,
                user_name: filterUser || undefined,
                q: searchQuery || undefined,
                sortBy,
                sortOrder
            };
            const res = await exportAuditLogs(params);
            
            if (res && res.status === 'success' && Array.isArray(res.data)) {
                const doc = new jsPDF();
                
                // Add header info
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(20);
                doc.setTextColor(15, 23, 42); // slate-900
                doc.text('RM Monitor - Industrial Audit Trail', 14, 20);
                
                doc.setFontSize(9);
                doc.setFont('Helvetica', 'normal');
                doc.setTextColor(100);
                doc.text(`Generated: ${new Date().toLocaleString()} | Filtered records: ${res.data.length}`, 14, 27);
                
                const columns = ['Timestamp', 'User', 'Action', 'Material', 'Rack', 'Details'];
                const rows = res.data.map((r: AuditRecord) => [
                    new Date(r.timestamp).toLocaleString(),
                    r.user_name,
                    r.action_type,
                    r.material_name || 'N/A',
                    r.rack_code || 'N/A',
                    r.action_details || ''
                ]);

                autoTable(doc, {
                    head: [columns],
                    body: rows,
                    startY: 33,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 140, 255], fontSize: 8 },
                    bodyStyles: { fontSize: 7.5 },
                    columnStyles: {
                        0: { cellWidth: 28 },
                        1: { cellWidth: 20 },
                        2: { cellWidth: 26 },
                        3: { cellWidth: 24 },
                        4: { cellWidth: 16 },
                        5: { cellWidth: 70 }
                    }
                });

                doc.save(`Industrial_Audit_Trail_${Date.now()}.pdf`);
                toast.success('PDF report exported successfully!', { id: toastId });
            } else {
                throw new Error('No data retrieved to export');
            }
        } catch (err: any) {
            console.error('Failed to export PDF:', err);
            toast.error(err.message || 'Failed to export PDF', { id: toastId });
        }
    };

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date(dateStr));
    };

    return (
        <div className="space-y-8 pb-12 text-slate-800 animate-saas-fade">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider border border-blue-100">
                        <Database size={10} />
                        Industrial Audit Logging WMS
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
                        Warehouse Operations Audit Trail
                    </h1>
                    <p className="text-xs text-slate-505 mt-1 font-medium">
                        Real-time verification logs of physical assignments, scan records, AI updates, safety alert states, and auth events.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Auto Refresh Toggle */}
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl">
                        <span className="relative flex h-2 w-2">
                            {autoRefresh && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", autoRefresh ? "bg-emerald-500" : "bg-slate-400")}></span>
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide">Auto-Refresh (10s)</span>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-350 cursor-pointer"
                        />
                    </div>
                    
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                        title="Force reload telemetry"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Dashboard Card summary panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* 1. Today's Actions */}
                <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <div className="icon-container bg-slate-100 text-slate-700">
                            <Clock size={16} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Today's Actions</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">{stats.today_actions}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">Log records generated today</p>
                </div>

                {/* 2. Inward Count */}
                <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <div className="icon-container bg-emerald-50 text-emerald-600">
                            <ArrowDownRight size={16} />
                        </div>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Inwards Today</span>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-600">{stats.inward_count}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">Materials scanned inward</p>
                </div>

                {/* 3. Outward Count */}
                <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <div className="icon-container bg-amber-50 text-amber-600">
                            <ArrowUpRight size={16} />
                        </div>
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Outwards Today</span>
                    </div>
                    <h3 className="text-2xl font-black text-amber-600">{stats.outward_count}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">Materials scanned outward</p>
                </div>

                {/* 4. Alerts Generated */}
                <div className={cn(
                    "saas-card p-5 hover:scale-[1.01] transition-transform duration-300",
                    stats.alerts_generated > 0 ? "border-rose-200 bg-rose-50/10 shadow-[0_0_15px_rgba(244,63,94,0.02)]" : ""
                )}>
                    <div className="flex justify-between items-center mb-4">
                        <div className={cn("icon-container", stats.alerts_generated > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-500")}>
                            <AlertTriangle size={16} />
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest leading-none", stats.alerts_generated > 0 ? "text-rose-500" : "text-slate-400")}>Alerts Generated</span>
                    </div>
                    <h3 className={cn("text-2xl font-black", stats.alerts_generated > 0 ? "text-rose-600" : "text-slate-800")}>{stats.alerts_generated}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">Safety breaches recorded today</p>
                </div>

                {/* 5. Emails Sent */}
                <div className="saas-card p-5 hover:scale-[1.01] transition-transform duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <div className="icon-container bg-blue-50 text-blue-600">
                            <Mail size={16} />
                        </div>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Emails Sent</span>
                    </div>
                    <h3 className="text-2xl font-black text-blue-600">{stats.emails_sent}</h3>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">Dispatched email warnings</p>
                </div>
            </div>

            {/* Filter and Search controls */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* General Search */}
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs across any field..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#4F8CFF]/25 focus:border-[#4F8CFF] text-xs font-semibold transition-all text-slate-900"
                        />
                    </div>

                    {/* Exporters and Filters toggle */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all active:scale-95",
                                showFilters 
                                    ? "bg-slate-100 border-slate-300 text-slate-800" 
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Filter size={14} />
                            Filters
                            {(selectedActionType !== 'All' || filterDate || filterMaterial || filterRack || filterUser) && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-250 rounded-xl font-bold text-xs text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                        >
                            <FileSpreadsheet size={14} className="text-emerald-500" />
                            Export CSV
                        </button>

                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md hover:opacity-95 transition-all active:scale-95"
                        >
                            <FileText size={14} className="text-rose-400" />
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Extended filters drawer */}
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100/80 animate-in slide-in-from-top-2 duration-300">
                        {/* Action Type */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Action Type</label>
                            <select
                                value={selectedActionType}
                                onChange={(e) => { setSelectedActionType(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#4F8CFF] text-slate-700"
                            >
                                {actionTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filter Date</label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#4F8CFF] text-slate-700"
                            />
                        </div>

                        {/* Material */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Material Name</label>
                            <input
                                type="text"
                                placeholder="Paint name..."
                                value={filterMaterial}
                                onChange={(e) => { setFilterMaterial(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#4F8CFF] text-slate-700"
                            />
                        </div>

                        {/* Rack */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rack Code</label>
                            <input
                                type="text"
                                placeholder="Shelf A1, B3..."
                                value={filterRack}
                                onChange={(e) => { setFilterRack(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#4F8CFF] text-slate-700"
                            />
                        </div>

                        {/* User */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operator User</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Name/Email..."
                                    value={filterUser}
                                    onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
                                    className="w-full px-3 py-2 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#4F8CFF] text-slate-700"
                                />
                                {(selectedActionType !== 'All' || filterDate || filterMaterial || filterRack || filterUser) && (
                                    <button 
                                        onClick={clearFilters}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        title="Clear all filters"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table registry card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100/80">
                                <th 
                                    onClick={() => handleSort('timestamp')}
                                    className="px-6 py-4.5 text-[10px] font-black text-slate-450 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-all"
                                >
                                    <div className="flex items-center gap-1">
                                        Timestamp
                                        {sortBy === 'timestamp' && (sortOrder === 'DESC' ? '↓' : '↑')}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('user_name')}
                                    className="px-6 py-4.5 text-[10px] font-black text-slate-450 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-all"
                                >
                                    <div className="flex items-center gap-1">
                                        User
                                        {sortBy === 'user_name' && (sortOrder === 'DESC' ? '↓' : '↑')}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('action_type')}
                                    className="px-6 py-4.5 text-[10px] font-black text-slate-450 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-all"
                                >
                                    <div className="flex items-center gap-1">
                                        Action
                                        {sortBy === 'action_type' && (sortOrder === 'DESC' ? '↓' : '↑')}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('material_name')}
                                    className="px-6 py-4.5 text-[10px] font-black text-slate-450 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-all"
                                >
                                    <div className="flex items-center gap-1">
                                        Material
                                        {sortBy === 'material_name' && (sortOrder === 'DESC' ? '↓' : '↑')}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('rack_code')}
                                    className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-all"
                                >
                                    <div className="flex items-center gap-1">
                                        Rack
                                        {sortBy === 'rack_code' && (sortOrder === 'DESC' ? '↓' : '↑')}
                                    </div>
                                </th>
                                <th className="px-6 py-4.5 text-[10px] font-black text-slate-455 uppercase tracking-widest">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5">
                                            <div className="h-5 bg-slate-100 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : records.length > 0 ? (
                                records.map((record) => {
                                    // Badge color mapping
                                    let badgeClass = 'bg-slate-105 text-slate-600 border-slate-200';
                                    if (record.action_type === 'Inward Scan') badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                    else if (record.action_type === 'Outward Scan') badgeClass = 'bg-amber-50 text-amber-600 border-amber-100';
                                    else if (record.action_type.includes('Alert')) badgeClass = 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse';
                                    else if (record.action_type.includes('AI')) badgeClass = 'bg-purple-50 text-purple-600 border-purple-100';
                                    else if (record.action_type.includes('Login')) badgeClass = 'bg-blue-50 text-blue-600 border-blue-100';

                                    return (
                                        <tr key={record.id} className="hover:bg-slate-50/20 transition-colors">
                                            <td className="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                                                {formatDate(record.timestamp)}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                                {record.user_name}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border", badgeClass)}>
                                                    {record.action_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-700 truncate max-w-[150px]">
                                                {record.material_name || <span className="text-slate-350 italic">N/A</span>}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {record.rack_code ? (
                                                    <span className="bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 font-mono">
                                                        {record.rack_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-350 italic">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-550 leading-relaxed max-w-[280px] break-words">
                                                {record.action_details || ''}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <Database className="w-10 h-10 text-slate-200 stroke-[1.2]" />
                                            <p className="text-xs font-semibold">No audit records found matching the criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 select-none shrink-0 bg-slate-50/50">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Showing {records.length} of {totalRecords} records
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-slate-250 bg-white rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-bold text-slate-700 px-2">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-slate-250 bg-white rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLog;
