import React, { useEffect, useRef, useState } from 'react';
import { decodeFromCanvas, parseQRData } from '../../lib/qrEngine';
import { Camera, CameraOff, Loader2, Focus, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LaptopScannerProps {
    onScan: (result: any) => Promise<any>;
    active: boolean;
    scanMode?: 'inward' | 'outward';
}

const LaptopScanner: React.FC<LaptopScannerProps> = ({ onScan, active }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<any>(null);

    const [status, setStatus] = useState<'connecting' | 'scanning' | 'decoding' | 'error' | 'permission_denied'>('connecting');

    const startCamera = async () => {
        try {
            setStatus('connecting');
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            
            if (videoRef.current) {
                if (!videoRef.current.srcObject) {
                    videoRef.current.srcObject = stream;
                }
                videoRef.current.play().catch(() => {});
                setStatus('scanning');
            }
        } catch (err: any) {
            console.error("Camera error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setStatus('permission_denied');
            } else {
                setStatus('error');
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        if (active) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [active]);

    // Interval scanning loop: 300ms
    useEffect(() => {
        if (status !== 'scanning' || !active) return;

        intervalRef.current = setInterval(async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const decodedText = decodeFromCanvas(canvas);
                    
                    if (decodedText) {
                        setStatus('decoding');
                        const parsedData = parseQRData(decodedText);
                        const payload = await onScan(parsedData);
                        
                        if (payload && payload.success) {
                            stopCamera(); // Stop scanning on success
                            
                            // Auto-restart scanning after 3 seconds
                            setTimeout(() => {
                                if (active) {
                                    startCamera();
                                }
                            }, 3000);
                        } else {
                            setStatus('scanning');
                        }
                    }
                }
            }
        }, 300);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [status, active, onScan]);

    if (!active) return null;

    return (
        <div className="relative w-full aspect-video bg-[#0B0F1A] rounded-2xl overflow-hidden shadow-2xl group border border-cyan-500/20">
            {/* Auto-focus simulation scale */}
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

            {/* Industrial Target Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 relative">
                    {/* Cyber Brackets */}
                    <div className={cn("absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 transition-colors duration-300", status === 'scanning' ? "border-cyan-400" : "border-slate-600")} />
                    <div className={cn("absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 transition-colors duration-300", status === 'scanning' ? "border-cyan-400" : "border-slate-600")} />
                    <div className={cn("absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 transition-colors duration-300", status === 'scanning' ? "border-cyan-400" : "border-slate-600")} />
                    <div className={cn("absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 transition-colors duration-300", status === 'scanning' ? "border-cyan-400" : "border-slate-600")} />
                    
                    {/* Inner Crosshair */}
                    <Focus className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 transition-all duration-700", status === 'scanning' ? "text-cyan-500/50 scale-100" : "text-white/20 scale-50")} />

                    {/* Laser Sweep */}
                    {status === 'scanning' && (
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[scan_2s_linear_infinite]" />
                    )}
                </div>
            </div>

            {/* Status Panel (HUD) */}
            <div className="absolute top-6 left-6 z-10">
                <div className="flex flex-col gap-1">
                    {status === 'connecting' && (
                        <div className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Link Establishing...
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            <CameraOff className="w-3 h-3" /> Hardware Offline
                        </div>
                    )}
                    {status === 'permission_denied' && (
                        <div className="bg-rose-500 text-white p-3 rounded-xl mt-2 max-w-[200px] shadow-lg animate-in slide-in-from-left duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldAlert size={14} className="flex-shrink-0" />
                                <span className="text-[10px] font-black uppercase">Permission Denied</span>
                            </div>
                            <p className="text-[9px] font-medium leading-tight opacity-90">
                                Click the <span className="font-black underline">Lock Icon</span> next to the URL and set <span className="font-black">Camera</span> to <span className="font-black uppercase">Allow</span>.
                            </p>
                        </div>
                    )}
                    {status === 'scanning' && (
                        <div className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]">
                            <Camera className="w-3 h-3" /> Matrix Active // Lock Target
                        </div>
                    )}
                    {status === 'decoding' && (
                        <div className="text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]">
                            <Loader2 className="w-3 h-3 animate-spin" /> Decrypting Payload...
                        </div>
                    )}
                    
                    {/* Sub helper */}
                    {status === 'scanning' && (
                        <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.4em] mt-1 ml-5">
                            Hold target steady within frame
                        </div>
                    )}
                </div>
            </div>
            
            {/* Custom Scan Animation Injection */}
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LaptopScanner;
