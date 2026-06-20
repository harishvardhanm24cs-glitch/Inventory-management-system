import React, { useState } from 'react';
import { QrCode, Loader2, CheckCircle2, AlertCircle, ArrowDown, Sparkles, Box, MapPin, Download, RefreshCw } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import api from '../services/api';
import { cn } from '../lib/utils';

interface GeneratedQR {
    barcode_id: string;
    qr_image_path: string;
}

const BulkQRGenerator = () => {
    const { refreshData } = useInventory();
    
    const [materialName, setMaterialName] = useState('');
    const [buckets, setBuckets] = useState<number | ''>('');
    const [qtyPerBucket, setQtyPerBucket] = useState<number | ''>('');
    const [rackCode, setRackCode] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setGeneratedQRs([]);

        if (!materialName.trim()) {
            setErrorMsg('Material Name is required');
            return;
        }
        if (!buckets || Number(buckets) <= 0) {
            setErrorMsg('Number of buckets must be greater than 0');
            return;
        }
        if (!qtyPerBucket || Number(qtyPerBucket) <= 0) {
            setErrorMsg('Quantity per bucket must be greater than 0');
            return;
        }

        setIsGenerating(true);

        try {
            const res = await api.bulkGenerateQR({
                material_name: materialName.trim(),
                quantity: Number(buckets),
                rack_code: rackCode.trim() || undefined,
                units: Number(qtyPerBucket)
            });

            if (res && res.success) {
                setSuccessMsg(`Successfully generated ${res.generated} QR labels for ${materialName.trim()}!`);
                setGeneratedQRs(res.data || []);
                
                // Reset form fields
                setMaterialName('');
                setBuckets('');
                setQtyPerBucket('');
                setRackCode('');

                // Trigger automatic refresh of the global inventory context (overview, batch, list views)
                await refreshData();
                window.dispatchEvent(new CustomEvent('rack-inventory-update'));
                if (typeof (window as any).refreshDigitalTwin === 'function') {
                    (window as any).refreshDigitalTwin();
                }
            } else {
                setErrorMsg(res?.message || 'Failed to generate QR codes.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'An error occurred during bulk generation.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = (path: string, id: string) => {
        // Form absolute URL to image file
        const imageUrl = `http://localhost:5000${path}`;
        
        // Trigger file download helper
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `qr_${id}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 space-y-6 animate-saas-fade">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <QrCode className="text-primary" />
                        Bulk QR Label Generator
                    </h1>
                    <p className="text-slate-500 text-sm">Generate and register sequentially tracked raw material labels in bulk.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Form Card */}
                <div className="glass-panel p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-6 lg:col-span-1">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                            <Sparkles size={16} className="text-primary animate-pulse" />
                            Configuration Panel
                        </h3>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Material Name</label>
                            <input
                                type="text"
                                value={materialName}
                                onChange={(e) => setMaterialName(e.target.value)}
                                placeholder="e.g. Dark Blue Paint"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">No. of Buckets</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={buckets}
                                    onChange={(e) => setBuckets(e.target.value ? parseInt(e.target.value, 10) : '')}
                                    placeholder="e.g. 5"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Qty per Bucket (KG)</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    step="any"
                                    value={qtyPerBucket}
                                    onChange={(e) => setQtyPerBucket(e.target.value ? parseFloat(e.target.value) : '')}
                                    placeholder="e.g. 50"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Assign Rack Code (Optional)</label>
                            <input
                                type="text"
                                value={rackCode}
                                onChange={(e) => setRackCode(e.target.value)}
                                placeholder="e.g. A1"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-slate-800"
                            />
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600 text-xs font-semibold">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-emerald-650 text-xs font-semibold">
                                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generating QR Batch...
                                </>
                            ) : (
                                <>
                                    <QrCode size={16} />
                                    Generate QR Labels
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Previews Panel */}
                <div className="glass-panel p-6 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-6 lg:col-span-2 min-h-[400px] flex flex-col">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                            <Box size={16} className="text-primary" />
                            Batch Output Previews
                        </h3>
                        {generatedQRs.length > 0 && (
                            <span className="text-[10px] font-black text-slate-455 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                Labels generated: {generatedQRs.length}
                            </span>
                        )}
                    </div>

                    {generatedQRs.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[500px] pr-2">
                            {generatedQRs.map((qr) => (
                                <div key={qr.barcode_id} className="saas-card p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col items-center justify-between text-center relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                                    <div className="w-full flex justify-between items-start mb-2">
                                        <span className="text-[9px] font-black text-primary bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase font-sans">
                                            Registered
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                                            #{qr.barcode_id}
                                        </span>
                                    </div>
                                    
                                    <div className="my-3 p-2 bg-white rounded-xl border border-slate-150 shadow-sm relative group-hover:scale-105 transition-transform duration-300">
                                        <img
                                            src={qr.qr_image_path ? `http://localhost:5000${qr.qr_image_path}` : ''}
                                            alt={`QR ${qr.barcode_id}`}
                                            className="w-28 h-28 object-contain"
                                        />
                                    </div>
                                    
                                    <div className="w-full mt-2 pt-2 border-t border-slate-200/60 flex justify-between items-center">
                                        <button
                                            onClick={() => qr.qr_image_path && handleDownload(qr.qr_image_path, qr.barcode_id)}
                                            disabled={!qr.qr_image_path}
                                            className="p-1.5 bg-white border border-slate-200 disabled:bg-slate-350 disabled:cursor-not-allowed text-slate-600 hover:text-primary rounded-lg shadow-sm hover:border-primary transition-colors flex items-center justify-center gap-1 text-[10px] font-bold w-full"
                                        >
                                            <Download size={12} />
                                            Download PNG
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                            <QrCode size={40} className="stroke-[1.2] mb-3 text-slate-300 animate-pulse" />
                            <p className="text-xs font-semibold text-slate-450">No generated labels to display.</p>
                            <p className="text-[11px] text-slate-400 mt-1">Configure parameters in the left panel to output new QR codes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkQRGenerator;
