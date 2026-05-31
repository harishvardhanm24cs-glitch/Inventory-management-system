import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Cpu, ArrowLeft, Plus, Minus, CheckCircle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScanHandler } from '../hooks/useScanHandler';
import LaptopScanner from '../components/scanner/LaptopScanner';
import UploadScanner from '../components/scanner/UploadScanner';
import ESP32Scanner from '../components/scanner/ESP32Scanner';
import { cn } from '../lib/utils';

type ScanMode = 'inward' | 'outward';
type Tab = 'laptop' | 'upload' | 'esp32';

const ScanPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('laptop');
    const [scanMode, setScanMode] = useState<ScanMode>('inward');
    const { handleScan, isProcessing } = useScanHandler();
    const [scanResult, setScanResult] = useState<any>(null);

    const onScanResult = async (result: any) => {
        const payload = await handleScan(result, scanMode);
        if (payload && payload.success) {
            setScanResult(payload.data);
            setTimeout(() => setScanResult(null), 3000);
        }
        return payload;
    };

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white animate-fade-in relative overflow-hidden pb-32">
            {/* Cyber Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-700 opacity-20 blur-[100px]" />
            
            {/* Header */}
            <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border-b border-cyan-500/20 px-8 py-5 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <Link to="/" className="p-3 bg-white/5 hover:bg-cyan-500/20 rounded-2xl text-cyan-400 group transition-all duration-300 border border-transparent hover:border-cyan-500/50">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white leading-none tracking-widest uppercase">Smart Vision System</h1>
                        <p className="text-[10px] text-cyan-500 font-black mt-2 uppercase tracking-[0.4em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" /> AI Engine Active
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-10 space-y-10 relative z-10">
                {/* Transaction Mode Selector */}
                <div className="flex justify-center">
                    <div className="bg-white/5 p-2 rounded-3xl border border-white/10 flex items-center shadow-2xl backdrop-blur-md">
                        <button
                            onClick={() => setScanMode('inward')}
                            className={cn(
                                "px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all duration-300",
                                scanMode === 'inward' 
                                    ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                                    : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                            )}
                        >
                            <span className="text-xl leading-none">🔵</span> INWARD MODE
                        </button>
                        <button
                            onClick={() => setScanMode('outward')}
                            className={cn(
                                "px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all duration-300",
                                scanMode === 'outward' 
                                    ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]" 
                                    : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            )}
                        >
                            <span className="text-xl leading-none">🟠</span> OUTWARD MODE
                        </button>
                    </div>
                </div>

                {/* Hardware Toggle */}
                <div className="flex justify-center border-b border-white/5 pb-10">
                    <div className="flex gap-4">
                        {[
                            { id: 'laptop', icon: Camera, label: 'Camera Array' },
                            { id: 'upload', icon: ImageIcon, label: 'Local Files' },
                            { id: 'esp32', icon: Cpu, label: 'ESP32 Nodes' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={cn(
                                    "flex flex-col items-center gap-3 p-6 rounded-[2rem] transition-all duration-300 border-2 w-40 relative overflow-hidden group",
                                    activeTab === tab.id
                                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                        : "border-transparent bg-white/5 text-slate-400 hover:bg-white/10 hover:text-cyan-400"
                                )}
                            >
                                <tab.icon size={28} className={cn("transition-transform duration-300 group-hover:scale-110", activeTab === tab.id && "animate-pulse")} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Scanner Viewport */}
                <div className="bg-[#0B0F1A]/80 border border-white/10 rounded-[2.5rem] p-4 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 m-8 z-20 hidden md:block">
                        <div className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] backdrop-blur-md border",
                            scanMode === 'inward' 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                        )}>
                            Lock: {scanMode.toUpperCase()}
                        </div>
                    </div>

                    <div className="text-center mb-6 mt-2 relative z-10">
                        <div className={cn(
                            "text-sm font-black uppercase tracking-[0.3em] inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl",
                            scanMode === 'inward' 
                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                                : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        )}>
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]",
                                scanMode === 'inward' ? "bg-emerald-400" : "bg-rose-400"
                            )} />
                            {scanMode === 'inward' ? "🔵 INWARD MODE ACTIVE" : "🟠 OUTWARD MODE ACTIVE"}
                        </div>
                    </div>

                    <div className={cn("transition-all duration-500", isProcessing ? "opacity-50 blur-sm pointer-events-none scale-95" : "opacity-100 scale-100")}>
                        <LaptopScanner 
                            active={activeTab === 'laptop'} 
                            onScan={onScanResult} 
                            scanMode={scanMode}
                        />
                        <UploadScanner 
                            active={activeTab === 'upload'} 
                            onScan={onScanResult} 
                        />
                        <ESP32Scanner 
                            active={activeTab === 'esp32'} 
                            onScan={onScanResult} 
                        />
                    </div>

                    {/* Floating Result Card */}
                    {scanResult && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                            <div className="bg-[#0B0F1A] border border-cyan-500/50 p-8 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.3)] max-w-sm w-full text-center relative overflow-hidden">
                                <div className={cn(
                                    "absolute top-0 left-0 w-full h-2",
                                    scanMode === 'inward' ? "bg-emerald-500" : "bg-rose-500"
                                )} />
                                <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
                                    <CheckCircle className="w-8 h-8 text-cyan-400" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-1">
                                    {scanMode === 'inward' ? 'Inward Success' : 'Outward Success'}
                                </h3>
                                <p className="text-cyan-500 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                                    {new Date().toLocaleTimeString()}
                                </p>
                                
                                <div className="space-y-4 text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Material</span>
                                        <span className="text-white text-xs font-black truncate max-w-[140px]">{scanResult.material?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Quantity</span>
                                        <span className={cn(
                                            "font-black text-lg",
                                            scanMode === 'inward' ? "text-emerald-400" : "text-rose-400"
                                        )}>
                                            {scanMode === 'inward' ? '+' : '-'}{scanResult.transaction?.quantity} KG
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">New Stock</span>
                                        <span className="text-white text-xs font-black">{scanResult.material?.stock} KG</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScanPage;
