import React from 'react';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const RemoveRM = () => {
    return (
        <div className="min-h-screen bg-[#F4F7FB] flex flex-col animate-fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <Link to="/" className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 group transition-all">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight">Remove RM</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">Direct Outward Dispatch</p>
                    </div>
                </div>
            </div>
            
            <div className="max-w-6xl mx-auto px-6 pt-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-32 h-32 rounded-[2.5rem] bg-white border border-slate-200 flex items-center justify-center mb-8 relative group cursor-pointer hover:border-rose-500/50 transition-all shadow-xl">
                    <Settings size={48} className="text-rose-500 group-hover:rotate-90 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-rose-500/5 rounded-[2.5rem] blur-2xl group-hover:opacity-100 opacity-0 transition-opacity" />
                </div>
                
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Scanning system offline</h2>
                <p className="text-slate-500 font-bold max-w-lg text-sm leading-relaxed mb-8 border border-slate-100 bg-white p-4 rounded-xl shadow-sm">
                    The outward dispatch vision systems and QR capabilities are currently being completely rebuilt for maximum industrial efficiency. Please check back later.
                </p>
                
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-xs font-black uppercase tracking-widest shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Reconstruction in progress
                </div>
            </div>
        </div>
    );
};

export default RemoveRM;
