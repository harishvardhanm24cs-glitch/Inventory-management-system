import React, { useRef, useState } from 'react';
import { decodeFromCanvas, parseQRData } from '../../lib/qrEngine';
import { Upload, Loader2, FileImage, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface UploadScannerProps {
    onScan: (result: any) => Promise<any>;
    active: boolean;
}

const UploadScanner: React.FC<UploadScannerProps> = ({ onScan, active }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'decoding'>('idle');
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('processing');
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const resultUrl = event.target?.result as string;
            setPreview(resultUrl);

            const img = new Image();
            img.onload = async () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Artificial matrix delay for UI UX 
                    setStatus('decoding');
                    setTimeout(async () => {
                        const decodedText = decodeFromCanvas(canvas);
                        
                        if (decodedText) {
                            const parsedData = parseQRData(decodedText);
                            const payload = await onScan(parsedData);
                            if (payload && payload.success) {
                                // Keep the preview for 3 seconds of success block
                                setTimeout(() => setPreview(null), 3000);
                            } else {
                                setPreview(null);
                            }
                        } else {
                            toast.error("No QR detected — unsupported format or low visibility");
                            setPreview(null);
                        }
                        setStatus('idle');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }, 800); // 800ms of fake decoding matrix for industrial feel
                }
            };
            img.src = resultUrl;
        };
        
        reader.readAsDataURL(file);
    };

    if (!active) return null;

    return (
        <div 
            className="relative w-full aspect-video bg-[#0B0F1A] rounded-2xl overflow-hidden border border-cyan-500/20 hover:border-cyan-400/50 transition-colors duration-500 shadow-2xl group flex flex-col items-center justify-center cursor-pointer" 
            onClick={() => status === 'idle' && fileInputRef.current?.click()}
        >
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden" 
                accept="image/*"
            />
            
            <canvas ref={canvasRef} className="hidden" />

            {/* Industrial HUD Data Stream Background */}
            {status === 'idle' && !preview && (
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            )}

            {preview ? (
                <>
                    <img src={preview} alt="Preview" className={cn("absolute inset-0 w-full h-full object-contain transition-opacity duration-500", status === 'decoding' ? "opacity-30 blur-[2px]" : "opacity-100")} />
                    
                    {(status === 'processing' || status === 'decoding') && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden">
                            {/* Scanning Matrix Overlay */}
                            <div className="absolute top-0 left-0 w-full h-full border-2 border-cyan-500/50 m-4 rounded-xl shadow-[inset_0_0_50px_rgba(6,182,212,0.2)]" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-[scan_1s_linear_infinite]" />
                            
                            <div className="bg-[#0B0F1A]/90 p-6 rounded-2xl border border-cyan-500/50 flex flex-col items-center backdrop-blur-xl animate-in fade-in zoom-in duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
                                <p className="text-cyan-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                                    {status === 'decoding' ? 'Decrypting Image Matrix...' : 'Analyzing Vectors...'}
                                </p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center z-10">
                    <div className="w-24 h-24 bg-cyan-500/5 rounded-3xl flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] border border-cyan-500/20 group-hover:bg-cyan-500/10 group-hover:scale-110 group-hover:border-cyan-400/50 transition-all duration-500">
                        <FileImage className="w-10 h-10 text-cyan-500/50 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400 mb-2">
                        <Upload className="w-4 h-4 animate-bounce" />
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">Upload Visual Data</h3>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Initialize Static Frame Scan</p>
                </div>
            )}
        </div>
    );
};

export default UploadScanner;
