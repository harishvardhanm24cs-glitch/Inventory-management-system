import React, { useEffect, useRef, useState } from 'react';
import { decodeFromCanvas, parseQRData } from '../../lib/qrEngine';
import { Wifi, WifiOff, Loader2, Activity, ServerCrash } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface ESP32ScannerProps {
    onScan: (result: any) => Promise<any>;
    active: boolean;
}

const ESP32Scanner: React.FC<ESP32ScannerProps> = ({ onScan, active }) => {
    const videoRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const intervalRef = useRef<any>(null);

    const [ipAddress, setIpAddress] = useState(localStorage.getItem('esp32-ip-v2') || '192.168.1.100');
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'success'>('connecting');
    const [streamUrl, setStreamUrl] = useState(`http://${ipAddress}:81/stream`);

    const applyIp = () => {
        setStatus('connecting');
        setStreamUrl(`http://${ipAddress}:81/stream?v=${Date.now()}`); 
        localStorage.setItem('esp32-ip-v2', ipAddress);
    };

    const handleLoad = () => setStatus('connected');
    const handleError = () => {
        setStatus('error');
        // Phase 5 Fallback Simulation text (we don't literally switch the camera automatically to avoid jarring UX, we just show the message as requested)
        toast.error("Stream lost. Switch to Local Camera if issue persists.", { icon: '📡' });
    };

    // Polling Loop: 500ms
    useEffect(() => {
        if (status !== 'connected' || !active) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(async () => {
            const img = videoRef.current;
            const canvas = canvasRef.current;
            
            if (img && canvas && img.complete && img.naturalWidth > 0) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const decodedText = decodeFromCanvas(canvas);
                    
                    if (decodedText) {
                        const parsedData = parseQRData(decodedText);
                        const payload = await onScan(parsedData);
                        
                        if (payload && payload.success) {
                            clearInterval(intervalRef.current);
                            setStatus('success');
                            
                            setTimeout(() => {
                                if (active) setStatus('connected');
                            }, 3000);
                        }
                    }
                }
            }
        }, 500);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [status, active, onScan]);

    if (!active) return null;

    return (
        <div className="flex flex-col gap-4">
            {/* IP configuration bar (Tesla-style terminal) */}
            <div className="flex items-center gap-3 bg-[#0B0F1A] border border-cyan-500/20 p-2 rounded-2xl shadow-[inset_0_0_15px_rgba(6,182,212,0.1)] focus-within:border-cyan-400/50 transition-colors">
                <div className="pl-4 pr-2 border-r border-cyan-500/20">
                    <Activity className={cn("w-4 h-4", status === 'connected' ? "text-emerald-400 animate-pulse" : "text-slate-600")} />
                </div>
                <input 
                    type="text" 
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="ENTER ESP32 IPv4 HOST"
                    className="flex-1 bg-transparent px-2 text-[10px] font-black tracking-[0.2em] uppercase text-cyan-400 outline-none placeholder:text-cyan-900"
                    onKeyDown={(e) => e.key === 'Enter' && applyIp()}
                />
                <button 
                    onClick={applyIp}
                    className="px-6 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-black text-[9px] uppercase tracking-[0.3em] transition-colors"
                >
                    Establish Link
                </button>
            </div>

            <div className="relative w-full aspect-video bg-[#0B0F1A] rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20">
                <img 
                    ref={videoRef}
                    src={streamUrl}
                    crossOrigin="anonymous"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-1000",
                        status === 'connected' ? "opacity-100" : "opacity-0"
                    )}
                    alt="ESP32 Optical Feed"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Cyber Brackets Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[80%] h-[80%] relative">
                        <div className={cn("absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 transition-colors duration-300", status === 'connected' ? "border-emerald-500/50" : "border-slate-700")} />
                        <div className={cn("absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 transition-colors duration-300", status === 'connected' ? "border-emerald-500/50" : "border-slate-700")} />
                        <div className={cn("absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 transition-colors duration-300", status === 'connected' ? "border-emerald-500/50" : "border-slate-700")} />
                        <div className={cn("absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 transition-colors duration-300", status === 'connected' ? "border-emerald-500/50" : "border-slate-700")} />
                    </div>
                </div>

                {/* Status Handling & Skeletons */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                    {status === 'connecting' && (
                        <div className="flex flex-col items-center bg-[#0B0F1A]/80 p-6 rounded-2xl backdrop-blur-md border border-cyan-500/20">
                            <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
                            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] animate-pulse">Acquiring Stream...</p>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex flex-col items-center bg-[#0B0F1A]/80 p-6 rounded-2xl backdrop-blur-md border border-rose-500/20 text-center max-w-xs">
                            <ServerCrash className="w-10 h-10 text-rose-500 mb-4" />
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-2">Hardware Offline</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Ensure ESP32 node is powered and broadcasting on local mesh.</p>
                        </div>
                    )}
                </div>

                {/* HUD LED Node */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#0B0F1A]/80 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">
                    {status === 'connected' ? (
                        <>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                            <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Node Active</span>
                        </>
                    ) : (
                        <>
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e]" />
                            <span className="text-[8px] text-rose-400 font-bold uppercase tracking-[0.2em]">No Signal</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ESP32Scanner;
