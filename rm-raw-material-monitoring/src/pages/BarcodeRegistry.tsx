import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
    QrCode, 
    Box, 
    Search, 
    Plus, 
    Filter, 
    Download, 
    Trash2, 
    Edit, 
    Save, 
    X, 
    History, 
    Eye,
    Layers, 
    Printer, 
    RefreshCw, 
    MapPin, 
    Calendar, 
    Scale, 
    Tag 
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/Card';
import QRPreview from '../components/qr/QRPreview';

export const BarcodeRegistry = () => {
    const [formData, setFormData] = useState({
        paintName: '',
        standardName: '',
        barcodeId: '',
        batchNumber: '',
        manufactureDate: '',
        expiryDate: '',
        location: '',
        weight: ''
    });
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Phase 4: History & Print & Industrial View
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [printTarget, setPrintTarget] = useState<any>(null);
    const [viewTarget, setViewTarget] = useState<any>(null);
    const [dbHealth, setDbHealth] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [generatedQR, setGeneratedQR] = useState<{
        qrCode: string;
        materialName: string;
        batchNumber: string;
        rackCode: string;
        barcodeId: string;
    } | null>(null);

    const fetchHistory = async () => {
        try {
            const { data } = await api.getSKUs();
            setHistoryList(data || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const fetchNextId = async () => {
        try {
            const res = await api.getNextRegistryId();
            if (res.nextId) {
                setFormData(prev => ({ ...prev, barcodeId: res.nextId }));
            } else {
                console.warn('Backend returned no nextId (DB might be offline)');
                // Fallback for offline mode: generate a temporary ID
                const offId = `PB-OFF-${Math.floor(1000 + Math.random() * 9000)}`;
                setFormData(prev => ({ ...prev, barcodeId: offId }));
            }
        } catch (err: any) {
            console.error('Failed to fetch next ID (Offline Fallback Active):', err);
            const offId = `PB-OFF-${Math.floor(1000 + Math.random() * 9000)}`;
            setFormData(prev => ({ ...prev, barcodeId: offId }));
            toast.error('MySQL Offline: Generated Temporary ID for QR Printing');
        }
    };

    const handleDownload = (base64Url: string, identifier: string) => {
        const qrImageSrc = base64Url.startsWith('data:') || base64Url.startsWith('http')
            ? base64Url
            : `http://localhost:5000/${base64Url}`;
        const link = document.createElement('a');
        link.href = qrImageSrc;
        link.download = `QR_${identifier}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${identifier} locally!`);
    };

    useEffect(() => {
        fetchNextId();
        fetchHistory();
        
        const checkHealth = async () => {
            try {
                const res = await api.getHealth();
                setDbHealth(res.db);
            } catch (err) {
                setDbHealth('disconnected');
            }
        };
        
        checkHealth();
        const interval = setInterval(checkHealth, 5000);

        const handleAfterPrint = () => setPrintTarget(null);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => {
             window.removeEventListener('afterprint', handleAfterPrint);
             clearInterval(interval);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const generateQRCode = async () => {
        const { paintName, barcodeId, batchNumber, manufactureDate, expiryDate, location, weight } = formData;
        
        const parsedWeight = parseFloat(weight.toString().trim());
        
        if (!paintName.trim()) {
            toast.error('Technical Paint Name is required');
            return null;
        }
        if (!barcodeId.trim()) {
            toast.error('Registry Identity ID is missing. Click the refresh icon to generate one.');
            return null;
        }
        if (!batchNumber.trim()) {
            toast.error('Production Batch is required');
            return null;
        }
        if (isNaN(parsedWeight) || parsedWeight <= 0) {
            toast.error('Net Mass Payload must be a valid number greater than 0');
            return null;
        }

        const dataToEncode = {
            sku_id: barcodeId,
            paint_name: paintName,
            batch: batchNumber,
            location: location,
            manufacture_date: manufactureDate,
            expiry_date: expiryDate,
            weight: parsedWeight
        };

        try {
            const url = await QRCode.toDataURL(JSON.stringify(dataToEncode), {
                width: 512,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            setQrDataUrl(url);
            return url;
        } catch (err) {
            toast.error('Failed to generate QR Code');
            return null;
        }
    };

    const handleSave = async () => {
        const { paintName, batchNumber, manufactureDate, location, weight } = formData;
        
        const parsedWeight = parseFloat(weight);
        if (!paintName.trim()) {
            toast.error('Technical Paint Name is required');
            return;
        }
        if (!batchNumber.trim()) {
            toast.error('Production Batch is required');
            return;
        }
        if (isNaN(parsedWeight) || parsedWeight <= 0) {
            toast.error('Net Mass Payload must be a valid number greater than 0');
            return;
        }

        setIsSaving(true);
        try {
            // Call backend API for QR generation & database registration
            const res = await api.generateQR({
                material_name: paintName,
                weight: parsedWeight,
                batch_number: batchNumber,
                manufacturing_date: manufactureDate || null,
                rack_code: location || null
            });

            if (res.status === 'success' || res.barcode_id) {
                // Store in state to render QRPreview modal
                setGeneratedQR({
                    qrCode: res.qr_image_path,
                    materialName: res.material_name,
                    batchNumber: res.batch_number || batchNumber,
                    rackCode: res.rack_code || location,
                    barcodeId: res.barcode_id
                });

                setFormData({
                    paintName: '',
                    standardName: '',
                    barcodeId: '',
                    batchNumber: '',
                    manufactureDate: '',
                    expiryDate: '',
                    location: '',
                    weight: ''
                });
                setQrDataUrl('');
                
                fetchNextId();
                fetchHistory();
            } else {
                toast.error('Failed to generate QR and register paint');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to connect to backend for QR generation');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        <div className="space-y-10 animate-fade-in text-slate-900 pb-20 print:hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Paint Registry</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Register new paints and generate JSON-encoded QR barcodes for industrial tracking.</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                    <div className={cn(
                        "flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest leading-none transition-all shadow-sm",
                        dbHealth === 'connected' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                        dbHealth === 'disconnected' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                        'bg-slate-100 text-slate-400 border-slate-200'
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            dbHealth === 'connected' ? 'bg-emerald-500' :
                            dbHealth === 'disconnected' ? 'bg-red-500' : 'bg-slate-400'
                        )} />
                        {dbHealth === 'connected' ? 'Backend Online' : dbHealth === 'disconnected' ? 'Backend Offline (Mock RAM Active)' : 'Loading Health...'}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
                {/* Form Section */}
                <div className="lg:col-span-8 space-y-8 print:hidden">
                    <Card className="premium-card overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Tag size={18} className="text-primary" />
                                Specification Payload
                            </h2>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Technical Paint Name</label>
                                    <div className="relative group">
                                        <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            name="paintName"
                                            value={formData.paintName}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-300"
                                            placeholder="e.g. Industrial Sapphire Gloss"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Standard Classification</label>
                                    <input
                                        type="text"
                                        name="standardName"
                                        value={formData.standardName}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold"
                                        placeholder="e.g. Paint"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Registry Identity ID</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            name="barcodeId"
                                            value={formData.barcodeId}
                                            onChange={(e) => setFormData({ ...formData, barcodeId: e.target.value })}
                                            className={cn(
                                                "flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-mono font-black tracking-wider focus:ring-4 focus:ring-primary/10 transition-all",
                                                dbHealth !== 'connected' && "bg-amber-50 border-amber-200"
                                            )}
                                        />
                                        <button onClick={fetchNextId} className="p-4 bg-white border border-slate-200 hover:border-primary/30 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm">
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Production Batch</label>
                                    <input
                                        type="text"
                                        name="batchNumber"
                                        value={formData.batchNumber}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold uppercase placeholder:text-slate-300"
                                        placeholder="BATCH-2026-X"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Deployment Location</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-300"
                                            placeholder="SHELF-A1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Manufacture Date</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="date"
                                            name="manufactureDate"
                                            value={formData.manufactureDate}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Safety Expiry Date</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="date"
                                            name="expiryDate"
                                            value={formData.expiryDate}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Net Mass Payload (kg)</label>
                                    <div className="relative group">
                                        <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="number"
                                            name="weight"
                                            value={formData.weight}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-300"
                                            placeholder="50"
                                        />
                                    </div>
                                </div>


                            </div>
                        </div>
                    </Card>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="premium-card bg-slate-50 flex flex-col items-center justify-center relative min-h-[480px] p-8 border-dashed border-slate-300">
                        <div className="absolute top-6 left-6 flex items-center gap-2 print:hidden">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Industrial Output Lvl 4</span>
                        </div>

                        <div id="printable-qr" className="bg-white p-8 rounded-3xl shadow-2xl mt-4 border border-slate-100 group hover:scale-105 transition-transform duration-500">
                            {qrDataUrl ? (
                                <div className="flex flex-col items-center">
                                    <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
                                    <div className="mt-6 text-center">
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Active SKU</span>
                                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">Registered</span>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter">{formData.barcodeId}</p>
                                        <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-full shadow-[0_0_8px_var(--primary)]" />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em] leading-none">Universal Standard ID</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-56 h-56 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-300">
                                    <QrCode className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-[10px] uppercase font-black tracking-widest text-center px-6 leading-relaxed">System awaiting data for serialization</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full space-y-3 mt-10 print:hidden px-4">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Save className="w-5 h-5" />
                                {isSaving ? 'Serializing...' : 'Commit to Ledger'}
                            </button>
                            <button
                                onClick={() => window.print()}
                                disabled={!qrDataUrl}
                                className="w-full bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-600 font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95 group shadow-sm"
                            >
                                <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Production Print
                            </button>
                        </div>
                    </Card>

                    <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex gap-4 print:hidden">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <RefreshCw size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Active Edge Protocol</p>
                            <p className="text-xs text-amber-700 font-medium leading-relaxed">The metadata within this QR exceeds standard EAN-13 limits. Only Industrial Smart Scanners can decode this payload.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historical Grid */}
            <div className="mt-12 pt-12 border-t border-slate-200 print:hidden relative">
                <div className="absolute top-0 right-10 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full" />
                <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                    <History className="text-primary w-8 h-8 p-1.5 bg-primary/10 rounded-xl" /> 
                    Cloud Ledger Archive
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {historyList.map(qr => (
                        <div key={qr.id} className="bg-slate-900 rounded-3xl p-6 flex flex-col gap-6 group hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.25)] hover:border-emerald-500/50 transition-all duration-500 relative border border-slate-800 overflow-hidden shrink-0">
                            {/* Decorative Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-all" />
                            
                            <div className="flex gap-5 items-start relative z-10 w-full overflow-hidden">
                                <div className="bg-white p-2 rounded-2xl shrink-0 shadow-lg shadow-black/50 border-[3px] border-slate-800">
                                    <img 
                                        src={qr.qrCodeImage?.startsWith('data:') || qr.qrCodeImage?.startsWith('http') 
                                            ? qr.qrCodeImage 
                                            : `http://localhost:5000/${qr.qrCodeImage}`} 
                                        alt="QR" 
                                        className="w-20 h-20 object-contain" 
                                    />
                                </div>
                                
                                <div className="flex-1 w-full min-w-0 flex flex-col justify-between h-full py-1">
                                    <div>
                                        <div className="flex justify-between items-start w-full gap-2">
                                            <p className="font-black text-white text-lg truncate flex-1 leading-none">{qr.registrationId}</p>
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] shrink-0 border whitespace-nowrap shadow-sm", 
                                                qr.status === 'Used' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                            )}>
                                                {qr.status || 'Active'}
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2.5 truncate">Batch / {qr.batchNumber}</p>
                                    </div>
                                    <p className="text-2xl font-black text-emerald-400 mt-2 truncate leading-none">
                                        {qr.weight} <span className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold">KG Mass</span>
                                    </p>
                                </div>
                            </div>
                            
                            {/* Action Ribbon */}
                            <div className="grid grid-cols-3 gap-3 relative z-10 pt-4 border-t border-slate-800/80">
                                <button 
                                    onClick={() => setViewTarget(qr)} 
                                    className="flex items-center justify-center gap-2 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-wider backdrop-blur-sm group/btn"
                                >
                                    <Eye size={16} className="group-hover/btn:scale-110 transition-transform text-slate-500 group-hover/btn:text-white" /> View
                                </button>
                                <button 
                                    onClick={() => handleDownload(qr.qrCodeImage, qr.registrationId)} 
                                    className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500 rounded-xl transition-all text-emerald-500 hover:text-white font-black text-[9px] uppercase tracking-wider backdrop-blur-sm shadow-sm border border-emerald-500/20 hover:border-transparent group/btn"
                                >
                                    <Download size={16} className="group-hover/btn:-translate-y-0.5 transition-transform" /> Save
                                </button>
                                <button 
                                    onClick={() => { 
                                        setPrintTarget(qr); 
                                        setTimeout(() => window.print(), 100); 
                                    }} 
                                    className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-200 rounded-xl transition-all text-slate-900 font-black text-[9px] uppercase tracking-wider shadow-lg group/btn"
                                >
                                    <Printer size={16} className="group-hover/btn:scale-110 transition-transform" /> Print
                                </button>
                            </div>
                        </div>
                    ))}
                    {historyList.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <Box className="w-16 h-16 opacity-20 mb-4" />
                            <p className="font-black uppercase tracking-[0.2em] text-sm">Registry Offline</p>
                            <p className="text-[10px] uppercase font-bold mt-2 opacity-50 tracking-widest">No tags have been archived yet</p>
                        </div>
                    )}
                </div>
        </div>

            {/* Print Only View */}
            <div id="print-area" className="hidden print:flex flex-col items-center justify-center h-screen bg-white w-full">
                <div className="flex flex-col items-center text-center">
                    <img 
                        src={printTarget 
                            ? (printTarget.qrCodeImage?.startsWith('data:') || printTarget.qrCodeImage?.startsWith('http') 
                                ? printTarget.qrCodeImage 
                                : `http://localhost:5000/${printTarget.qrCodeImage}`)
                            : (qrDataUrl || undefined)
                        } 
                        alt="QR" 
                        className="w-[80mm] h-[80mm] border-[4pt] border-black p-2" 
                    />
                    <div className="mt-6 w-full">
                        <h1 className="text-3xl font-black tracking-tighter uppercase leading-tight text-black max-w-[80mm] text-center">
                            {printTarget ? printTarget.paintName : formData.paintName}
                        </h1>
                    </div>
                </div>
            </div>
        </div>

            {generatedQR && (
                <QRPreview
                    qrCode={generatedQR.qrCode}
                    materialName={generatedQR.materialName}
                    batchNumber={generatedQR.batchNumber}
                    rackCode={generatedQR.rackCode}
                    barcodeId={generatedQR.barcodeId}
                    onClose={() => setGeneratedQR(null)}
                />
            )}

            {/* JSON Payload Viewer Modal */}
            {viewTarget && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 print:hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setViewTarget(null)} />
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <Eye className="text-emerald-500" /> Decoded Payload
                                </h3>
                                <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mt-1">Raw JSON Serialization Data</p>
                            </div>
                            <button onClick={() => setViewTarget(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto w-full">
                            <pre className="bg-[#0d1117] text-emerald-400 p-6 rounded-2xl overflow-x-auto text-[11px] font-mono border border-slate-800 shadow-inner break-words whitespace-pre-wrap leading-relaxed shadow-emerald-500/5">
                                {(() => {
                                    try {
                                        return JSON.stringify(viewTarget, null, 4);
                                    } catch {
                                        return "No valid JSON payload configured.";
                                    }
                                })()}
                            </pre>
                        </div>
                        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-end gap-3">
                            <button onClick={() => setViewTarget(null)} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md">
                                Exit Matrix
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
