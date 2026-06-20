import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Download, 
    Trash2, 
    RefreshCw, 
    Calendar,
    Database,
    Bell,
    QrCode,
    Layout,
    TrendingUp,
    ShieldAlert,
    Eye,
    Package,
    AlertTriangle,
    FileCheck,
    ArrowRight,
    Brain,
    X,
    Filter,
    FileSpreadsheet,
    FileJson,
    User as UserIcon
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface StoredReport {
    filename: string;
    size: number;
    created_at: string;
    url: string;
}

const Reports = () => {
    const [reports, setReports] = useState<StoredReport[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [actionLoading, setActionLoading] = useState<{ id: string; action: 'preview' | 'download' } | null>(null);
    const [stats, setStats] = useState<any>(null);

    // Filter states
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterMaterial, setFilterMaterial] = useState('');
    const [filterRack, setFilterRack] = useState('');
    const [filterZone, setFilterZone] = useState('All');
    const [filterUser, setFilterUser] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const reportOptions = [
        { 
            id: 'inventory', 
            label: 'Inventory Summary Report', 
            desc: 'Exposes full list of active raw materials, quantities, threshold limits, and status.',
            icon: Package,
            colorClass: 'text-blue-600 bg-blue-50 border border-blue-100/50 hover:bg-blue-100/30',
            endpoint: 'inventory'
        },
        { 
            id: 'racks', 
            label: 'Rack Utilization Report', 
            desc: 'Exposes storage slots allocations, capacity limits, and utilization percentages by zone.',
            icon: Layout,
            colorClass: 'text-purple-600 bg-purple-50 border border-purple-100/50 hover:bg-purple-100/30',
            endpoint: 'racks'
        },
        { 
            id: 'movement', 
            label: 'Material Movement Report', 
            desc: 'Exposes total inward, outward, and transfer transaction volumes aggregated by raw material.',
            icon: RefreshCw,
            colorClass: 'text-indigo-600 bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-100/30',
            endpoint: 'movement'
        },
        { 
            id: 'alerts', 
            label: 'Threshold Alert Report', 
            desc: 'Exposes log of safety low-stock warnings and active system alerts with safety thresholds.',
            icon: Bell,
            colorClass: 'text-rose-600 bg-rose-50 border border-rose-100/50 hover:bg-rose-100/30',
            endpoint: 'alerts'
        },
        { 
            id: 'ai-recommendations', 
            label: 'AI Recommendation Report', 
            desc: 'Exposes generated optimization advice, capacity recommendations, and reorder warnings.',
            icon: Brain,
            colorClass: 'text-emerald-600 bg-emerald-50 border border-emerald-100/50 hover:bg-emerald-100/30',
            endpoint: 'ai-recommendations'
        },
        { 
            id: 'warehouse-health', 
            label: 'Warehouse Health Report', 
            desc: 'A comprehensive rating, utilization audit, active/empty slots, and temperature zone summary.',
            icon: FileText,
            colorClass: 'text-amber-600 bg-amber-50 border border-amber-100/50 hover:bg-amber-100/30',
            endpoint: 'warehouse-health'
        }
    ];

    useEffect(() => {
        fetchHistory();
        fetchStats();
    }, []);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await api.getReports();
            if (res && res.status === 'success') {
                setReports(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load reports history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.getWarehouseStats();
            if (res && res.status === 'success') {
                setStats(res.data || res);
            }
        } catch (err) {
            console.error('Failed to fetch warehouse stats for report:', err);
        }
    };

    const handleAction = async (endpoint: string, action: 'preview' | 'download', reportId: string, format: 'pdf' | 'csv' | 'excel' = 'pdf') => {
        const loadingKey = `${reportId}-${format}`;
        setActionLoading({ id: loadingKey, action });
        const toastId = toast.loading(`${action === 'preview' ? 'Compiling preview' : 'Compiling for download'} ${format.toUpperCase()}...`);
        
        try {
            const params = {
                startDate: filterStartDate || undefined,
                endDate: filterEndDate || undefined,
                material: filterMaterial || undefined,
                rack: filterRack || undefined,
                zone: filterZone || undefined,
                user: filterUser || undefined,
                format
            };

            const blob = await api.getReportPdf(endpoint, action, params);
            
            // Check if blob is actually a JSON error response
            if (blob.type === 'application/json') {
                const text = await blob.text();
                try {
                    const parsed = JSON.parse(text);
                    throw new Error(parsed.message || parsed.error || "Failed to generate report");
                } catch (jsonErr) {
                    throw new Error("Failed to parse report error.");
                }
            }
            
            // Resolve correct mime type & extension
            let mimeType = 'application/pdf';
            let ext = 'pdf';
            if (format === 'csv') {
                mimeType = 'text/csv';
                ext = 'csv';
            } else if (format === 'excel') {
                mimeType = 'application/vnd.ms-excel';
                ext = 'xls';
            }

            const fileBlob = new Blob([blob], { type: mimeType });
            const blobUrl = URL.createObjectURL(fileBlob);
            
            if (action === 'preview' && format === 'pdf') {
                window.open(blobUrl, '_blank');
            } else {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${endpoint}_report_${Date.now()}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            toast.success(`${format.toUpperCase()} report compiled successfully!`, { id: toastId });
            
            // Refresh history list
            fetchHistory();
        } catch (err: any) {
            console.error(`Failed to execute report action:`, err);
            toast.error(err.message || `Failed to generate ${format.toUpperCase()} report`, { id: toastId });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteReport = async (filename: string) => {
        if (!window.confirm(`Are you sure you want to delete report '${filename}' from the server disk?`)) return;
        
        const toastId = toast.loading('Deleting report file...');
        try {
            const res = await api.deleteReport(filename);
            if (res && res.status === 'success') {
                toast.success('Report deleted successfully.', { id: toastId });
                fetchHistory();
            }
        } catch (err: any) {
            console.error('Failed to delete report:', err);
            toast.error('Failed to delete report: ' + err.message, { id: toastId });
        }
    };

    const clearFilters = () => {
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterMaterial('');
        setFilterRack('');
        setFilterZone('All');
        setFilterUser('');
        toast.success('Filters cleared');
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 text-slate-900">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold uppercase tracking-wider border border-blue-100">
                        <FileText className="w-3.5 h-3.5" />
                        Executive Reporting Center v4.0
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Management Report Center</h1>
                    <p className="text-slate-505 max-w-lg">Generate on-demand analytical reports. Filter by date range, materials, and zones and download as PDF, Excel, or CSV formats.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all active:scale-95",
                            showFilters 
                                ? "bg-slate-100 border-slate-300 text-slate-800" 
                                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                        )}
                    >
                        <Filter size={14} />
                        Filters
                        {(filterStartDate || filterEndDate || filterMaterial || filterRack || filterZone !== 'All' || filterUser) && (
                            <span className="w-2 h-2 rounded-full bg-blue-505 animate-pulse" />
                        )}
                    </button>
                    
                    <button 
                        onClick={() => { fetchHistory(); fetchStats(); toast.success('Data logs refreshed!'); }}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-55 transition-all shadow-sm active:scale-95 flex items-center justify-center text-slate-600"
                        title="Refresh Data Logs"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Extended Filters Drawer */}
            {showFilters && (
                <div className="bg-white border border-slate-150 shadow-sm p-6 rounded-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Start Date</label>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-700"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">End Date</label>
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-700"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Material</label>
                        <input
                            type="text"
                            placeholder="Paint name..."
                            value={filterMaterial}
                            onChange={(e) => setFilterMaterial(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-700"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rack Code</label>
                        <input
                            type="text"
                            placeholder="A1, B3..."
                            value={filterRack}
                            onChange={(e) => setFilterRack(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-700"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Zone</label>
                        <select
                            value={filterZone}
                            onChange={(e) => setFilterZone(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-700"
                        >
                            <option value="All">All Zones</option>
                            <option value="A">Receiving (A)</option>
                            <option value="B">Storage (B)</option>
                            <option value="C">Dispatch (C)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operator User</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Name/email..."
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                className="w-full px-3 py-2 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-700"
                            />
                            {(filterStartDate || filterEndDate || filterMaterial || filterRack || filterZone !== 'All' || filterUser) && (
                                <button 
                                    onClick={clearFilters}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    title="Clear filters"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Reports Stats HUD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="saas-card p-5 bg-white border border-slate-200/50 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 bg-blue-50 text-primary rounded-xl shrink-0">
                        <FileText size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Stored Reports</span>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">{reports.length}</h3>
                    </div>
                </div>

                <div className="saas-card p-5 bg-white border border-slate-200/50 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                        <Database size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Inventory</span>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">
                            {stats?.totalInventory !== undefined ? stats.totalInventory.toLocaleString() : 0} <span className="text-xs">KG</span>
                        </h3>
                    </div>
                </div>

                <div className="saas-card p-5 bg-white border border-slate-200/50 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                        <Layout size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Racks Utilization</span>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">
                            {stats?.utilizationPercentage !== undefined ? stats.utilizationPercentage.toFixed(2) : 0}%
                        </h3>
                    </div>
                </div>

                <div className="saas-card p-5 bg-white border border-slate-200/50 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                        <Bell size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Alerts</span>
                        <h3 className={cn(
                            "text-2xl font-black mt-1",
                            stats?.criticalAlertsCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-800"
                        )}>
                            {stats?.criticalAlertsCount || 0}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Report Cards Grid */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-850 tracking-tight">Available WMS Report Sheets</h2>
                    <p className="text-xs text-slate-450 font-medium">Click to compile and download localized report configurations in multiple formats.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reportOptions.map((option) => {
                        const Icon = option.icon;
                        
                        return (
                            <div 
                                key={option.id} 
                                className="saas-card p-6 bg-white border border-slate-200/60 rounded-2xl flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className={cn("icon-container p-3 rounded-xl shrink-0", option.colorClass)}>
                                            <Icon size={20} className="stroke-[2.5]" />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                            {option.id.replace('-', ' ')}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">{option.label}</h3>
                                        <p className="text-xs text-slate-405 leading-relaxed font-medium">
                                            {option.desc}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-8 pt-5 border-t border-slate-100/80 space-y-3">
                                    {/* PDF preview / download buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAction(option.endpoint, 'preview', option.id, 'pdf')}
                                            disabled={actionLoading !== null}
                                            className="flex-1 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-[11px] border border-slate-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                        >
                                            <Eye size={12} />
                                            Preview PDF
                                        </button>
                                        <button
                                            onClick={() => handleAction(option.endpoint, 'download', option.id, 'pdf')}
                                            disabled={actionLoading !== null}
                                            className="flex-1 px-3 py-2.5 bg-slate-900 hover:opacity-95 disabled:bg-slate-200 text-white disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                                        >
                                            <Download size={12} />
                                            Get PDF
                                        </button>
                                    </div>

                                    {/* Excel / CSV exporter row */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAction(option.endpoint, 'download', option.id, 'excel')}
                                            disabled={actionLoading !== null}
                                            className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-650 rounded-xl font-bold text-[10px] border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                            title="Export to Microsoft Excel"
                                        >
                                            <FileSpreadsheet size={12} className="text-emerald-500" />
                                            Excel Report
                                        </button>
                                        <button
                                            onClick={() => handleAction(option.endpoint, 'download', option.id, 'csv')}
                                            disabled={actionLoading !== null}
                                            className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-650 rounded-xl font-bold text-[10px] border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                            title="Export to Comma Separated Values CSV"
                                        >
                                            <FileText size={12} className="text-blue-500" />
                                            CSV Sheet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Generated Reports & Stored PDF History downloads section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Generated Reports & Stored List */}
                <div className="lg:col-span-8 space-y-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Stored Report Archives</h3>
                        <p className="text-xs text-slate-450 font-medium">Browse, download, and manage older generated Excel/CSV/PDF reports stored on server disk.</p>
                    </div>

                    <div className="saas-card bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest">Report File Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-widest">File Size</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-widest">Generated Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-455 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loadingHistory ? (
                                        Array(3).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={4} className="px-6 py-5">
                                                    <div className="h-5 bg-slate-100 rounded w-full"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : reports.length > 0 ? (
                                        reports.map((report, idx) => {
                                            const lower = report.filename.toLowerCase();
                                            const isExcel = lower.endsWith('.xls');
                                            const isCSV = lower.endsWith('.csv');
                                            const isPDF = lower.endsWith('.pdf');

                                            return (
                                                <tr key={idx} className="group hover:bg-slate-50/20 transition-colors">
                                                    <td className="px-6 py-4.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                                                                isPDF ? "bg-rose-50 text-rose-500 border-rose-100" :
                                                                isExcel ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                "bg-blue-50 text-blue-500 border-blue-100"
                                                            )}>
                                                                {isPDF ? <FileText size={16} /> : <FileSpreadsheet size={16} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-800 text-xs truncate max-w-[280px]" title={report.filename}>
                                                                    {report.filename}
                                                                </p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                                                    {isPDF ? 'PDF Document' : isExcel ? 'Excel Sheet' : 'CSV Sheet'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4.5 font-bold text-xs text-slate-500">
                                                        {formatSize(report.size)}
                                                    </td>
                                                    <td className="px-6 py-4.5 text-xs font-bold text-slate-500 font-mono">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={12} className="text-slate-400" />
                                                            {formatDate(report.created_at)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4.5 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <a 
                                                                href={`http://localhost:5000/reports/${report.filename}`}
                                                                download
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2 bg-white border border-slate-200 hover:border-primary text-slate-600 hover:text-primary rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-xs font-bold"
                                                            >
                                                                <Download size={13} />
                                                                Download
                                                            </a>
                                                            <button
                                                                onClick={() => handleDeleteReport(report.filename)}
                                                                className="p-2 bg-red-50/10 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-450 hover:text-red-650 rounded-lg transition-colors flex items-center justify-center"
                                                                title="Delete from server disk"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                                    <FileText className="w-10 h-10 text-slate-200 stroke-[1.2]" />
                                                    <p className="text-xs font-semibold">No generated reports archived on the server yet.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Recent Reports List HUD Panel */}
                <div className="lg:col-span-4 space-y-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Recent Reports</h3>
                        <p className="text-xs text-slate-450 font-medium">Quick access list of the last generated templates.</p>
                    </div>

                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                        {reports.length > 0 ? (
                            <div className="space-y-3">
                                {reports.slice(0, 5).map((r, i) => {
                                    const lower = r.filename.toLowerCase();
                                    const isPDF = lower.endsWith('.pdf');
                                    
                                    return (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-2xl hover:bg-slate-100/40 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-xs",
                                                    isPDF ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                                                )}>
                                                    {isPDF ? 'PDF' : 'XLS'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{r.filename}</p>
                                                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">{formatDate(r.created_at)}</p>
                                                </div>
                                            </div>
                                            <a 
                                                href={`http://localhost:5000/reports/${r.filename}`}
                                                download
                                                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors"
                                                title="Quick download"
                                            >
                                                <Download size={12} />
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-12 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                                <FileCheck size={20} className="mb-1" />
                                <p className="text-xs font-bold">No reports yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
