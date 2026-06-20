import { useState, useEffect } from 'react';
import { 
    Search, Clipboard, Calendar, Box, MapPin, Clock, User as UserIcon, 
    ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, Bell, RefreshCw, 
    QrCode, HelpCircle, ChevronRight, FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import api from '../services/api';
import { cn } from '../lib/utils';

interface QRRecord {
    id: number;
    barcode_id: string;
    material_name: string;
    rack_code: string;
    quantity: number;
    status: 'Used' | 'Unused';
    qr_image_path: string;
    created_at: string;
}

interface TraceData {
    qrCode: {
        id: number;
        barcode_id: string;
        material_name: string;
        quantity: string | number;
        units: string | number;
        rack_code: string;
        status: 'used' | 'unused';
        scanned_at: string | null;
        scanned_by_name: string | null;
        created_at: string;
    };
    transactions: Array<{
        id: number;
        transaction_type: 'inward' | 'outward';
        quantity: string | number;
        created_at: string;
        user_name: string | null;
    }>;
}

const QRHistory = () => {
    const [qrList, setQrList] = useState<QRRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'used' | 'unused'>('all');
    const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
    const [traceData, setTraceData] = useState<TraceData | null>(null);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingTrace, setLoadingTrace] = useState(false);

    // Fetch QR List
    const fetchQrList = async () => {
        try {
            setLoadingList(true);
            const res = await api.getQrList({
                q: searchQuery,
                status: statusFilter === 'all' ? undefined : statusFilter,
                limit: 100 // Fetch a healthy set of records
            });
            if (res && res.data) {
                setQrList(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch QR list:', error);
        } finally {
            setLoadingList(false);
        }
    };

    // Fetch details when selected QR changes
    const fetchTraceDetails = async (barcodeId: string) => {
        try {
            setLoadingTrace(true);
            const res = await api.getQrTrace(barcodeId);
            if (res && res.data) {
                setTraceData(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch QR trace:', error);
            setTraceData(null);
        } finally {
            setLoadingTrace(false);
        }
    };

    useEffect(() => {
        fetchQrList();
    }, [statusFilter]);

    // Handle search input with manual trigger or Enter
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchQrList();
    };

    useEffect(() => {
        if (selectedBarcode) {
            fetchTraceDetails(selectedBarcode);
        } else {
            setTraceData(null);
        }
    }, [selectedBarcode]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-lg border border-blue-100">
                        <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QR Traceability Log</h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Lifecycle Tracking & Scanner Custody Chain</p>
                    </div>
                </div>
                <Button onClick={() => { fetchQrList(); if (selectedBarcode) fetchTraceDetails(selectedBarcode); }} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl">
                    <RefreshCw size={16} className="mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] items-stretch">
                {/* Left Pane: QR List & Search */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                    <Card className="border-none shadow-sm rounded-2xl flex-1 flex flex-col overflow-hidden bg-white/60 backdrop-blur-md">
                        <CardHeader className="p-5 border-b border-slate-50 bg-slate-50/20">
                            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-between">
                                <span>QR Code Registry</span>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{qrList.length} Total</span>
                            </CardTitle>
                        </CardHeader>
                        
                        {/* Search & Filters */}
                        <div className="p-5 border-b border-slate-50 space-y-3">
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Barcode ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all text-slate-900"
                                />
                                <button type="submit" className="hidden" />
                            </form>

                            {/* Status Filter Badges */}
                            <div className="flex gap-2">
                                {(['all', 'used', 'unused'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                                            statusFilter === status
                                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        {status === 'all' ? 'All' : status === 'used' ? 'Used' : 'Unused'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-50">
                            {loadingList ? (
                                <div className="p-8">
                                    <LoadingSpinner message="Querying QR registries..." />
                                </div>
                            ) : qrList.length > 0 ? (
                                qrList.map((qr) => (
                                    <div
                                        key={qr.id}
                                        onClick={() => setSelectedBarcode(qr.barcode_id)}
                                        className={cn(
                                            "p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50/50",
                                            selectedBarcode === qr.barcode_id ? "bg-blue-50/40 border-l-4 border-blue-500" : ""
                                        )}
                                    >
                                        <div className="min-w-0 flex-1 pr-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs text-slate-800">{qr.barcode_id}</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                                                    qr.status === 'Used'
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {qr.status}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 mt-1 truncate">{qr.material_name}</p>
                                            <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 mt-1">
                                                <span className="flex items-center gap-1"><MapPin size={10} /> {qr.rack_code}</span>
                                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(qr.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                                    </div>
                                ))
                            ) : (
                                <div className="p-8">
                                    <EmptyState
                                        icon={HelpCircle}
                                        title="No QR Codes Found"
                                        description="Try adjusting your filters or search query."
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Pane: Trace Details */}
                <div className="lg:col-span-7 flex flex-col">
                    {loadingTrace ? (
                        <Card className="border-none shadow-sm rounded-2xl flex-1 flex items-center justify-center p-8 bg-white/60 backdrop-blur-md">
                            <LoadingSpinner message="Tracing scanner chain of custody..." />
                        </Card>
                    ) : traceData ? (
                        <div className="space-y-6 flex-1 flex flex-col">
                            {/* Summary Card */}
                            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white/60 backdrop-blur-md">
                                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/20 flex flex-row items-center justify-between">
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                            <FileText size={10} />
                                            Traceability File
                                        </span>
                                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-3">
                                            {traceData.qrCode.material_name}
                                        </h2>
                                        <code className="text-xs font-mono font-bold text-slate-400 mt-1 block">{traceData.qrCode.barcode_id}</code>
                                    </div>
                                    <span className={cn(
                                        "px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border",
                                        traceData.qrCode.status === 'used'
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                                    )}>
                                        {traceData.qrCode.status.toUpperCase()}
                                    </span>
                                </CardHeader>

                                <CardContent className="p-6 space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-slate-50 border border-slate-150/40 p-4 rounded-xl">
                                             <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                                                  <MapPin size={14} />
                                                  <span className="text-[9px] font-black uppercase tracking-widest">Storage Rack</span>
                                             </div>
                                             <p className="text-sm font-black text-slate-800">
                                                  {traceData.qrCode.rack_code}
                                             </p>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-150/40 p-4 rounded-xl">
                                             <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                                                  <Calendar size={14} />
                                                  <span className="text-[9px] font-black uppercase tracking-widest">Generated On</span>
                                             </div>
                                             <p className="text-sm font-bold text-slate-800">
                                                  {new Date(traceData.qrCode.created_at).toLocaleDateString()}
                                             </p>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-150/40 p-4 rounded-xl">
                                             <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                                                  <Box size={14} />
                                                  <span className="text-[9px] font-black uppercase tracking-widest">Weight/Units</span>
                                             </div>
                                             <p className="text-sm font-black text-slate-800">
                                                  {traceData.qrCode.units} KG
                                             </p>
                                        </div>
                                    </div>

                                    {/* Scan Details Custody Panel */}
                                    <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Clock size={14} className="text-primary" />
                                            Scanning Details
                                        </h3>
                                        <div className="space-y-4 text-xs font-bold text-slate-600">
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span>Scan Timestamp</span>
                                                <span className="font-semibold text-slate-800">
                                                    {traceData.qrCode.scanned_at 
                                                        ? new Date(traceData.qrCode.scanned_at).toLocaleString() 
                                                        : 'Pending Inward Scan'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span>Scanned By</span>
                                                <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                                                    <UserIcon size={12} className="text-slate-400" />
                                                    {traceData.qrCode.scanned_by_name || 'N/A (Not Scanned)'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Transaction History Timeline */}
                            <Card className="border-none shadow-sm rounded-2xl flex-1 flex flex-col overflow-hidden bg-white/60 backdrop-blur-md">
                                <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/20">
                                    <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowRightLeft size={14} className="text-primary" />
                                        Ledger Transaction History
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 overflow-y-auto max-h-[300px]">
                                    {traceData.transactions.length > 0 ? (
                                        <div className="relative border-l border-slate-150 pl-6 ml-3 space-y-6 py-2">
                                            {traceData.transactions.map((tx) => (
                                                <div key={tx.id} className="relative">
                                                    {/* Dot */}
                                                    <span className={cn(
                                                        "absolute -left-[31px] top-1.5 p-1 rounded-full border bg-white flex items-center justify-center shadow-sm",
                                                        tx.transaction_type === 'inward' 
                                                            ? "text-emerald-500 border-emerald-200" 
                                                            : "text-rose-500 border-rose-200"
                                                    )}>
                                                        {tx.transaction_type === 'inward' 
                                                            ? <ArrowDownCircle size={12} /> 
                                                            : <ArrowUpCircle size={12} />}
                                                    </span>

                                                    {/* Content */}
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                                                                    tx.transaction_type === 'inward' 
                                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                                        : "bg-rose-50 text-rose-600 border-rose-100"
                                                                )}>
                                                                    {tx.transaction_type}
                                                                </span>
                                                                <span className="font-extrabold text-slate-800 text-xs">
                                                                    {tx.transaction_type === 'inward' ? '+' : '-'}{tx.quantity} KG
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                                                                <Clock size={10} />
                                                                {new Date(tx.created_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-500">
                                                            <UserIcon size={10} className="text-slate-400" />
                                                            {tx.user_name || 'System'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={HelpCircle}
                                            title="No Transactions Logged"
                                            description="This material has not undergone any inward or outward stock updates."
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="border-none shadow-sm rounded-2xl flex-1 flex items-center justify-center p-8 bg-white/60 backdrop-blur-md">
                            <EmptyState
                                icon={Clipboard}
                                title="No QR Code Selected"
                                description="Select a QR code from the registry list to load its end-to-end trace log and custodian chain."
                            />
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRHistory;
