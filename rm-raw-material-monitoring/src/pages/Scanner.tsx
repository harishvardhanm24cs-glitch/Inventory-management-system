import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { 
    Camera, 
    CameraOff, 
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
    Focus,
    Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const [scannedData, setScannedData] = useState<ScannedData | null>(null);
    const [rawText, setRawText] = useState<string>('');
    const [status, setStatus] = useState<'connecting' | 'scanning' | 'success' | 'error' | 'permission_denied' | 'syncing'>('connecting');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [scanCount, setScanCount] = useState<number>(0);
    const [scanHistory, setScanHistory] = useState<ScannedData[]>([]);
    const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
    const { refreshData, materials, racks } = useInventory();

    // Start camera stream
    const startCamera = async () => {
        try {
            setStatus('connecting');
            const constraints = {
                video: {
                    facingMode: 'environment', // mobile rear camera preferred
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video loadedmetadata then play
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch((playErr) => {
                        console.error("Video play failed:", playErr);
                    });
                };
            }
            
            console.log("scanner started");
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

    // Initialize and cleanup camera
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // Active frame processing loop
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
                            return; // Stop loop once QR is detected
                        }
                    }
                }
            }
            // Keep scanning next frame
            animationFrameId.current = requestAnimationFrame(processFrame);
        };

        animationFrameId.current = requestAnimationFrame(processFrame);
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [status, isPaused, lastScannedBarcode]);

    // Handle QR code detected
    const handleDetectedQR = async (text: string) => {
        // Duplicate scan prevention
        if (text === lastScannedBarcode) {
            // Keep scanning next frames but do not process again
            animationFrameId.current = requestAnimationFrame(() => {});
            return;
        }

        console.log("QR detected", text);
        setRawText(text);
        setLastScannedBarcode(text);

        try {
            const parsed = JSON.parse(text);
            console.log("[DEBUG] decoded QR:", parsed);

            // Extract fields checking both registry schemes
            const material_name = parsed.material_name || parsed.paint_name;
            const weight = parsed.weight !== undefined ? parsed.weight : (parsed.quantity || parsed.stock || 0);
            const batch_number = parsed.batch_number || parsed.batch || 'N/A';
            const manufacturing_date = parsed.manufacturing_date || parsed.manufacture_date || 'N/A';
            const rack_code = parsed.rack_code || parsed.location || null;
            const barcode_id = parsed.barcode_id || parsed.sku_id || parsed.barcode || 'N/A';

            if (!material_name) {
                throw new Error("Invalid format: 'material_name' or 'paint_name' is missing.");
            }

            const payload: ScannedData = {
                material_name,
                weight,
                batch_number,
                manufacturing_date,
                rack_code: rack_code || 'Auto-Assigning...',
                barcode_id
            };

            setStatus('syncing');
            setSyncStatus('syncing');

            // Find matching material locally to get the material_id
            let matchedMaterial = materials.find(m => 
                (barcode_id && barcode_id !== 'N/A' && m.barcode === barcode_id) || 
                ((m.name || '').toLowerCase() === (material_name || '').toLowerCase())
            );
            
            if (!matchedMaterial) {
                console.log("Material not found in local context, refetching materials...");
                await refreshData();
                const refreshedMats = await api.getMaterials();
                
                // Logs for Audit Tasks
                console.log("[DEBUG] materials API response:", refreshedMats);
                console.log("[DEBUG] refreshedMats value:", refreshedMats);
                
                // Ensure refreshedMats is always an array before using .find()
                let matsArray: any[] = [];
                if (Array.isArray(refreshedMats)) {
                    matsArray = refreshedMats;
                } else if (refreshedMats && refreshedMats.success === true && Array.isArray(refreshedMats.data)) {
                    matsArray = refreshedMats.data;
                } else if (refreshedMats && Array.isArray(refreshedMats.materials)) {
                    matsArray = refreshedMats.materials;
                } else if (refreshedMats && Array.isArray(refreshedMats.data)) {
                    matsArray = refreshedMats.data;
                }
                
                matchedMaterial = matsArray.find((m: any) => 
                    (barcode_id && barcode_id !== 'N/A' && m.barcode === barcode_id) || 
                    ((m.name || '').toLowerCase() === (material_name || '').toLowerCase())
                );
            }

            console.log("[DEBUG] database lookup result:", matchedMaterial);

            const quantity = parseFloat(String(weight)) || 0;

            // Call backend API /api/scanner/auto-store to handle the scanned barcode,
            // lookup in qr_codes, auto-creating material if needed, and assigning the rack
            const res = await api.autoStore({
                barcode_id,
                material_name,
                quantity,
                rack_code: rack_code || undefined,
                batch_number: batch_number !== 'N/A' ? batch_number : undefined,
                manufacturing_date: manufacturing_date !== 'N/A' ? manufacturing_date : undefined
            });

            console.log("[DEBUG] Final Inventory Insert (API Response):", res);

            const assignedRackCode = (res && (res.assigned_rack || res.rack_code)) || rack_code || 'N/A';
            const scanTimestamp = res && res.timestamp ? new Date(res.timestamp).toLocaleString() : new Date().toLocaleString();
            const updatedPayload: ScannedData = {
                ...payload,
                rack_code: assignedRackCode,
                timestamp: scanTimestamp
            };

            setScannedData(updatedPayload);

            setSyncStatus('synced');
            setStatus('success');
            
            // Show toast: Material Assigned To Rack A1
            toast.success(`Material Assigned To Rack ${assignedRackCode}`);

            setScanCount(prev => prev + 1);
            setScanHistory(prev => [updatedPayload, ...prev]);
            
            // Automatically refresh global layout data (Rack View, Materials, Dashboard)
            await refreshData();

            // Phase 4 Step 4: Log material movements to Digital Twin feed
            const finalRack = `Rack ${assignedRackCode}`;
            await api.createMovement({
                barcode_id,
                material_name,
                source_location: 'Scanner',
                destination_location: 'Receiving Zone',
                movement_type: 'INWARD',
            });
            await api.createMovement({
                barcode_id,
                material_name,
                source_location: 'Receiving Zone',
                destination_location: finalRack,
                movement_type: 'INWARD',
            });

            // Dispatch custom event to notify other components to refresh
            window.dispatchEvent(new CustomEvent('rack-inventory-update'));

            // Refresh Digital Twin movement feed immediately
            if (typeof (window as any).refreshDigitalTwin === 'function') {
                (window as any).refreshDigitalTwin();
            }

            console.log("scan completed");

        } catch (err: any) {
            console.error("QR Code Parsing or Sync Error:", err);
            setSyncStatus('failed');
            setStatus('error');
            setErrorMessage(err.message || "Failed to parse QR JSON data or sync with backend.");
            toast.error("Rack Sync Failed");
        }
    };

    const handleReset = () => {
        setScannedData(null);
        setRawText('');
        setErrorMessage('');
        setLastScannedBarcode('');
        setSyncStatus('idle');
        setStatus('scanning');
        // Restart video processing loop if stopped
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };

    const togglePause = () => {
        const nextPauseState = !isPaused;
        setIsPaused(nextPauseState);
        if (nextPauseState) {
            // Stop loop
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
                        <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">Smart Scanner</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-[0.2em]">Material Batch Vision Input</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-all duration-300",
                        status === 'scanning' && "bg-blue-50 text-blue-600 border-blue-100",
                        status === 'syncing' && "bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse",
                        status === 'success' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                        status === 'error' && "bg-amber-50 text-amber-600 border-amber-100",
                        status === 'permission_denied' && "bg-rose-50 text-rose-600 border-rose-100",
                        status === 'connecting' && "bg-slate-50 text-slate-600 border-slate-100 animate-pulse"
                    )}>
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            status === 'scanning' && "bg-blue-500 animate-ping",
                            status === 'syncing' && "bg-indigo-500 animate-ping",
                            status === 'success' && "bg-emerald-500 animate-pulse",
                            status === 'error' && "bg-amber-500",
                            status === 'permission_denied' && "bg-rose-500",
                            status === 'connecting' && "bg-slate-500"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isPaused ? "SCANNER PAUSED" : status === 'syncing' ? "SYNCING TO RACK" : `${status.toUpperCase()} MODE`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Scanner Feed Column */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="saas-card overflow-hidden bg-slate-950 border-slate-800 text-white relative shadow-2xl rounded-3xl">
                            {/* Header overlay */}
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
                                <Camera size={14} className="text-[#4F8CFF] animate-pulse" />
                                <span className="text-[9px] font-extrabold tracking-widest uppercase">LENS STREAM // LIVE</span>
                            </div>

                            {/* Camera controls */}
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
                                {status === 'permission_denied' ? (
                                    <div className="p-8 text-center max-w-sm space-y-4">
                                        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500">
                                            <ShieldAlert size={28} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-wider text-rose-400">Camera Access Denied</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                            We need permission to access your camera so we can scan QR codes. Please click the lock icon in your browser address bar and change camera permissions to "Allow".
                                        </p>
                                    </div>
                                ) : isPaused ? (
                                    <div className="p-8 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                            <Pause size={28} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-wider text-slate-300">Scanner Paused</h3>
                                        <p className="text-xs text-slate-500">Click the play button to reactivate live scanning feed.</p>
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

                                        {/* Cyber Target Brackets overlay */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                            <div className="w-48 h-48 md:w-60 md:h-60 relative border border-white/10 bg-black/10">
                                                {/* Cyber brackets */}
                                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#4F8CFF]" />
                                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#4F8CFF]" />

                                                {/* Laser sweep animation */}
                                                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#4F8CFF]/70 shadow-[0_0_10px_#4F8CFF] animate-[sweep_2.5s_linear_infinite]" />
                                            </div>
                                        </div>

                                        {/* Instruction Banner */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 text-[10px] tracking-wider font-bold uppercase text-slate-400 z-10 text-center whitespace-nowrap">
                                            Center QR code inside target box
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
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Code</p>
                                <p className="text-xs font-black text-slate-900 truncate max-w-[120px] mx-auto" title={lastScannedBarcode || 'None'}>
                                    {lastScannedBarcode ? lastScannedBarcode.substring(0, 15) + '...' : 'None'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-wider",
                                    status === 'scanning' && "text-blue-500",
                                    status === 'syncing' && "text-indigo-500 animate-pulse",
                                    status === 'success' && "text-emerald-500",
                                    status === 'error' && "text-amber-500",
                                    status === 'permission_denied' && "text-rose-500 text-center"
                                )}>
                                    {status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Scanned Card Results Column */}
                    <div className="lg:col-span-6 space-y-6">
                        {status === 'syncing' ? (
                            <div className="saas-card p-8 border-[#4F8CFF]/20 bg-gradient-to-br from-white to-blue-50/20 animate-[slideUp_0.4s_ease-out_forwards] rounded-3xl shadow-lg">
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#4F8CFF] animate-spin">
                                        <Loader2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">syncing...</h3>
                                        <p className="text-[9px] text-[#4F8CFF] font-bold uppercase tracking-wider">Syncing with DB</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-2.5">
                                            <Loader2 size={14} className="text-blue-500 animate-spin" />
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">inventory storing...</span>
                                        </div>
                                        <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-wider">Processing</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm opacity-60">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">rack updating...</span>
                                        </div>
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-wider">Pending</span>
                                    </div>
                                </div>
                            </div>
                        ) : status === 'success' && scannedData ? (
                            <div className="saas-card p-8 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 animate-[slideUp_0.4s_ease-out_forwards] rounded-3xl">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 size={20} className="animate-[scaleIn_0.3s_ease-out_forwards]" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-base">Scan Successful</h3>
                                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Payload Verified</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleReset}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                                    >
                                        Scan Next
                                    </button>
                                </div>

                                {/* Sync checklist */}
                                <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-700">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            <span className="text-xs font-bold uppercase tracking-wider">inventory stored</span>
                                        </div>
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">Verified ✓</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-700">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            <span className="text-xs font-bold uppercase tracking-wider">rack updated</span>
                                        </div>
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">Synced ✓</span>
                                    </div>
                                </div>

                                {/* Main parsed metadata cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Material Name */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Package size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Material Name</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{scannedData.material_name}</p>
                                        </div>
                                    </div>

                                    {/* Weight */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Database size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Quantity/Weight</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1">{scannedData.weight} KG</p>
                                        </div>
                                    </div>

                                    {/* Batch Number */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Tag size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Batch Number</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{scannedData.batch_number}</p>
                                        </div>
                                    </div>

                                    {/* Manufacturing Date */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Mfg Date</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1">{scannedData.manufacturing_date}</p>
                                        </div>
                                    </div>

                                    {/* Rack Location & Live Occupancy Bar */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between col-span-1 md:col-span-2 gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                                    <Layers size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Target Rack</p>
                                                    <p className="text-sm font-extrabold text-slate-900 mt-1 uppercase">Rack {scannedData.rack_code}</p>
                                                </div>
                                            </div>
                                            {(() => {
                                                const assignedRack = racks.find(r => r.rack_code === scannedData.rack_code);
                                                if (!assignedRack) return null;
                                                return (
                                                    <span className="text-xs font-black text-primary">
                                                        {assignedRack.occupancy_percentage}%
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        {(() => {
                                            const assignedRack = racks.find(r => r.rack_code === scannedData.rack_code);
                                            if (!assignedRack) return null;
                                            const progressWidth = Math.min(assignedRack.occupancy_percentage, 100);
                                            const barColorClass = assignedRack.occupancy_percentage > 80 
                                                 ? "bg-rose-500" 
                                                 : assignedRack.occupancy_percentage > 40 
                                                     ? "bg-amber-500" 
                                                     : "bg-emerald-500";
                                            return (
                                                <div className="w-full mt-2">
                                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                                                        <div
                                                            className={cn("h-full rounded-full transition-all duration-500", barColorClass)}
                                                            style={{ width: `${progressWidth}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[8px] text-slate-400 font-bold mt-1">
                                                        Current Stock: {assignedRack.current_stock} KG / Capacity: {assignedRack.capacity} KG
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Barcode ID */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Registry Barcode</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate uppercase">{scannedData.barcode_id}</p>
                                        </div>
                                    </div>

                                    {/* Scan Timestamp */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                        <div className="p-2.5 bg-white border border-slate-100 rounded-lg text-slate-500">
                                            <Clock size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Scan Timestamp</p>
                                            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">{scannedData.timestamp || new Date().toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : status === 'error' ? (
                            <div className="saas-card p-8 border-amber-100 bg-gradient-to-br from-white to-amber-50/20 rounded-3xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">
                                            {errorMessage === "This QR has already been processed." ? "Duplicate Scan Warning" : "Invalid QR Code Format"}
                                        </h3>
                                        <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">
                                            {errorMessage === "This QR has already been processed." ? "Already Processed" : "Parsing/Validation Failure"}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-650 font-bold leading-relaxed bg-white/50 border border-amber-100/50 p-4 rounded-xl mb-6">
                                    {errorMessage}
                                </p>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleReset}
                                        className="px-6 py-4 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-amber-100"
                                    >
                                        <RefreshCw size={14} /> Retry Scanning
                                    </button>
                                </div>
                                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-400 font-medium">
                                    <span className="font-bold text-slate-500">Raw decoded text:</span> {rawText || 'Empty'}
                                </div>
                            </div>
                        ) : (
                            <div className="saas-card p-10 text-center flex flex-col items-center justify-center min-h-[300px] border-dashed border-slate-200 rounded-3xl">
                                <div className="w-16 h-16 bg-blue-50 text-[#4F8CFF] rounded-full flex items-center justify-center mb-4 border border-blue-100 animate-pulse">
                                    <Camera size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider mb-2">Awaiting Scan Feed</h3>
                                <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
                                    Please align a paint bucket's QR code within the live scanner brackets to automatically extract registry details.
                                </p>
                            </div>
                        )}

                        {/* Recent History Table */}
                        <div className="saas-card p-6 rounded-3xl">
                            <div className="flex items-center gap-3 mb-6">
                                <History size={16} className="text-slate-400" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Scan Logs Feed</h3>
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
                                            <p className="text-xs font-black text-slate-900">{historyItem.weight} KG</p>
                                            <p className="text-[8px] text-slate-400 font-bold mt-0.5">
                                                {historyItem.timestamp 
                                                    ? new Date(historyItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {scanHistory.length === 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center py-6">No scans logged in this session</p>
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
                @keyframes scaleIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Scanner;
