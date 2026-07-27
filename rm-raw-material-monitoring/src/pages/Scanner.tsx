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
    Calendar, 
    Layers,
    Play,
    Pause,
    History,
    FileText,
    Loader2,
    Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';
import { useContinuousScanner } from '../hooks/useContinuousScanner';

interface ScannedData {
    material_name?: string;
    weight?: string | number;
    batch_number?: string;
    manufacturing_date?: string;
    rack_code?: string;
    barcode_id?: string;
    timestamp?: string;
}

const Scanner: React.FC = () => {
    const [scannedData, setScannedData] = useState<ScannedData | null>(null);
    const [rawText, setRawText] = useState<string>('');
    const [lastError, setLastError] = useState<string | null>(null);
    const [scanHistory, setScanHistory] = useState<ScannedData[]>([]);
    const { refreshData, materials, racks } = useInventory();

    const [isProcessing, setIsProcessing] = useState(false);

    // Core continuous scan handler passed to the custom hook
    const handleScanDetected = useCallback(async (text: string) => {
        if (isProcessing) return; // FIX 5: Request Queue Lock - Ignore simultaneous scan triggers
        setIsProcessing(true);
        setRawText(text);
        setLastError(null);

        try {
            let material_name = '';
            let weight: number | string = 1.0;
            let batch_number = 'N/A';
            let manufacturing_date = 'N/A';
            let rack_code: string | null = null;
            let barcode_id = text;

            // Attempt to parse JSON structure from scanned barcode
            try {
                const parsed = JSON.parse(text);
                material_name = parsed.material_name || parsed.paint_name || '';
                weight = parsed.weight !== undefined ? parsed.weight : (parsed.quantity || parsed.stock || 1.0);
                batch_number = parsed.batch_number || parsed.batch || 'N/A';
                manufacturing_date = parsed.manufacturing_date || parsed.manufacture_date || 'N/A';
                rack_code = parsed.rack_code || parsed.location || null;
                barcode_id = parsed.barcode_id || parsed.sku_id || parsed.barcode || text;
            } catch (e) {
                // Raw text barcode fallback lookup
                barcode_id = text;
                const matchedMat = materials.find(m => m.barcode === barcode_id);
                if (matchedMat) {
                    material_name = matchedMat.name;
                    weight = matchedMat.weight || 1.0;
                    batch_number = matchedMat.batchNumber || 'N/A';
                }
            }

            if (!barcode_id) {
                throw new Error("Invalid barcode: Barcode ID is empty.");
            }

            // Fallback material name if missing
            if (!material_name) {
                material_name = `Material ${barcode_id}`;
            }

            const quantityNum = parseFloat(String(weight)) || 1.0;

            // Call backend autoStore endpoint
            const res: any = await api.autoStore({
                barcode_id,
                material_name,
                quantity: quantityNum,
                rack_code: rack_code || undefined,
                batch_number: batch_number !== 'N/A' ? batch_number : undefined,
                manufacturing_date: manufacturing_date !== 'N/A' ? manufacturing_date : undefined
            });

            // FIX 4: Handle Duplicate Scan Response (HTTP 409 / status duplicate)
            if (res && (res.status === 'duplicate' || res.success === false)) {
                const dupNotice = "Duplicate Scan - Inventory Not Updated";
                console.warn(`[Inward Scanner] ${dupNotice}: ${barcode_id}`);
                setLastError(dupNotice);
                toast.error(dupNotice);
                return;
            }

            const assignedRackCode = (res && (res.assigned_rack || res.rack_code)) || rack_code || 'N/A';
            const scanTimestamp = res && res.timestamp ? new Date(res.timestamp).toLocaleString() : new Date().toLocaleString();

            const updatedPayload: ScannedData = {
                material_name,
                weight: quantityNum,
                batch_number,
                manufacturing_date,
                rack_code: assignedRackCode,
                barcode_id,
                timestamp: scanTimestamp
            };

            setScannedData(updatedPayload);
            setScanHistory(prev => [updatedPayload, ...prev]);

            // Toast feedback
            toast.success(`Inward Scan Successful: Assigned to Rack ${assignedRackCode}`);

            // Refresh global inventory and rack data
            await refreshData();

            // Dispatch layout update custom events with targeted rack payload
            window.dispatchEvent(new CustomEvent('rack-inventory-update', {
                detail: { rackCode: assignedRackCode }
            }));
            if (typeof (window as any).refreshDigitalTwin === 'function') {
                (window as any).refreshDigitalTwin();
            }

        } catch (err: any) {
            console.error('[Inward Scanner Error]:', err);
            const isDuplicate = err.response?.status === 409 || err.status === 'duplicate' || (err.message && err.message.includes('Duplicate'));
            const errText = isDuplicate ? "Duplicate Scan - Inventory Not Updated" : (err.message || 'Inward barcode verification failed');
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
        onScan: handleScanDetected,
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
                        <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">Inward Vision Hub</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-[0.2em]">Automated Material Ingress Scanner</p>
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
                            {isPaused ? "SCANNER PAUSED" : status === 'processing' ? "AUTO-STORING INVENTORY" : `${status.toUpperCase()} MODE`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Scanner Feed Column */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="saas-card overflow-hidden bg-slate-950 border-slate-800 text-white relative shadow-2xl rounded-3xl">
                            {/* Lens Overlay */}
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
                                <Camera size={14} className="text-[#4F8CFF] animate-pulse" />
                                <span className="text-[9px] font-extrabold tracking-widest uppercase">LIVE INWARD LENS STREAM</span>
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
                                        <p className="text-xs text-slate-500">Click play button to resume continuous live scan.</p>
                                    </div>
                                ) : (
                                    <div className="w-full h-full relative overflow-hidden">
                                        {/* Camera Viewport */}
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

                                        {/* Cyber Target Brackets Overlay */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                            <div className="w-48 h-48 md:w-60 md:h-60 relative border border-white/10 bg-black/10">
                                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#4F8CFF]" />

                                                {/* Laser sweep animation */}
                                                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#4F8CFF]/70 shadow-[0_0_10px_#4F8CFF] animate-[sweep_2.5s_linear_infinite]" />
                                            </div>
                                        </div>

                                        {/* Hands-Free Banner */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 text-[10px] tracking-wider font-bold uppercase text-slate-300 z-10 text-center whitespace-nowrap">
                                            Continuous Hands-Free Scan Active
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scanner Session Stats */}
                        <div className="saas-card p-6 grid grid-cols-3 gap-4 rounded-3xl">
                            <div className="text-center border-r border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Scans</p>
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
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                                    Continuous
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Scanned Results Column */}
                    <div className="lg:col-span-6 space-y-6">
                        {status === 'processing' && (
                            <div className="saas-card p-8 border-[#4F8CFF]/20 bg-gradient-to-br from-white to-blue-50/20 animate-[slideUp_0.4s_ease-out_forwards] rounded-3xl shadow-lg">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#4F8CFF] animate-spin">
                                        <Loader2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Processing Inward Scan...</h3>
                                        <p className="text-[9px] text-[#4F8CFF] font-bold uppercase tracking-wider">Syncing with DB & Allocating Rack</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {scannedData ? (
                            <div className="saas-card p-8 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 animate-[slideUp_0.4s_ease-out_forwards] rounded-3xl">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 size={20} className="animate-[scaleIn_0.3s_ease-out_forwards]" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-base">Inward Scan Successful</h3>
                                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Inventory & Rack Updated</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-[9px] font-black uppercase tracking-wider">
                                        Auto-Resumed
                                    </span>
                                </div>

                                {/* Metadata Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Package size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Material Name</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{scannedData.material_name}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Database size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Inward Quantity</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1">+{scannedData.weight} KG</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Tag size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Batch Number</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{scannedData.batch_number}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Mfg Date</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1">{scannedData.manufacturing_date}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between col-span-1 md:col-span-2 gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                                    <Layers size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Assigned Storage Rack</p>
                                                    <p className="text-sm font-extrabold text-slate-900 mt-1 uppercase">Rack {scannedData.rack_code}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Barcode ID</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate uppercase">{scannedData.barcode_id}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Clock size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Timestamp</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{scannedData.timestamp}</p>
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
                                        <h3 className="font-black text-slate-900 text-base">Inward Validation Notice</h3>
                                        <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Continuous Scan Retrying</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-650 font-bold leading-relaxed bg-white/50 border border-amber-100/50 p-4 rounded-xl mb-4">
                                    {lastError}
                                </p>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-400 font-medium">
                                    <span className="font-bold text-slate-500">Raw decoded text:</span> {rawText || 'Empty'}
                                </div>
                            </div>
                        ) : (
                            <div className="saas-card p-10 text-center flex flex-col items-center justify-center min-h-[300px] border-dashed border-slate-200 rounded-3xl">
                                <div className="w-16 h-16 bg-blue-50 text-[#4F8CFF] rounded-full flex items-center justify-center mb-4 border border-blue-100 animate-pulse">
                                    <Camera size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-2">Live Continuous Inward Camera Active</h3>
                                <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
                                    Align paint bucket barcodes inside the live frame. Incoming items will be automatically assigned to racks in real-time.
                                </p>
                            </div>
                        )}

                        {/* Recent History Table */}
                        <div className="saas-card p-6 rounded-3xl">
                            <div className="flex items-center gap-3 mb-6">
                                <History size={16} className="text-slate-400" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Inward Session Feed</h3>
                            </div>
                            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                                {scanHistory.map((historyItem, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                                        <div className="min-w-0">
                                            <p className="text-xs font-extrabold text-slate-800 truncate">{historyItem.material_name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                Batch: {historyItem.batch_number} • Rack: {historyItem.rack_code}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-emerald-600">+{historyItem.weight} KG</p>
                                            <p className="text-[8px] text-slate-400 font-bold mt-0.5">{historyItem.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                                {scanHistory.length === 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center py-6">
                                        No items inwarded in this session yet
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

export default Scanner;
