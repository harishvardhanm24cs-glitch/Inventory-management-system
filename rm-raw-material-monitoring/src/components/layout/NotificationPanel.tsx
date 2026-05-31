import React from 'react';
import { Bell, X, AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
    const { alerts, acknowledgeAlert } = useInventory();

    if (!isOpen) return null;

    const styles = {
        critical: 'bg-rose-50 border-rose-100 text-rose-600',
        warning: 'bg-amber-50 border-amber-100 text-amber-600',
        info: 'bg-primary/5 border-primary/10 text-primary',
        success: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    };

    const icons = {
        critical: AlertCircle,
        warning: AlertTriangle,
        info: Info,
        success: CheckCircle,
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose} />
            
            {/* Panel */}
            <div className="absolute top-16 right-0 w-80 max-h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Bell size={16} className="text-primary" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Notifications</h3>
                        {alerts.length > 0 && (
                            <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                {alerts.length}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[360px] p-2 space-y-2 bg-slate-50/30">
                    {alerts.length > 0 ? (
                        alerts.map((alert) => {
                            const Icon = icons[alert.type] || Info;
                            return (
                                <div 
                                    key={alert.id} 
                                    className={cn(
                                        "p-3 rounded-xl border flex gap-3 transition-all hover:scale-[1.02] cursor-pointer group",
                                        styles[alert.type] || styles.info
                                    )}
                                    onClick={() => acknowledgeAlert(alert.id)}
                                >
                                    <div className="shrink-0 mt-0.5">
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-[11px] font-black uppercase tracking-tight truncate leading-tight">
                                                {alert.title}
                                            </p>
                                            <span className="text-[9px] font-bold opacity-60 tabular-nums">
                                                {alert.time}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-medium mt-1 leading-relaxed line-clamp-2">
                                            {alert.message}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 flex flex-col items-center gap-4 text-center">
                            <div className="p-3 bg-slate-50 rounded-full">
                                <Bell className="text-slate-300 w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-900">All caught up!</h4>
                                <p className="text-[10px] text-slate-500 mt-1">No active system alerts.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-white">
                    <Link 
                        to="/alerts" 
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:bg-primary/5 rounded-xl transition-all"
                    >
                        View Full Ledger
                        <ArrowRight size={12} />
                    </Link>
                </div>
            </div>
        </>
    );
};

export default NotificationPanel;
