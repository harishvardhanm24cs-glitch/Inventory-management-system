import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
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
    Clock,
    ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';

interface ScannedDetails {
    material_name: string;
    barcode_id: string;
    rack_code: string;
    current_stock: number;
    unit: string;
    units_to_outward: number; // weight/units associated with this barcode
}

const OutwardScanner: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const [status, setStatus] = useState<'connecting' | 'scanning' | 'verifying' | 'confirmed' | 'error' | 'permission_denied'>('connecting');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [scannedDetails, setScannedDetails] = useState<ScannedDetails | null>(null);
    const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isConfirming, setIsConfirming] = useState<boolean>(false);
    const [outwardHistory, setOutwardHistory] = useState<any[]>([]);

    const { refreshData, materials } = useInventory();

    // Start camera stream
    const startCamera = async () => {
        try {
            setStatus('connecting');
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch((playErr) => {
                        console.error("Video play failed:", playErr);
                    });
                };
            }
            
            setStatus('scanning');
        } catch (err: any) {
            console.error("Camera access error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setStatus('permission_denied');
                toast.error("Camera access denied. Please grant permissions.");
            } else {
                setStatus('error');
                setErrorMessage("Failed to access camera device. Make sure it is connected.");
                toast.error("Webcam initiation failed.");
            }
        }
    };

    // Stop camera stream
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    };

    // Initialize camera on mount
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // Frame processing loop
    useEffect(() => {
        if (status !== 'scanning' || isPaused) return;

        const processFrame = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) return;

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code && code.data) {
                        const decodedText = code.data.trim();
                        if (decodedText) {
                            handleDetectedQR(decodedText);
                            return; // Stop scanning once QR is detected
                        }
                    }
                }
            }
            animationFrameId.current = requestAnimationFrame(processFrame);
        };

        animationFrameId.current = requestAnimationFrame(processFrame);
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [status, isPaused, lastScannedBarcode]);

    // Handle detected QR
    const handleDetectedQR = async (text: string) => {
        if (text === lastScannedBarcode) {
            animationFrameId.current = requestAnimationFrame(() => {});
            return;
        }

        console.log("Outward Scanner detected:", text);
        setLastScannedBarcode(text);

        try {
            let barcodeId = text;

            // Attempt to parse if it is JSON format, otherwise use text directly
            try {
                const parsed = JSON.parse(text);
                barcodeId = parsed.barcode_id || parsed.sku_id || parsed.barcode || text;
            } catch (e) {
                // Not JSON, use the raw text as the barcode id
            }

            setStatus('verifying');

            let qrCode: any = null;
            let matchedMaterial = materials.find(m => m.barcode === barcodeId);

            try {
                // Fetch QR Details from trace endpoint
                const res = await api.getQrTrace(barcodeId);
                if (res && res.data && res.data.qrCode) {
                    qrCode = res.data.qrCode;
                    if (qrCode.status === 'unused') {
                        throw new Error("This QR cannot be outwarded because it has not been inwarded (status is unused).");
                    }
                } else {
                    throw new Error("Invalid response structure from QR registry.");
                }
            } catch (err: any) {
                // If it is specifically the 'unused' status error we threw above, propagate it to block scan
                if (err.message && err.message.includes("unused")) {
                    throw err;
                }
                console.warn("QR trace API unavailable or failed:", err.message);
                toast.error("QR Registry lookup failed. Operating in fallback/offline mode.");
            }

            // Find matching material in global context to get current stock if not already found
            if (!matchedMaterial && qrCode) {
                // Try finding by name fallback
                matchedMaterial = materials.find(m => m.name.toLowerCase() === qrCode.material_name.toLowerCase());
            }

            const details: ScannedDetails = {
                material_name: qrCode ? qrCode.material_name : (matchedMaterial ? matchedMaterial.name : 'Unknown Material'),
                barcode_id: barcodeId,
                rack_code: qrCode ? (qrCode.rack_code || 'Not Assigned') : 'Not Assigned',
                current_stock: matchedMaterial ? matchedMaterial.stock : 0,
                unit: matchedMaterial ? matchedMaterial.unit : 'KG',
                units_to_outward: qrCode ? (parseFloat(qrCode.units) || 0) : (matchedMaterial ? matchedMaterial.stock : 0)
            };

            setScannedDetails(details);
        } catch (err: any) {
            console.error("Outward verification error:", err);
            setStatus('error');
            setErrorMessage(err.message || "Invalid QR Code or registry trace failed.");
            toast.error(err.message || "Registry trace failed");
        }
    };

    // Confirm outward scan
    const handleConfirmOutward = async () => {
        if (!scannedDetails) return;
        setIsConfirming(true);

        try {
            const res = await api.outwardScan({
                barcode_id: scannedDetails.barcode_id
            });

            if (res && res.success) {
                toast.success(`Success: Dispatch confirmed for ${scannedDetails.barcode_id}`);
                
                // Add to session history
                const historyItem = {
                    barcode_id: scannedDetails.barcode_id,
                    material_name: scannedDetails.material_name,
                    quantity: scannedDetails.units_to_outward,
                    unit: scannedDetails.unit,
                    rack_code: scannedDetails.rack_code,
                    timestamp: new Date().toLocaleTimeString()
                };
                setOutwardHistory(prev => [historyItem, ...prev]);

                setStatus('confirmed');
                
                // Refresh global layout data
                await refreshData();

                // Phase 4 Step 4: Log outward movement to Digital Twin feed
                const sourceRack = `Rack ${scannedDetails.rack_code}`;
                await api.createMovement({
                    barcode_id: scannedDetails.barcode_id,
                    material_name: scannedDetails.material_name,
                    source_location: sourceRack,
                    destination_location: 'Dispatch Zone',
                    movement_type: 'OUTWARD',
                });

                // Dispatch custom event to notify other components to refresh
                window.dispatchEvent(new CustomEvent('rack-inventory-update'));
                if (typeof (window as any).refreshDigitalTwin === 'function') {
                    (window as any).refreshDigitalTwin();
                }
            } else {
                throw new Error(res?.message || "Outward scan request failed.");
            }
        } catch (err: any) {
            console.error("Confirm outward failed:", err);
            toast.error(err.message || "Failed to confirm outward scan.");
            setStatus('error');
            setErrorMessage(err.message || "Failed to confirm outward scan.");
        } finally {
            setIsConfirming(false);
        }
    };

    // Reset scanner state to continue scanning
    const handleReset = () => {
        setScannedDetails(null);
        setErrorMessage('');
        setLastScannedBarcode('');
        setStatus('scanning');
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };

    // Pause scan feed
    const togglePause = () => {
        const nextPauseState = !isPaused;
        setIsPaused(nextPauseState);
        if (nextPauseState) {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        } else {
            setStatus('scanning');
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F7FB] flex flex-col animate-fade-in text-slate-900 pb-20">
            {/* Top Navigation Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <Link to="/" className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 group transition-all">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">Outward Dispatch Scanner</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-[0.2em]">Material Batch Vision Ingress Dispatch</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-all duration-300",
                        status === 'scanning' && "bg-blue-50 text-blue-600 border-blue-100",
                        status === 'verifying' && "bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse",
                        status === 'confirmed' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                        status === 'error' && "bg-amber-50 text-amber-600 border-amber-100",
                        status === 'connecting' && "bg-slate-50 text-slate-600 border-slate-100 animate-pulse"
                    )}>
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            status === 'scanning' && "bg-blue-500 animate-ping",
                            status === 'verifying' && "bg-indigo-500 animate-ping",
                            status === 'confirmed' && "bg-emerald-500 animate-pulse",
                            status === 'error' && "bg-amber-500",
                            status === 'connecting' && "bg-slate-500"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isPaused ? "SCANNER PAUSED" : status === 'verifying' ? "VERIFYING REGISTRY" : `${status.toUpperCase()} MODE`}
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
                                <span className="text-[9px] font-extrabold tracking-widest uppercase">LENS STREAM // DISPATCH</span>
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
                                    onClick={handleReset}
                                    className="p-2 bg-black/60 hover:bg-white/10 rounded-lg text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
                                    title="Reset Scanner"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>

                            {/* Viewport Frame */}
                            <div className="relative aspect-square md:aspect-video w-full flex items-center justify-center bg-slate-900">
                                {isPaused ? (
                                    <div className="p-8 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                            <Pause size={28} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-wider text-slate-300">Scanner Paused</h3>
                                        <p className="text-xs text-slate-500">Click play button to restart vision scanning loop.</p>
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

                                        {/* Scan Target Brackets */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                            <div className="w-48 h-48 md:w-60 md:h-60 relative border border-white/10 bg-black/10">
                                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#4F8CFF]" />
                                                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#4F8CFF]/70 shadow-[0_0_10px_#4F8CFF] animate-[sweep_2.5s_linear_infinite]" />
                                            </div>
                                        </div>

                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 text-[10px] tracking-wider font-bold uppercase text-slate-400 z-10 text-center whitespace-nowrap">
                                            Align outbound QR code inside target box
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Verification & Details Column */}
                    <div className="lg:col-span-6 space-y-6">
                        
                        {/* Verifying/Loader State */}
                        {status === 'verifying' && (
                            <div className="saas-card p-8 border-[#4F8CFF]/20 bg-gradient-to-br from-white to-blue-50/20 animate-[slideUp_0.4s_ease-out_forwards] rounded-3xl shadow-lg">
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#4F8CFF] animate-spin">
                                        <Loader2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Verifying Barcode...</h3>
                                        <p className="text-[9px] text-[#4F8CFF] font-bold uppercase tracking-wider">Tracing QR Registry</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Scanned Details Form & Confirmation */}
                        {(status === 'scanning' || status === 'verifying') && !scannedDetails && (
                            <div className="saas-card p-10 text-center flex flex-col items-center justify-center min-h-[300px] border-dashed border-slate-200 rounded-3xl">
                                <div className="w-16 h-16 bg-blue-50 text-[#4F8CFF] rounded-full flex items-center justify-center mb-4 border border-blue-100 animate-pulse">
                                    <Camera size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-2">Awaiting Scan Feed</h3>
                                <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
                                    Please align a paint bucket's QR code within the scanner viewport to trace details for outward processing.
                                </p>
                            </div>
                        )}

                        {/* Error Handling State */}
                        {status === 'error' && (
                            <div className="saas-card p-8 border-amber-100 bg-gradient-to-br from-white to-amber-50/20 rounded-3xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Verification Mismatch</h3>
                                        <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Outward Registry Lock</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-650 font-bold leading-relaxed bg-white/50 border border-amber-100/50 p-4 rounded-xl mb-6">
                                    {errorMessage}
                                </p>
                                <button 
                                    onClick={handleReset}
                                    className="w-full py-3 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
                                >
                                    Try Scanning Again
                                </button>
                            </div>
                        )}

                        {/* Successful Trace - Display Information and Confirm button */}
                        {scannedDetails && (status === 'verifying' || status === 'scanning' || status === 'confirmed') && (
                            <div className={cn(
                                "saas-card p-8 rounded-3xl transition-all duration-300",
                                status === 'confirmed' ? "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20" : "border-slate-200"
                            )}>
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border",
                                            status === 'confirmed' ? "bg-emerald-50 border-emerald-100 text-emerald-500" : "bg-blue-50 border-blue-100 text-blue-500"
                                        )}>
                                            {status === 'confirmed' ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-base">
                                                {status === 'confirmed' ? 'Outward Confirmed' : 'Confirm Dispatch Details'}
                                            </h3>
                                            <p className={cn(
                                                "text-[9px] font-bold uppercase tracking-wider",
                                                status === 'confirmed' ? "text-emerald-600" : "text-blue-600"
                                            )}>
                                                {status === 'confirmed' ? 'Registry Updated' : 'Verify Details Below'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleReset}
                                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        {status === 'confirmed' ? 'Scan Next' : 'Cancel Scan'}
                                    </button>
                                </div>

                                {/* Main parsed metadata cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {/* Material Name */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Package size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Material Name</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{scannedDetails.material_name}</p>
                                        </div>
                                    </div>

                                    {/* Barcode ID */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Tag size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Barcode ID</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate uppercase">{scannedDetails.barcode_id}</p>
                                        </div>
                                    </div>

                                    {/* Rack Code */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Layers size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Rack Location</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 uppercase">Rack {scannedDetails.rack_code}</p>
                                        </div>
                                    </div>

                                    {/* Current Stock */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Database size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Current Stock</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">
                                                {scannedDetails.current_stock} {scannedDetails.unit}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Weight of dispatch panel */}
                                <div className="mb-6 p-4 bg-[#FFF9C4]/30 border border-[#FBC02D]/20 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Outward Dispatch weight</p>
                                        <p className="text-lg font-black text-slate-800 mt-0.5">
                                            {scannedDetails.units_to_outward} {scannedDetails.unit}
                                        </p>
                                    </div>
                                    <div className="px-3 py-1 bg-[#FFF9C4]/50 border border-[#FBC02D]/40 rounded-lg text-[9px] font-black uppercase text-amber-800 tracking-wider">
                                        -{scannedDetails.units_to_outward} {scannedDetails.unit}
                                    </div>
                                </div>

                                {/* Confirm Button */}
                                {status !== 'confirmed' && (
                                    <button
                                        onClick={handleConfirmOutward}
                                        disabled={isConfirming}
                                        className="w-full py-4 px-6 bg-red-500 hover:bg-red-650 disabled:opacity-75 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl shadow-lg shadow-red-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        {isConfirming ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Processing Dispatch...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUpRight size={16} />
                                                Confirm Outward Dispatch
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Recent Outward dispatch logs */}
                        <div className="saas-card p-6 rounded-3xl">
                            <div className="flex items-center gap-3 mb-6">
                                <History size={16} className="text-slate-400" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Session Dispatches</h3>
                            </div>
                            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                                {outwardHistory.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-red-50/10 border border-red-100/10 rounded-xl hover:border-red-200/20 transition-all">
                                        <div className="min-w-0">
                                            <p className="text-xs font-extrabold text-slate-800 truncate">{item.material_name}</p>
                                            <p className="text-[9px] text-red-500/80 font-bold uppercase tracking-wider mt-0.5">
                                                Barcode: {item.barcode_id} • Rack: {item.rack_code}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-red-650">-{item.quantity} {item.unit}</p>
                                            <p className="text-[8px] text-slate-400 font-bold mt-0.5">{item.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                                {outwardHistory.length === 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center py-6">
                                        No dispatches processed in this session
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
