import React, { useState } from 'react';
import { 
    Cpu, 
    Zap, 
    RefreshCcw, 
    Database, 
    Activity,
    Lock,
    Unlock,
    Settings
} from 'lucide-react';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import { Card, CardContent } from '../components/ui/Card';
import { toast } from 'react-hot-toast';

interface IoTLog {
    id: string;
    timestamp: Date;
    materialName: string;
    weight: number;
    type: string;
    status: 'success' | 'error';
    message: string;
}

const IoTConsole: React.FC = () => {
    const { materials } = useInventory();
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [weight, setWeight] = useState(1);
    const [type, setType] = useState<'INWARD' | 'OUTWARD'>('OUTWARD');
    const [apiKey, setApiKey] = useState('IOT_DEV_KEY_123');
    const [isLocked, setIsLocked] = useState(true);
    const [logs, setLogs] = useState<IoTLog[]>([]);
    const [simulating, setSimulating] = useState(false);

    const handleSimulate = async () => {
        if (!selectedMaterialId) {
            toast.error('Select a material first');
            return;
        }

        setSimulating(true);
        const material = materials.find(m => m.id === selectedMaterialId);
        
        try {
            const result = await api.iotUpdate({
                apiKey,
                materialId: selectedMaterialId,
                weight,
                type
            });

            if (result.success) {
                const newLog: IoTLog = {
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date(),
                    materialName: material?.name || 'Unknown',
                    weight: weight,
                    type: type,
                    status: 'success',
                    message: `New Stock: ${result.newStock}`
                };
                setLogs([newLog, ...logs].slice(0, 10));
                toast.success(`IoT Update Successful! Stock: ${result.newStock}`);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error: any) {
            const errorLog: IoTLog = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                materialName: material?.name || 'Unknown',
                weight: weight,
                type: type,
                status: 'error',
                message: error.message
            };
            setLogs([errorLog, ...logs].slice(0, 10));
            toast.error(`IoT Update Failed: ${error.message}`);
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">IoT Integration Gateway</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Phase 7: Industrial Sensor Emulation</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration & Control */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-100 bg-white/80 backdrop-blur-md overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Settings size={12} className="text-primary" />
                                Device Config
                            </span>
                            <button 
                                onClick={() => setIsLocked(!isLocked)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                {isLocked ? <Lock size={14} /> : <Unlock size={14} className="text-emerald-400" />}
                            </button>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sensor API Key</label>
                                <input 
                                    type="password" 
                                    disabled={isLocked}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-lg p-2.5 text-xs font-mono font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Material</label>
                                <select 
                                    value={selectedMaterialId}
                                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-lg p-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <option value="">-- Choose Sensor --</option>
                                    {materials.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (ID: {m.id.substring(0,8)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity</label>
                                    <input 
                                        type="number" 
                                        value={weight}
                                        onChange={(e) => setWeight(parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 border-none rounded-lg p-2.5 text-xs font-mono font-bold text-slate-700 focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Direction</label>
                                    <select 
                                        value={type}
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full bg-slate-50 border-none rounded-lg p-2.5 text-xs font-bold text-slate-700"
                                    >
                                        <option value="OUTWARD">Consumption</option>
                                        <option value="INWARD">Replenish</option>
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleSimulate}
                                disabled={simulating || !selectedMaterialId}
                                className={cn(
                                    "w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg",
                                    simulating 
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                        : "bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95"
                                )}
                            >
                                {simulating ? <RefreshCcw className="animate-spin" size={16} /> : <Zap size={16} />}
                                Simulate Ingestion
                            </button>
                        </CardContent>
                    </Card>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4 shadow-sm shadow-emerald-100">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Network Status</h4>
                            <p className="text-[11px] font-medium text-emerald-600 italic">Gateway is listening for encrypted TCP/IP traffic from standard MQTT weight scales.</p>
                        </div>
                    </div>

                    <div className="saas-card p-6 bg-slate-900 border-none text-white relative overflow-hidden group">
                        <div className="absolute -bottom-4 -right-4 text-white/5 rotate-12 group-hover:scale-110 transition-transform">
                            <Cpu size={80} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Remote Vision Link</h4>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Configured</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xl font-black">{localStorage.getItem('esp32-ip') || '172.20.10.12'}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Active AI Scanner Node</p>
                            </div>
                            <div className="pt-2">
                                <span className="text-[9px] font-black px-2 py-1 bg-white/5 rounded-md text-slate-400 border border-white/5 uppercase">Port: {localStorage.getItem('esp32-port') || '81'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real-time Log */}
                <Card className="lg:col-span-2 border-none shadow-2xl shadow-slate-200 bg-slate-900 flex flex-col min-h-[500px]">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <Database size={14} className="text-primary" />
                            Live Telemetry Stream
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase">Live</span>
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 space-y-4">
                                <RefreshCcw size={48} />
                                <p className="text-[10px] uppercase font-bold tracking-tighter">Waiting for device signals...</p>
                            </div>
                        )}
                        {logs.map(log => (
                            <div key={log.id} className={cn(
                                "p-3 rounded-lg border flex flex-col gap-1 transition-all animate-in slide-in-from-right-4",
                                log.status === 'success' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500">[{log.timestamp.toLocaleTimeString()}]</span>
                                        <span className={cn(
                                            "text-[10px] font-black px-1.5 py-0.5 rounded",
                                            log.status === 'success' ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
                                        )}>
                                            {log.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 uppercase">{log.type} // {log.weight}kg</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px]">
                                    <span className="text-primary font-bold">{log.materialName}</span>
                                    <span className="text-slate-300">→</span>
                                    <span className={cn(
                                        "font-medium",
                                        log.status === 'success' ? "text-slate-100" : "text-rose-300"
                                    )}>{log.message}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-black/30 border-t border-white/5 flex items-center justify-between text-[10px]">
                        <div className="flex gap-4">
                            <span className="text-slate-500 font-bold uppercase"><span className="text-primary tracking-widest">MTU:</span> 1500</span>
                            <span className="text-slate-500 font-bold uppercase"><span className="text-secondary tracking-widest">Protocol:</span> MQTT/WS</span>
                        </div>
                        <span className="text-slate-600 font-medium italic">Simulated via Frontend Gateway</span>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default IoTConsole;
