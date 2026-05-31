import React, { useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import { PackagePlus, Save, Printer, Layers, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { Card, CardContent } from '../components/ui/Card';

export const CreateBarcode = () => {
    const [paintName, setPaintName] = useState('');
    const [paintWeight, setPaintWeight] = useState('');
    const [barcodeId, setBarcodeId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isBulk, setIsBulk] = useState(false);
    const [bulkCount, setBulkCount] = useState(1);
    const [bulkLabels, setBulkLabels] = useState<any[]>([]);

    const fetchNextId = async () => {
        try {
            const data = await api.getNextBarcodeId();
            setBarcodeId(data.nextId);
        } catch (error) {
            console.error('Failed to fetch next ID:', error);
        }
    };

    useEffect(() => {
        if (!isBulk) {
            fetchNextId();
        }
    }, [isBulk]);

    const handleBulkGenerate = async () => {
        if (!paintName || !paintWeight || bulkCount <= 0) {
            toast.error('Please enter Name, Weight, and a valid Count.');
            return;
        }

        try {
            const { nextId } = await api.getNextBarcodeId();
            const startNumMatch = nextId.match(/\d+/);
            const startNum = startNumMatch ? parseInt(startNumMatch[0]) : 1;
            
            const newLabels = [];
            for (let i = 0; i < bulkCount; i++) {
                const currentNum = startNum + i;
                const currentId = `RM${currentNum.toString().padStart(4, '0')}`;
                newLabels.push({
                    barcodeId: currentId,
                    paintName,
                    paintWeight: parseFloat(paintWeight)
                });
            }
            setBulkLabels(newLabels);
            setBarcodeId(newLabels[0].barcodeId);
            toast.success(`Generated ${bulkCount} sequential labels preview.`);
        } catch (error) {
            toast.error('Failed to generate bulk IDs.');
        }
    };

    const handleSave = async () => {
        if (!paintName || !paintWeight || (!barcodeId && !isBulk)) {
            toast.error('Please fill all fields and generate a barcode.');
            return;
        }

        const weight = parseFloat(paintWeight);
        if (isNaN(weight) || weight <= 0) {
            toast.error('Weight must be a positive number.');
            return;
        }

        setIsSaving(true);
        try {
            if (isBulk) {
                if (bulkLabels.length === 0) {
                    toast.error('Please generate batch labels first.');
                    setIsSaving(false);
                    return;
                }
                await api.bulkCreateBarcodeMaster(bulkLabels);
                toast.success(`${bulkLabels.length} Barcodes saved to registry!`);
                setBulkLabels([]);
            } else {
                await api.createBarcodeMaster({
                    barcodeId,
                    paintName,
                    paintWeight: weight
                });
                toast.success('Barcode Master saved securely!');
                fetchNextId();
            }
            setPaintName('');
            setPaintWeight('');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save barcode.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-10 animate-fade-in text-slate-900 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                        <PackagePlus size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">Barcode Registry</h1>
                        <p className="text-sm text-slate-500 font-medium mt-2">Industrial ID generation and label management system.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsBulk(!isBulk)}
                        className={cn(
                            "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 border shadow-sm",
                            isBulk 
                                ? "bg-amber-500 border-amber-500 text-white shadow-amber-100" 
                                : "bg-white border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300"
                        )}
                    >
                        <Layers size={18} />
                        {isBulk ? 'Bulk Mode Active' : 'Switch to Bulk'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
                {/* Form Section */}
                <div className="lg:col-span-7 space-y-8 print:hidden">
                    <Card className="premium-card overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                {isBulk ? <Layers size={18} className="text-amber-500" /> : <PackagePlus size={18} className="text-primary" />}
                                {isBulk ? 'Batch Registration Payload' : 'Material Identity Unit'}
                            </h2>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Technical Descriptor</label>
                                    <input
                                        type="text"
                                        value={paintName}
                                        onChange={(e) => setPaintName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-300"
                                        placeholder="e.g. Resin Polymer X-1 High Visc"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Net Mass (kg)</label>
                                        <input
                                            type="number"
                                            value={paintWeight}
                                            onChange={(e) => setPaintWeight(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-300"
                                            placeholder="50"
                                        />
                                    </div>
                                    {isBulk && (
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Serialization Count</label>
                                            <input
                                                type="number"
                                                value={bulkCount}
                                                onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold"
                                                placeholder="10"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isBulk ? (
                                <div className="p-8 rounded-3xl bg-slate-900 text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <p className="text-[10px] uppercase font-black text-primary tracking-[0.3em] mb-1">Assigned Sequential ID</p>
                                        <p className="text-4xl font-mono font-black tracking-tighter uppercase">{barcodeId || 'SYSCAL...'}</p>
                                    </div>
                                    <button onClick={fetchNextId} className="relative z-10 p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/5 active:scale-95">
                                        <RefreshCw className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleBulkGenerate}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-[0.2em] py-6 rounded-2xl transition-all shadow-xl shadow-amber-100 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Layers size={20} />
                                    Engage Sequential Batch Script
                                </button>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-5 space-y-8">
                    <Card className="premium-card bg-slate-50 p-10 flex flex-col items-center justify-center min-h-[400px] relative border-dashed border-slate-300">
                        <div className="absolute top-6 left-6 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Production Lens</span>
                        </div>

                        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl my-6 group hover:scale-105 transition-transform duration-500 border border-slate-100">
                             {barcodeId ? (
                                <div className="flex flex-col items-center">
                                    <Barcode 
                                        value={barcodeId} 
                                        format="CODE128" 
                                        width={2.2} 
                                        height={100}
                                        fontOptions="bold"
                                        fontSize={20}
                                        background="#ffffff"
                                        lineColor="#0f172a"
                                    />
                                    <div className="mt-8 text-center space-y-2">
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{paintName || 'PENDING NAME'}</p>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{paintWeight || '00'} KG • STANDARDIZED</span>
                                        </div>
                                    </div>
                                </div>
                             ) : (
                                <div className="w-64 h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-300">
                                    <div className="opacity-10 grayscale mb-4">
                                        <Barcode value="RM0000" format="CODE128" height={60} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center px-6">Input registry data to generate lens</p>
                                </div>
                             )}
                        </div>

                        <div className="w-full flex gap-4 mt-8 px-2">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !barcodeId}
                                className="flex-[2] bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-black text-xs uppercase tracking-[0.2em] py-6 rounded-2xl transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Save size={20} />
                                {isSaving ? 'Saving...' : isBulk ? `Commit Batch (${bulkLabels.length})` : 'Commit to Master'}
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-black text-xs uppercase tracking-[0.2em] py-6 rounded-2xl transition-all flex items-center justify-center gap-3 hover:shadow-lg active:scale-95 group"
                            >
                                <Printer size={20} className="group-hover:scale-110 transition-transform" />
                                Print
                            </button>
                        </div>
                    </Card>

                    <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 shadow-sm">
                            <Layers size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">System Serialization</p>
                            <p className="text-xs text-indigo-700 font-medium leading-relaxed">Generated IDs follow the ISO-9021 industrial standard for raw material traceability.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Only View */}
            <div className="hidden print:block w-full h-full p-8">
                <div className="grid grid-cols-2 gap-10">
                    {(isBulk && bulkLabels.length > 0 ? bulkLabels : [{barcodeId, paintName, paintWeight}]).map((label, idx) => (
                        <div key={idx} className="border-4 border-black p-10 flex flex-col items-center page-break-avoid rounded-none bg-white">
                            {label.barcodeId && (
                                <Barcode 
                                    value={label.barcodeId} 
                                    format="CODE128" 
                                    width={2} 
                                    height={80}
                                    fontSize={18}
                                />
                            )}
                            <div className="text-center mt-6 space-y-2">
                                <p className="text-3xl font-black text-black uppercase tracking-tighter leading-none">{label.paintName}</p>
                                <div className="h-2 bg-black w-full" />
                                <p className="text-xl font-bold text-black">{label.paintWeight} KG • INDUSTRIAL GRADE • RM STANDARD</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
