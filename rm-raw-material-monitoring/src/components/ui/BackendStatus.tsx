import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, WifiOff } from 'lucide-react';

const BackendStatus: React.FC = () => {
    const [status, setStatus] = useState<'checking' | 'online' | 'reconnecting'>('checking');
    const [lastChecked, setLastChecked] = useState<string>('');

    const checkHealth = async () => {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (data.status === 'OK') {
                if (data.db === 'connected') {
                    setStatus('online');
                } else {
                    setStatus('reconnecting');
                    // Store the diagnostic message for others to use
                    (window as any).__DB_DIAGNOSTIC__ = data.diagnostic || 'MySQL Offline';
                }
            } else {
                setStatus('reconnecting');
            }
        } catch (err) {
            setStatus('reconnecting');
        }
        setLastChecked(new Date().toLocaleTimeString());
    };

    useEffect(() => {
        // Only run check on first mount OR when interval fires.
        // We avoid calling checkHealth() inside useEffect itself if status changes
        // to prevent immediate double-fires, but since we want it on mount:
        
        const intervalTime = status === 'reconnecting' ? 3000 : 30000;
        const interval = setInterval(checkHealth, intervalTime);
        
        // Initial fire on mount handled by status defaulting to 'checking'
        if (status === 'checking') {
            checkHealth();
        }
        
        return () => clearInterval(interval);
    }, [status]);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {status === 'online' ? (
                <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-4 backdrop-blur-xl bg-opacity-90 transition-all">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest">Connected</p>
                        <p className="text-[10px] opacity-80 font-bold uppercase mt-0.5">Systems sync initialized</p>
                    </div>
                </div>
            ) : status === 'reconnecting' ? (
                <div className="bg-amber-500 text-white px-6 py-4 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-4 backdrop-blur-xl bg-opacity-90 transition-all">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest">Database Sync Failure</p>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-[9px] opacity-100 font-bold uppercase flex items-center gap-1">
                                <span className="text-white bg-slate-900 rounded-full w-4 h-4 flex items-center justify-center text-[8px]">1</span> 
                                Open XAMPP / Control Panel
                            </p>
                            <p className="text-[9px] opacity-100 font-bold uppercase flex items-center gap-1">
                                <span className="text-white bg-slate-900 rounded-full w-4 h-4 flex items-center justify-center text-[8px]">2</span> 
                                Click "Start" on MySQL
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={checkHealth}
                        className="ml-4 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors border border-white/20 shadow-sm flex items-center gap-2"
                    >
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Retry Connection</span>
                    </button>
                </div>
            ) : (
                <div className="bg-slate-900/90 text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 backdrop-blur-xl transition-all">
                    <Loader2 size={20} className="animate-spin text-cyan-400" />
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest">Checking Link...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackendStatus;
