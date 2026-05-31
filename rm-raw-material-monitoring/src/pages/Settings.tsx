import { useState } from 'react';
import { Save, Info } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

const Settings = () => {
    const { materials, updateMaterialLimits } = useInventory();
    const { theme, setTheme } = useTheme();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [limits, setLimits] = useState({ min: 0, critical: 0 });

    const handleEdit = (material: any) => {
        setEditingId(material.id);
        setLimits({ min: material.minLimit, critical: material.criticalLimit });
    };

    const handleSave = () => {
        if (editingId) {
            updateMaterialLimits(editingId, limits.min, limits.critical);
            setEditingId(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Threshold Configuration</h1>
                    <p className="text-sm text-gray-500">Manage stock limits and automated alert triggers</p>
                </div>
            </div>

            <div className="space-y-4">
                {materials.map((m) => (
                    <Card key={m.id} className={cn(
                        "border-none shadow-xl transition-all overflow-hidden",
                        editingId === m.id ? "ring-2 ring-primary bg-white" : "glass-panel bg-white/40"
                    )}>
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                                <div className="flex-1 flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {m.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-tight">{m.name}</h3>
                                        <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tight">{m.id}</p>
                                    </div>
                                </div>

                                {editingId === m.id ? (
                                    <div className="flex flex-wrap items-end gap-4 animate-scale-in">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Low Limit ({m.unit})</label>
                                            <input
                                                type="number"
                                                className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                                                value={limits.min}
                                                onChange={(e) => setLimits({ ...limits, min: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 text-red-400">Critical Limit ({m.unit})</label>
                                            <input
                                                type="number"
                                                className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                                                value={limits.critical}
                                                onChange={(e) => setLimits({ ...limits, critical: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={handleSave} size="sm" className="rounded-lg h-9">
                                                <Save size={16} className="mr-2" /> Save
                                            </Button>
                                            <Button variant="ghost" onClick={() => setEditingId(null)} size="sm" className="h-9">
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-8 items-center">
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Low</p>
                                            <p className="text-sm font-bold text-gray-700">{m.minLimit} {m.unit}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest leading-none mb-1">Critical</p>
                                            <p className="text-sm font-bold text-red-500">{m.criticalLimit} {m.unit}</p>
                                        </div>
                                        <Button variant="ghost" onClick={() => handleEdit(m)} size="sm" className="rounded-lg h-9 border border-gray-200 hover:border-primary/50 text-gray-500 hover:text-primary">
                                            Configure
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <section className="space-y-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Hardware & Vision
                </div>
                <Card className="border-none shadow-xl glass-panel overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="font-bold text-foreground tracking-tight">ESP32 Camera Configuration</h3>
                                <p className="text-xs text-gray-500 mt-1">Specify your IP camera endpoint for remote scanning</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-md">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Camera IP Address</label>
                                    <input
                                        type="text"
                                        placeholder="http://172.20.10.12"
                                        className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                                        value={localStorage.getItem('esp32-ip') || 'http://172.20.10.12'}
                                        onChange={(e) => {
                                            localStorage.setItem('esp32-ip', e.target.value);
                                            window.dispatchEvent(new Event('storage')); // Trigger update if other tabs are listening
                                        }}
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Stream Port</label>
                                    <input
                                        type="text"
                                        placeholder="81"
                                        className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                                        value={localStorage.getItem('esp32-port') || '81'}
                                        onChange={(e) => {
                                            localStorage.setItem('esp32-port', e.target.value);
                                            window.dispatchEvent(new Event('storage'));
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="space-y-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Account Preferences
                </div>
                <Card className="border-none shadow-xl glass-panel overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-foreground tracking-tight">System Theme</h3>
                                <p className="text-xs text-gray-500 mt-1">Select your preferred industrial interface style</p>
                            </div>
                            <div className="flex gap-2">
                                {(['light', 'dark', 'high-contrast'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTheme(t)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold transition-all border capitalize",
                                            theme === t
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-white/50 text-gray-500 border-gray-200 hover:border-primary/50"
                                        )}
                                    >
                                        {t.replace('-', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <div className="flex items-start gap-4 p-6 glass-panel rounded-2xl border-none shadow-lg text-sm text-gray-500">
                <Info size={20} className="text-primary shrink-0 mt-0.5" />
                <p>
                    Thresholds are used for real-time monitoring. When stock levels drop below these limits, the system will automatically
                    trigger alerts and notify relevant production roles.
                </p>
            </div>
        </div>
    );
};

export default Settings;
