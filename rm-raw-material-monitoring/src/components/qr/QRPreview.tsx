import React, { useEffect } from 'react';
import { Download, Printer, X, Tag, Package, Calendar, Layers, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface QRPreviewProps {
    qrCode: string; // File path (e.g., uploads/qr_BAR-...) or Base64 string
    materialName: string;
    batchNumber: string;
    rackCode: string;
    barcodeId: string;
    onClose: () => void;
}

const QRPreview: React.FC<QRPreviewProps> = ({
    qrCode,
    materialName,
    batchNumber,
    rackCode,
    barcodeId,
    onClose
}) => {
    // Determine the correct image source (either direct Base64 or backend static file server path)
    const qrImageSrc = qrCode.startsWith('data:') || qrCode.startsWith('http')
        ? qrCode
        : `http://localhost:5000/${qrCode}`;

    // Success notification on mount
    useEffect(() => {
        toast.success("QR Code Generated successfully! ✅");
    }, []);

    const handleDownload = () => {
        try {
            const link = document.createElement('a');
            link.href = qrImageSrc;
            // Set crossOrigin to allow downloading from port 5000 if needed (or let the browser handle it)
            link.setAttribute('download', `QR_${barcodeId}.png`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("QR image download started!");
        } catch (err) {
            console.error("Download failed:", err);
            toast.error("Failed to download QR code image.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* Modal Overlay */}
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 print:hidden animate-[fadeIn_0.2s_ease-out_forwards]">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
                
                {/* Modal Container */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col md:flex-row animate-[scaleIn_0.3s_ease-out_forwards]">
                    {/* Left Column: Visual QR code presentation */}
                    <div className="md:w-1/2 bg-slate-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100">
                        <div className="absolute top-6 left-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vision Output Master</span>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100/50 flex flex-col items-center mt-4">
                            <img src={qrImageSrc} alt="QR Code" className="w-48 h-48 object-contain" />
                            <p className="mt-4 font-mono font-black text-slate-900 tracking-wider text-sm uppercase">{barcodeId}</p>
                        </div>
                    </div>

                    {/* Right Column: Metadata details & actions */}
                    <div className="md:w-1/2 p-8 flex flex-col justify-between">
                        {/* Close button */}
                        <button 
                            onClick={onClose} 
                            className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                        >
                            <X size={18} />
                        </button>

                        <div className="space-y-6 mt-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 leading-none tracking-tight flex items-center gap-2">
                                    <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" /> QR Code Preview
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Industrial Label Details</p>
                            </div>

                            {/* Metadata list */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                                        <Package size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Material Name</p>
                                        <p className="text-xs font-black text-slate-800 mt-1 truncate">{materialName}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                                        <Tag size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Batch Number</p>
                                        <p className="text-xs font-black text-slate-800 mt-1 truncate">{batchNumber}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                                        <Layers size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Rack Code</p>
                                        <p className="text-xs font-black text-slate-800 mt-1 truncate uppercase">{rackCode}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 shrink-0">
                                        <Tag size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Barcode Registry ID</p>
                                        <p className="text-xs font-black text-slate-800 mt-1 truncate uppercase">{barcodeId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleDownload}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Download
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                <Printer size={14} className="group-hover:scale-110 transition-transform" /> Print
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Print Area specifically for printing this QR code */}
            <div id="print-area" className="hidden print:flex flex-col items-center justify-center h-screen bg-white w-full">
                <div className="flex flex-col items-center text-center p-8 border-[4pt] border-black rounded-none">
                    <img src={qrImageSrc} alt="QR Code" className="w-[80mm] h-[80mm]" />
                    <div className="mt-6 space-y-2">
                        <h1 className="text-3xl font-black uppercase tracking-tighter leading-none text-black max-w-[90mm]">
                            {materialName}
                        </h1>
                        <p className="text-md font-bold text-black uppercase tracking-wider">
                            ID: {barcodeId} • BATCH: {batchNumber} • RACK: {rackCode}
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </>
    );
};

export default QRPreview;
