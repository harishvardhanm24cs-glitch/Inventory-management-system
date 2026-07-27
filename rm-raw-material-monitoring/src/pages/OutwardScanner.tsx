import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    Camera, 
    CheckCircle2, 
    AlertTriangle, 
    RefreshCw, 
    ArrowLeft, 
    ShieldAlert, 
    Package, 
    Database, 
    Tag, 
    Layers,
    Play,
    Pause,
    History,
    FileText,
    Loader2,
    ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';
import { useContinuousScanner } from '../hooks/useContinuousScanner';

interface OutwardHistoryItem {
    barcode_id: string;
    material_name: string;
    quantity: number;
    unit: string;
    rack_code: string;
    timestamp: string;
}

const OutwardScanner: React.FC = () => {
    const [lastDispatched, setLastDispatched] = useState<OutwardHistoryItem | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [outwardHistory, setOutwardHistory] = useState<OutwardHistoryItem[]>([]);

    const { refreshData, materials } = useInventory();

    const [isProcessing, setIsProcessing] = useState(false);

    // Core continuous scan handler passed to the custom hook
    const handleOutwardScan = useCallback(async (text: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setLastError(null);

        try {
            let barcodeId = text;

            // Attempt to parse JSON format if applicable
            try {
                const parsed = JSON.parse(text);
                barcodeId = parsed.barcode_id || parsed.sku_id || parsed.barcode || text;
            } catch (e) {
                // Not JSON, use raw text
            }

            if (!barcodeId) {
                throw new Error("Invalid barcode: Barcode ID is empty.");
            }

            // 1. Trace QR code status from registry
            let qrCode: any = null;
            let matchedMaterial = materials.find(m => m.barcode === barcodeId);

            try {
                const traceRes = await api.getQrTrace(barcodeId);
                if (traceRes && traceRes.data && traceRes.data.qrCode) {
                    qrCode = traceRes.data.qrCode;
                    if (qrCode.status === 'unused') {
                        throw new Error(`Barcode ${barcodeId} cannot be outwarded because it has not been inwarded yet.`);
                    }
                }
            } catch (err: any) {
                if (err.message && err.message.includes("unused")) {
                    throw err;
                }
                console.warn("[Outward Scanner] Trace API unavailable fallback:", err.message);
            }

            if (!matchedMaterial && qrCode) {
                matchedMaterial = materials.find(m => m.name.toLowerCase() === qrCode.material_name.toLowerCase());
            }

            const materialName = qrCode ? qrCode.material_name : (matchedMaterial ? matchedMaterial.name : 'Paint Material');
            const rackCode = qrCode ? (qrCode.rack_code || 'Not Assigned') : 'Not Assigned';
            const unitStr = matchedMaterial ? matchedMaterial.unit : 'KG';
            const qtyOutward = qrCode ? (parseFloat(qrCode.units) || 1.0) : (matchedMaterial ? matchedMaterial.stock : 1.0);

            // 2. Execute existing outwardScan backend API
            const res = await api.outwardScan({
                barcode_id: barcodeId
            });

            if (res && res.success) {
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const historyItem: OutwardHistoryItem = {
                    barcode_id: barcodeId,
                    material_name: materialName,
                    quantity: qtyOutward,
                    unit: unitStr,
                    rack_code: rackCode,
                    timestamp: timeStr
                };

                setLastDispatched(historyItem);
                setOutwardHistory(prev => [historyItem, ...prev]);

                // Display success toast
                toast.success(`Outward Scan Successful: Dispatched ${qtyOutward} ${unitStr} of ${materialName}`);

                // Refresh global inventory and rack data
                await refreshData();

                // Dispatch layout update custom events with targeted rack payload
                window.dispatchEvent(new CustomEvent('rack-inventory-update', {
                    detail: { rackCode: rackCode !== 'Not Assigned' ? rackCode : null }
                }));
                if (typeof (window as any).refreshDigitalTwin === 'function') {
                    (window as any).refreshDigitalTwin();
                }
            } else {
                throw new Error(res?.message || "Outward dispatch request failed.");
            }

        } catch (err: any) {
            console.error('[Outward Scanner Error]:', err);
            const errText = err.message || "Outward scan verification failed.";
            setLastError(errText);
            toast.error(errText);
        } finally {
            setIsProcessing(false);
        }
    }, [materials, refreshData, isProcessing]);

    // Instantiate continuous scanner hook
    const {
        videoRef,
        canvasRef,
        status,
        errorMessage,
        isPaused,
        scanCount,
        lastScannedCode,
        togglePause,
        resetScanner
    } = useContinuousScanner({
        onScan: handleOutwardScan,
        cooldownMs: 2500
    });

    return (
        <div className="min-h-screen bg-[#F4F7FB] flex flex-col animate-fade-in text-slate-900 pb-20">
            {/* Top Navigation Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <Link to="/" className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 group transition-all">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">Outward Dispatch Hub</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-[0.2em]">Automated Egress Dispatch Scanner</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-all duration-300",
                        status === 'scanning' && "bg-blue-50 text-blue-600 border-blue-100",
                        status === 'processing' && "bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse",
                        status === 'paused' && "bg-amber-50 text-amber-600 border-amber-100",
                        status === 'error' && "bg-amber-50 text-amber-600 border-amber-100",
                        status === 'permission_denied' && "bg-rose-50 text-rose-600 border-rose-100",
                        status === 'connecting' && "bg-slate-50 text-slate-600 border-slate-100 animate-pulse"
                    )}>
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            status === 'scanning' && "bg-blue-500 animate-ping",
                            status === 'processing' && "bg-indigo-500 animate-ping",
                            status === 'paused' && "bg-amber-500",
                            status === 'error' && "bg-amber-500",
                            status === 'permission_denied' && "bg-rose-500",
                            status === 'connecting' && "bg-slate-500"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isPaused ? "SCANNER PAUSED" : status === 'processing' ? "DISPATCHING INVENTORY" : `${status.toUpperCase()} MODE`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Scanner Feed Column */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="saas-card overflow-hidden bg-slate-950 border-slate-800 text-white relative shadow-2xl rounded-3xl">
                            {/* Live Lens Overlay */}
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
                                <Camera size={14} className="text-[#4F8CFF] animate-pulse" />
                                <span className="text-[9px] font-extrabold tracking-widest uppercase">LIVE OUTWARD DISPATCH STREAM</span>
                            </div>

                            {/* Camera Actions */}
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <button
                                    onClick={togglePause}
                                    className="p-2 bg-black/60 hover:bg-white/10 rounded-lg text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
                                    title={isPaused ? "Resume Scanner" : "Pause Scanner"}
                                >
                                    {isPaused ? <Play size={14} className="text-emerald-400" /> : <Pause size={14} />}
                                </button>
                                <button
                                    onClick={resetScanner}
                                    className="p-2 bg-black/60 hover:bg-white/10 rounded-lg text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
                                    title="Reset Scanner Cooldown"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>

                            {/* Viewport Frame */}
                            <div className="relative aspect-square md:aspect-video w-full flex items-center justify-center bg-slate-900">
                                {status === 'permission_denied' ? (
                                    <div className="p-8 text-center max-w-sm space-y-4">
                                        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500">
                                            <ShieldAlert size={28} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-wider text-rose-400">Camera Access Required</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                            {errorMessage || 'Please click the lock icon in your browser address bar and grant camera permissions.'}
                                        </p>
                                    </div>
                                ) : isPaused ? (
                                    <div className="p-8 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                            <Pause size={28} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-wider text-slate-300">Scanner Paused</h3>
                                        <p className="text-xs text-slate-500">Click play button to restart live scanning loop.</p>
                                    </div>
                                ) : (
                                    <div className="w-full h-full relative overflow-hidden">
                                        <video
                                            ref={videoRef}
                                            playsInline
                                            muted
                                            className={cn(
                                                "w-full h-full object-cover transition-transform duration-[2000ms] ease-out",
                                                status === 'scanning' ? "scale-100" : "scale-105 opacity-50 blur-sm"
                                            )}
                                        />
                                        <canvas ref={canvasRef} className="hidden" />

                                        {/* Target Brackets */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                            <div className="w-48 h-48 md:w-60 md:h-60 relative border border-white/10 bg-black/10">
                                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#4F8CFF]" />
                                                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#4F8CFF]/70 shadow-[0_0_10px_#4F8CFF] animate-[sweep_2.5s_linear_infinite]" />
                                            </div>
                                        </div>

                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 text-[10px] tracking-wider font-bold uppercase text-slate-300 z-10 text-center whitespace-nowrap">
                                            Continuous Outward Scan Active
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scanner Session Stats */}
                        <div className="saas-card p-6 grid grid-cols-3 gap-4 rounded-3xl">
                            <div className="text-center border-r border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Dispatches</p>
                                <p className="text-xl font-black text-slate-900">{scanCount}</p>
                            </div>
                            <div className="text-center border-r border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Barcode</p>
                                <p className="text-xs font-black text-slate-900 truncate max-w-[120px] mx-auto" title={lastScannedCode || 'None'}>
                                    {lastScannedCode ? lastScannedCode.substring(0, 15) : 'None'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Engine Mode</p>
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                                    Continuous
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Verification & Details Column */}
                    <div className="lg:col-span-6 space-y-6">
                        
                        {status === 'processing' && (
                            <div className="saas-card p-8 border-[#4F8CFF]/20 bg-gradient-to-br from-white to-blue-50/20 animate-[slideUp_0.4s_ease-out_forwards] rounded-3xl shadow-lg">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#4F8CFF] animate-spin">
                                        <Loader2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Processing Dispatch...</h3>
                                        <p className="text-[9px] text-[#4F8CFF] font-bold uppercase tracking-wider">Tracing QR & Decrementing Inventory</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {lastDispatched ? (
                            <div className="saas-card p-8 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 animate-[slideUp_0.4s_ease-out_forwards] rounded-3xl">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-base">Outward Scan Successful</h3>
                                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Inventory & Rack Updated</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-[9px] font-black uppercase tracking-wider">
                                        Auto-Resumed
                                    </span>
                                </div>

                                {/* Metadata Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Package size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Material Name</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{lastDispatched.material_name}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Tag size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Barcode ID</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate uppercase">{lastDispatched.barcode_id}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Layers size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Source Storage Rack</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 uppercase">Rack {lastDispatched.rack_code}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Database size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dispatched Quantity</p>
                                            <p className="text-sm font-extrabold text-rose-600 mt-1 truncate">
                                                -{lastDispatched.quantity} {lastDispatched.unit}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : lastError ? (
                            <div className="saas-card p-8 border-amber-100 bg-gradient-to-br from-white to-amber-50/20 rounded-3xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Outward Validation Notice</h3>
                                        <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Continuous Scan Retrying</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-650 font-bold leading-relaxed bg-white/50 border border-amber-100/50 p-4 rounded-xl">
                                    {lastError}
                                </p>
                            </div>
                        ) : (
                            <div className="saas-card p-10 text-center flex flex-col items-center justify-center min-h-[300px] border-dashed border-slate-200 rounded-3xl">
                                <div className="w-16 h-16 bg-blue-50 text-[#4F8CFF] rounded-full flex items-center justify-center mb-4 border border-blue-100 animate-pulse">
                                    <Camera size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-2">Live Continuous Outward Camera Active</h3>
                                <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
                                    Align outbound barcodes inside the live frame to automatically process dispatch and update inventory.
                                </p>
                            </div>
                        )}

                        {/* Recent Outward session logs */}
                        <div className="saas-card p-6 rounded-3xl">
                            <div className="flex items-center gap-3 mb-6">
                                <History size={16} className="text-slate-400" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Outward Session Feed</h3>
                            </div>
                            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                                {outwardHistory.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-rose-50/10 border border-rose-100/30 rounded-xl hover:border-rose-200 transition-all">
                                        <div className="min-w-0">
                                            <p className="text-xs font-extrabold text-slate-800 truncate">{item.material_name}</p>
                                            <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider mt-0.5">
                                                Barcode: {item.barcode_id} • Rack: {item.rack_code}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-rose-600">-{item.quantity} {item.unit}</p>
                                            <p className="text-[8px] text-slate-400 font-bold mt-0.5">{item.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                                {outwardHistory.length === 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center py-6">
                                        No dispatches processed in this session yet
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Injected Animations */}
            <style>{`
                @keyframes sweep {
                    0% { top: 0%; opacity: 0.1; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0.1; }
                }
            `}</style>
        </div>
    );
};

export default OutwardScanner;
