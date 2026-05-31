import React, { useEffect, useState } from 'react';
import { Zap, AlertTriangle, TrendingUp, X } from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../lib/utils';

interface Anomaly {
    materialId: string;
    name: string;
    recentQty: number;
    avgHistoric: number;
    spikeFactor: string;
}

const AnomalyAlert: React.FC = () => {
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        const fetchAnomalies = async () => {
            try {
                const data = await api.getAnomalies();
                // Ensure data is an array before setting state
                setAnomalies(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch anomalies:', error);
                setAnomalies([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAnomalies();
        
        // Refresh every 5 minutes
        const interval = setInterval(fetchAnomalies, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const visibleAnomalies = Array.isArray(anomalies) 
        ? anomalies.filter(a => a && a.materialId && !dismissed.includes(a.materialId))
        : [];

    if (loading || visibleAnomalies.length === 0) return null;

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
            {visibleAnomalies.map((anomaly) => {
                const spikeValue = parseFloat(anomaly.spikeFactor || '0');
                const displaySpike = isNaN(spikeValue) ? 0 : Math.max(0, Math.round((spikeValue - 1) * 100));
                
                return (
                    <div 
                        key={anomaly.materialId}
                        className="relative overflow-hidden group bg-gradient-to-r from-rose-500 to-orange-500 p-[1px] rounded-2xl shadow-lg shadow-rose-200"
                    >
                        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-[15px] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="p-3 bg-rose-100 rounded-xl text-rose-600 animate-pulse">
                                        <Zap size={22} fill="currentColor" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                        <AlertTriangle size={12} className="text-orange-500" />
                                    </div>
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-slate-900 text-sm truncate">Abnormal Consumption</h4>
                                        <span className="px-2 py-0.5 bg-rose-600 text-[10px] font-black text-white rounded-full uppercase tracking-tighter shadow-sm whitespace-nowrap">
                                            {anomaly.spikeFactor || '1.0'}x Spike
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                        <span className="font-bold text-slate-700">{anomaly.name || anomaly.materialId}</span> usage surged to <span className="font-bold text-rose-600">{anomaly.recentQty || 0} units</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="hidden sm:flex flex-col items-end px-4 py-1 border-l border-slate-100">
                                    <div className="flex items-center gap-1 text-rose-600">
                                        <TrendingUp size={14} />
                                        <span className="text-sm font-black text-rose-600">+{displaySpike}%</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Above Baseline</span>
                                </div>
                                
                                <button 
                                    onClick={() => setDismissed([...dismissed, anomaly.materialId])}
                                    className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AnomalyAlert;
