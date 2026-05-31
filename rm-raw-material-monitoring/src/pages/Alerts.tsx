import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Bell, Clock, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';

const AlertIcon = ({ severity }: { severity: string }) => {
    switch (severity) {
        case 'critical': return <AlertCircle className="text-rose-600" size={24} />;
        case 'high': return <AlertTriangle className="text-amber-600" size={24} />;
        case 'medium': return <Info className="text-primary" size={24} />;
        default: return <CheckCircle className="text-emerald-600" size={24} />;
    }
};

const AlertItem = ({ alert }: { alert: any }) => {
    const styles = {
        critical: 'border-rose-500/20 bg-rose-500/5 text-rose-600',
        high: 'border-amber-500/20 bg-amber-500/5 text-amber-600',
        medium: 'border-primary/20 bg-primary/5 text-primary',
    };

    const styleKey = alert.severity as keyof typeof styles;

    return (
        <Card className={cn(
            "p-5 border shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5 group rounded-2xl",
            styles[styleKey] || styles.medium
        )}>
            <div className="flex gap-5">
                <div className="mt-1 flex-shrink-0 p-2.5 rounded-xl bg-white/40 shadow-sm border border-white/50">
                    <AlertIcon severity={alert.severity} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between flex-wrap gap-2">
                        <h3 className="font-extrabold text-slate-900 truncate tracking-tight uppercase tracking-widest text-[11px] leading-none">
                            {alert.type.replace('_', ' ')}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] bg-white/50 px-2.5 py-1 rounded-full border border-white/50 shadow-sm">
                            <Clock size={10} className="text-slate-300" />
                            {new Date(alert.date).toLocaleDateString()} {new Date(alert.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mt-3 leading-relaxed">
                        {alert.message}
                    </p>
                </div>
            </div>
        </Card>
    );
};

const Alerts = () => {
    const { alerts, loading, refreshData } = useInventory();

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-lg shadow-rose-500/10 border border-rose-100">
                        <Bell className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Logs</h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Automated Anomaly & Limit Detection</p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    onClick={refreshData} 
                    className={cn("bg-white border border-slate-200 rounded-xl h-10 w-10 p-0", loading ? "text-primary bg-slate-50" : "text-slate-400")}
                >
                    <RefreshCw size={18} className={cn(loading && "animate-spin")} />
                </Button>
            </div>

            <div className="space-y-4 min-h-[400px]">
                {loading && alerts.length === 0 ? (
                    <LoadingSpinner message="Scanning neural monitoring engine..." />
                ) : alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                        <div key={alert.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                            <AlertItem alert={alert} />
                        </div>
                    ))
                ) : (
                    <EmptyState
                        icon={Bell}
                        title="Quiet Operations"
                        description="All systems are nominal. Real-time stock & anomaly detection is active across all nodes."
                    />
                )}
            </div>
        </div>
    );
};

export default Alerts;
