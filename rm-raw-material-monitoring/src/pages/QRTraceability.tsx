import React, { useState, useEffect } from 'react';
import {
    Search,
    Clock,
    Download,
    QrCode,
    CheckCircle,
    ArrowRight,
    MapPin,
    User,
    AlertTriangle,
    Calendar,
    Tag,
    Inbox,
    HelpCircle,
    PlayCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../services/api';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface HistoryLog {
    id: number;
    barcode_id: string;
    material_name: string;
    action: 'GENERATED' | 'SCANNED' | 'INWARD' | 'OUTWARD' | 'MOVED' | 'USED';
    rack_code: string | null;
    user_name: string;
    remarks: string | null;
    created_at: string;
}

const actionColors: Record<string, string> = {
    GENERATED: 'text-blue-600 bg-blue-50 border border-blue-200',
    SCANNED: 'text-indigo-600 bg-indigo-50 border border-indigo-200',
    INWARD: 'text-emerald-600 bg-emerald-50 border border-emerald-200',
    OUTWARD: 'text-amber-600 bg-amber-50 border border-amber-200',
    MOVED: 'text-purple-600 bg-purple-50 border border-purple-200',
    USED: 'text-rose-600 bg-rose-50 border border-rose-200'
};

const QRTraceability: React.FC = () => {
    const [allLogs, setAllLogs] = useState<HistoryLog[]>([]);
    const [barcodeQuery, setBarcodeQuery] = useState<string>('');
    const [searchedBarcode, setSearchedBarcode] = useState<string | null>(null);
    const [barcodeLogs, setBarcodeLogs] = useState<HistoryLog[]>([]);
    const [qrCodeData, setQrCodeData] = useState<any | null>(null);
    const [materialDetails, setMaterialDetails] = useState<any | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterRange, setFilterRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

    // Fetch initial log registry
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.getQrHistoryList({ limit: 200 });
            if (res && res.data) {
                setAllLogs(res.data);
                setError(null);
            } else if (Array.isArray(res)) {
                setAllLogs(res);
                setError(null);
            }
        } catch (err: any) {
            console.error("Failed to load QR history:", err);
            setError(err.message || "Failed to retrieve QR history log registry");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Handles barcode specific lifecycle timeline query
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcodeQuery.trim()) {
            setSearchedBarcode(null);
            setBarcodeLogs([]);
            setQrCodeData(null);
            setMaterialDetails(null);
            setTransactions([]);
            return;
        }

        setSearching(true);
        const queryVal = barcodeQuery.trim().toUpperCase();
        try {
            const [historyRes, traceRes] = await Promise.all([
                api.getQrBarcodeHistory(queryVal),
                api.getQrTrace(queryVal)
            ]);

            if (historyRes && historyRes.data) {
                setBarcodeLogs(historyRes.data);
            } else {
                setBarcodeLogs([]);
            }

            if (traceRes && traceRes.data) {
                setQrCodeData(traceRes.data.qrCode);
                setMaterialDetails(traceRes.data.materialDetails);
                setTransactions(traceRes.data.transactions);
                setSearchedBarcode(queryVal);
                toast.success(`Lifecycle parsed for ${queryVal}`);
            } else {
                setQrCodeData(null);
                setMaterialDetails(null);
                setTransactions([]);
                setSearchedBarcode(queryVal);
            }
        } catch (err: any) {
            console.error("Trace search failed:", err);
            setBarcodeLogs([]);
            setQrCodeData(null);
            setMaterialDetails(null);
            setTransactions([]);
            setSearchedBarcode(null);
            toast.error(err.response?.data?.message || err.message || `Failed to trace barcode ${queryVal}`);
        } finally {
            setSearching(false);
        }
    };

    const handleClearSearch = () => {
        setBarcodeQuery('');
        setSearchedBarcode(null);
        setBarcodeLogs([]);
        setQrCodeData(null);
        setMaterialDetails(null);
        setTransactions([]);
    };

    // Filter logic
    const filterLogs = (logs: HistoryLog[]) => {
        const now = new Date();
        return logs.filter(log => {
            const logDate = new Date(log.created_at);
            if (filterRange === 'today') {
                return logDate.toDateString() === now.toDateString();
            } else if (filterRange === 'week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                return logDate >= oneWeekAgo;
            } else if (filterRange === 'month') {
                return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    };

    const activeLogs = searchedBarcode ? barcodeLogs : allLogs;
    const filteredLogs = filterLogs(activeLogs);

    const getTimelineStages = () => {
        if (!qrCodeData) return [];

        // 1. Generated
        const genLog = barcodeLogs.find(l => l.action === 'GENERATED');
        const genTime = genLog ? genLog.created_at : qrCodeData.created_at;

        // 2. Inward Scanned
        const scanLog = barcodeLogs.find(l => l.action === 'SCANNED');
        const isInwardScanned = !!scanLog;
        const scanTime = scanLog ? scanLog.created_at : null;

        // 3. Stored in {rack_code}
        const inwardLog = barcodeLogs.find(l => l.action === 'INWARD');
        const isStored = !!inwardLog;
        const storedTime = inwardLog ? inwardLog.created_at : null;
        const assignedRackCode = inwardLog?.rack_code || qrCodeData.rack_code || 'Not Assigned';

        // 4. Outward Scanned
        const outwardLog = barcodeLogs.find(l => l.action === 'OUTWARD');
        const isOutwardScanned = !!outwardLog;
        const outwardTime = outwardLog ? outwardLog.created_at : null;

        // 5. Dispatched
        const dispatchedLog = barcodeLogs.find(l => l.action === 'OUTWARD' || l.action === 'USED');
        const isDispatched = !!dispatchedLog;
        const dispatchedTime = dispatchedLog ? dispatchedLog.created_at : null;

        return [
            {
                title: 'Generated',
                subtitle: 'Registered',
                completed: true,
                timestamp: genTime,
                icon: QrCode,
                color: 'text-blue-500 bg-blue-50 border-blue-500 shadow-blue-100'
            },
            {
                title: 'Inward Scanned',
                subtitle: isInwardScanned ? 'Ingress Scan Completed' : 'Pending Ingress Scan',
                completed: isInwardScanned,
                timestamp: scanTime,
                icon: Inbox,
                color: isInwardScanned ? 'text-indigo-600 bg-indigo-50 border-indigo-500 shadow-indigo-100' : 'text-slate-300 bg-slate-50 border-slate-100'
            },
            {
                title: `Stored in ${assignedRackCode && assignedRackCode !== 'Not Assigned' ? assignedRackCode : 'Rack'}`,
                subtitle: isStored && assignedRackCode !== 'Not Assigned' ? `Stored at ${assignedRackCode}` : 'Pending Storage',
                completed: isStored && assignedRackCode !== 'Not Assigned',
                timestamp: storedTime,
                icon: MapPin,
                color: isStored && assignedRackCode !== 'Not Assigned' ? 'text-purple-600 bg-purple-50 border-purple-500 shadow-purple-100' : 'text-slate-300 bg-slate-50 border-slate-100'
            },
            {
                title: 'Outward Scanned',
                subtitle: isOutwardScanned ? 'Outgress Scan Completed' : 'Pending Outgress Scan',
                completed: isOutwardScanned,
                timestamp: outwardTime,
                icon: Clock,
                color: isOutwardScanned ? 'text-amber-600 bg-amber-50 border-amber-500 shadow-amber-100' : 'text-slate-300 bg-slate-50 border-slate-100'
            },
            {
                title: 'Dispatched',
                subtitle: isDispatched ? 'Dispatched from Facility' : 'Pending Dispatch',
                completed: isDispatched,
                timestamp: dispatchedTime,
                icon: CheckCircle,
                color: isDispatched ? 'text-emerald-600 bg-emerald-50 border-emerald-500 shadow-emerald-100' : 'text-slate-300 bg-slate-50 border-slate-100'
            }
        ];
    };

    // CSV Exporter
    const handleExportCSV = () => {
        if (searchedBarcode && qrCodeData) {
            const summaryHeaders = ["Barcode ID", "Material Name", "Batch Number", "Quantity", "Unit", "Current Status", "Assigned Rack", "Registered Date"];
            const summaryRow = [
                qrCodeData.barcode_id,
                qrCodeData.material_name,
                qrCodeData.batch_number || 'N/A',
                qrCodeData.units ? parseFloat(qrCodeData.units).toFixed(2) : '0.00',
                materialDetails?.unit || 'KG',
                qrCodeData.status === 'unused' ? 'Unused' : 'Used',
                qrCodeData.rack_code || 'Not Assigned',
                new Date(qrCodeData.created_at).toLocaleString()
            ];

            const movementHeaders = ["Log ID", "Action", "Storage Rack", "Operator", "Remarks", "Timestamp"];
            const movementRows = barcodeLogs.map(log => [
                log.id,
                log.action,
                log.rack_code || 'Unassigned',
                log.user_name,
                log.remarks || '',
                new Date(log.created_at).toLocaleString()
            ]);

            const csvRows = [
                ["BARCODE TRACE SUMMARY REPORT"],
                [],
                summaryHeaders,
                summaryRow.map(val => `"${String(val).replace(/"/g, '""')}"`),
                [],
                ["MOVEMENT & TIMELINE HISTORY LOGS"],
                [],
                movementHeaders,
                ...movementRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`))
            ];

            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                + csvRows.map(row => row.join(",")).join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Paint_RM_Barcode_Trace_${searchedBarcode}_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Trace report for ${searchedBarcode} exported successfully!`);
        } else {
            if (filteredLogs.length === 0) {
                toast.error("No logs available to export in this range.");
                return;
            }

            const headers = ["Log ID", "Barcode ID", "Material Name", "Action", "Storage Rack", "Operator", "Remarks", "Timestamp"];
            const rows = filteredLogs.map(log => [
                log.id,
                log.barcode_id,
                log.material_name,
                log.action,
                log.rack_code || 'Unassigned',
                log.user_name,
                log.remarks || '',
                new Date(log.created_at).toLocaleString()
            ]);

            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                + [headers.join(","), ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Paint_RM_QR_Trace_Report_All_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV file exported successfully!");
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <LoadingSpinner message="Retrieving barcode traceability ledger..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-[70vh] items-center justify-center p-6 text-center animate-saas-fade">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 mb-4">
                    <AlertTriangle size={36} className="stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Ledger Connection Failed</h3>
                <p className="text-sm text-slate-405 mt-1 max-w-md">{error}</p>
                <Button onClick={fetchLogs} className="mt-6 saas-button">
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-saas-fade">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <QrCode className="text-[#4F8CFF]" />
                        QR Traceability & History
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Audit trail and complete lifecycle tracking of RM containers</p>
                </div>
                <Button onClick={handleExportCSV} className="saas-button bg-[#4F8CFF] hover:bg-[#3B82F6]">
                    <Download size={16} />
                    Export CSV
                </Button>
            </header>

            {/* Search Box Card */}
            <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardContent className="p-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Enter Barcode ID to trace (e.g. PI020)..."
                                value={barcodeQuery}
                                onChange={(e) => setBarcodeQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-sm focus:ring-2 focus:ring-[#4F8CFF]/20 focus:border-[#4F8CFF] transition-all text-slate-900"
                            />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={searching} 
                            className="bg-[#4F8CFF] hover:bg-[#3B82F6] text-white px-6 rounded-2xl font-bold text-sm"
                        >
                            {searching ? "Tracing..." : "Trace Barcode"}
                        </Button>
                        {searchedBarcode && (
                            <Button 
                                type="button" 
                                onClick={handleClearSearch} 
                                variant="ghost" 
                                className="border border-slate-200 text-slate-500 rounded-2xl font-bold text-sm"
                            >
                                Clear Trace
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Visual Lifecycle Timeline (Visible when barcode is searched) */}
                {searchedBarcode && qrCodeData && (
                    <>
                        <Card className="lg:col-span-12 border-none shadow-md rounded-3xl bg-white overflow-hidden animate-saas-fade">
                            <CardHeader className="p-6 border-b border-slate-50">
                                <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Tag size={16} className="text-[#4F8CFF]" />
                                    Visual Trace Timeline: {searchedBarcode}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                {(() => {
                                    const stages = getTimelineStages();
                                    return (
                                        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 relative">
                                            {/* Timeline connectors */}
                                            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-slate-100 z-0" />
                                            
                                            {stages.map((stage, idx) => {
                                                const IconComponent = stage.icon;
                                                return (
                                                    <div key={idx} className="flex flex-col items-center text-center z-10 md:w-[18%]">
                                                        <div className={cn(
                                                            "w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-300",
                                                            stage.completed ? "bg-white border-2 border-solid shadow-lg" : "bg-slate-50 border-slate-100 text-slate-300",
                                                            stage.completed ? stage.color : "text-slate-300 border-slate-100"
                                                        )}>
                                                            <IconComponent size={30} className={cn(stage.title === 'Generated' && stage.completed && "animate-pulse")} />
                                                        </div>
                                                        <h4 className="text-xs font-bold text-slate-800 mt-4">{idx + 1}. {stage.title}</h4>
                                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                                            {stage.timestamp ? new Date(stage.timestamp).toLocaleString() : 'Pending'}
                                                        </p>
                                                        <p className={cn(
                                                            "text-[10px] font-bold mt-1 uppercase tracking-wide",
                                                            stage.completed ? "text-primary" : "text-slate-400"
                                                        )}>
                                                            {stage.subtitle}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>

                        {/* Material Details Panel */}
                        <div className="lg:col-span-5 animate-saas-fade">
                            <Card className="border border-slate-100 shadow-md rounded-3xl bg-white overflow-hidden h-full">
                                <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                                    <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <QrCode size={16} className="text-[#4F8CFF]" />
                                        Material Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Material Name</span>
                                        <span className="text-sm font-bold text-slate-800">{qrCodeData.material_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Barcode ID</span>
                                        <span className="text-sm font-mono font-black text-slate-800">{qrCodeData.barcode_id}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Batch Number</span>
                                        <span className="text-sm font-bold text-slate-800">{qrCodeData.batch_number || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Container Qty</span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {qrCodeData.units ? parseFloat(qrCodeData.units).toFixed(2) : '0.00'} {materialDetails?.unit || 'KG'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Stock</span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {materialDetails ? `${parseFloat(materialDetails.current_stock).toFixed(2)} ${materialDetails.unit}` : '0.00 KG'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Status</span>
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            qrCodeData.status === 'unused' 
                                                ? "text-blue-600 bg-blue-50 border border-blue-100" 
                                                : "text-rose-600 bg-rose-50 border border-rose-100"
                                        )}>
                                            {qrCodeData.status === 'unused' ? 'Unused' : 'Used'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Assigned Rack</span>
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
                                            <MapPin size={12} className="text-[#4F8CFF]" />
                                            {qrCodeData.rack_code || 'Not Assigned'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Rack History Panel */}
                        <div className="lg:col-span-7 animate-saas-fade">
                            <Card className="border border-slate-100 shadow-md rounded-3xl bg-white overflow-hidden h-full">
                                <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                                    <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={16} className="text-[#4F8CFF]" />
                                        Rack History & Movement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {(() => {
                                        const rackHistoryLogs = barcodeLogs.filter(l => l.rack_code || l.action === 'INWARD' || l.action === 'MOVED' || l.action === 'OUTWARD');
                                        return rackHistoryLogs.length > 0 ? (
                                            <div className="relative border-l border-slate-100 ml-4 space-y-6 py-2">
                                                {rackHistoryLogs.map((log) => (
                                                    <div key={log.id} className="relative pl-6">
                                                        <span className={cn(
                                                            "absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                                                            log.action === 'INWARD' ? "bg-emerald-500" :
                                                            log.action === 'MOVED' ? "bg-purple-500" :
                                                            log.action === 'OUTWARD' ? "bg-rose-500" : "bg-blue-500"
                                                        )} />
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                            <div>
                                                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                                                    {log.action === 'INWARD' ? 'Inwarded to Rack' :
                                                                     log.action === 'MOVED' ? 'Moved to Rack' :
                                                                     log.action === 'OUTWARD' ? 'Outwarded' : log.action}
                                                                </span>
                                                                {log.rack_code && (
                                                                    <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                                                                        {log.rack_code}
                                                                    </span>
                                                                )}
                                                                <p className="text-xs text-slate-500 mt-1 font-medium">{log.remarks || 'No remarks provided'}</p>
                                                                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-semibold">
                                                                    <User size={10} />
                                                                    <span>Operator: {log.user_name}</span>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap self-start sm:self-auto">
                                                                {new Date(log.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                No rack assignments recorded
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                {/* Audit Logs Table */}
                <div className="lg:col-span-12 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex gap-2 bg-slate-100/80 border border-slate-200/50 p-1.5 rounded-2xl self-start">
                            <button
                                onClick={() => setFilterRange('all')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                    filterRange === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                All Records
                            </button>
                            <button
                                onClick={() => setFilterRange('today')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                    filterRange === 'today' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setFilterRange('week')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                    filterRange === 'week' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setFilterRange('month')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                    filterRange === 'month' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                This Month
                            </button>
                        </div>
                    </div>

                    <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="saas-table">
                                <thead>
                                    <tr>
                                        <th>Barcode ID</th>
                                        <th>Material Name</th>
                                        <th>Action</th>
                                        <th>Storage Rack</th>
                                        <th>Operator</th>
                                        <th>Remarks</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => (
                                            <tr key={log.id} className="group">
                                                <td className="font-mono font-black text-slate-800 text-xs">
                                                    {log.barcode_id}
                                                </td>
                                                <td className="font-bold text-slate-700">
                                                    {log.material_name}
                                                </td>
                                                <td>
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                        actionColors[log.action]
                                                    )}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                                                        <MapPin size={10} className="text-primary" />
                                                        {log.rack_code || 'Unassigned'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                        <User size={10} className="text-slate-400" />
                                                        {log.user_name}
                                                    </span>
                                                </td>
                                                <td className="text-slate-405 font-medium text-xs max-w-xs truncate">
                                                    {log.remarks || 'N/A'}
                                                </td>
                                                <td className="text-[10px] text-slate-400 font-bold">
                                                    {new Date(log.created_at).toLocaleString('en-US', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short'
                                                    })}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <HelpCircle size={28} className="stroke-[2] text-slate-300" />
                                                    <p className="text-xs font-bold uppercase tracking-wider mt-2">
                                                        No history trace found
                                                    </p>
                                                    <p className="text-[10px] text-slate-405 font-bold italic mt-0.5">
                                                        {searchedBarcode 
                                                            ? `No event logs recorded for Barcode: ${searchedBarcode}` 
                                                            : "Initiate actions or generate QRs to compile logs"}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default QRTraceability;
