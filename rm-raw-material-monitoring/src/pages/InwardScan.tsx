import React from 'react';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const InwardScan = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-white animate-fade-in pb-20 selection:bg-cyan-500/30">
            {/* Futuristic Top Bar */}
            <div className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <Link to="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 group transition-all">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white leading-none tracking-tight">Multi-Sense Vision Hub</h1>
                        <p className="text-[10px] text-cyan-500/60 font-black mt-2 uppercase tracking-[0.4em]">Integrated Inventory Diagnostics</p>
                    </div>
                </div>
            </div>
            
            <div className="max-w-6xl mx-auto px-6 pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-32 h-32 rounded-[2.5rem] bg-slate-900 border border-white/10 flex items-center justify-center mb-8 relative group cursor-pointer hover:border-cyan-500/50 transition-all shadow-2xl">
                    <Settings size={48} className="text-cyan-400 group-hover:rotate-90 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-cyan-500/10 rounded-[2.5rem] blur-2xl group-hover:opacity-100 opacity-0 transition-opacity" />
                </div>
                
                <h2 className="text-4xl font-black text-white tracking-tight mb-4">Scanning system offline</h2>
                <p className="text-slate-400 font-bold max-w-lg text-sm leading-relaxed mb-8 border border-white/5 bg-white/5 p-4 rounded-xl">
                    The vision systems and QR capabilities are currently being completely rebuilt for maximum industrial efficiency. Please check back later.
                </p>
                
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Reconstruction in progress
                </div>
            </div>
        </div>
    );
};

export default InwardScan;
