import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, RefreshCw, Info, Download, Trash2, CheckCircle, AlertCircle, FileText, Printer } from 'lucide-react';
import Papa from 'papaparse';
import { Button } from './Button';
import api from '../../services/api';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as any[];
                // Basic validation: check for name, qty, price
                const isValid = data.every(row => row.name && row.qty !== undefined && row.price !== undefined);

                if (!isValid) {
                    setError("Invalid CSV format. Please ensure headers are 'name, qty, price'.");
                    setParsedData([]);
                } else {
                    // Enrich with productId using Phase 2 Rule: RM-{Date.now()}-{index}
                    const now = Date.now();
                    const enrichedData = data.map((row, i) => ({
                        ...row,
                        productId: `RM-${now}-${i}`
                    }));

                    // Generate Bulk QRs as per Phase 2.2 Rule
                    const { generateQRCode } = await import('../../lib/qrcode');

                    setIsParsing(true);
                    const productsWithQrs = await Promise.all(
                        enrichedData.map(async (row) => ({
                            ...row,
                            qr: await generateQRCode(row.productId)
                        }))
                    );

                    setParsedData(productsWithQrs);
                }
                setIsParsing(false);
            },
            error: (err) => {
                setError(`Failed to parse file: ${err.message}`);
                setIsParsing(false);
            }
        });
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;

        setIsImporting(true);
        try {
            // Phase 5 Rule: Save ONLY IDs + product info (strip QR data URLs)
            const payload = parsedData.map(({ productId, name, qty, price }) => ({
                productId,
                name,
                qty,
                price
            }));

            await api.bulkCreateProducts(payload);
            onSuccess();
            onClose();
            setParsedData([]);
        } catch (err) {
            console.error('Bulk import error:', err);
            setError("Bulk import failed. Please check the data and try again.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="glass-panel max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden bg-white">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <FileSpreadsheet size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Bulk Product Import</h3>
                                <p className="text-xs text-gray-500">Upload CSV to create multiple products</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        {parsedData.length === 0 ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                            >
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                {isParsing ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="w-12 h-12 animate-spin text-primary" />
                                        <p className="text-sm font-medium text-gray-500">Parsing CSV...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors group-hover:scale-110 duration-300">
                                            <Upload size={32} className="text-gray-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-gray-700">Drop your CSV here</p>
                                            <p className="text-sm text-gray-400">or click to browse files</p>
                                        </div>
                                    </>
                                )}
                                <div className="flex gap-4 mt-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        <FileText size={12} className="text-gray-400" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">CSV Format Only</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Name</th>
                                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Qty</th>
                                                <th className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {parsedData.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-700">{row.name}</td>
                                                    <td className="px-4 py-3 text-gray-500">{row.qty}</td>
                                                    <td className="px-4 py-3 text-gray-500">${row.price}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedData.length > 10 && (
                                        <div className="p-3 text-center bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            + {parsedData.length - 10} more items
                                        </div>
                                    )}
                                </div>

                                {/* QR Grid Preview - Phase 4 & 6 */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between pl-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            Registry QR Distribution (Preview)
                                        </label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1.5 text-primary hover:bg-primary/10"
                                            onClick={async () => {
                                                const { printBulkQRCodes } = await import('../../lib/qrcode');
                                                printBulkQRCodes(parsedData.map(item => ({
                                                    id: item.productId,
                                                    qr: item.qr,
                                                    name: item.name
                                                })));
                                            }}
                                        >
                                            <Printer size={12} />
                                            Print All Labels (Phase 6)
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl max-h-48 overflow-y-auto scrollbar-hide">
                                        {parsedData.map((item, i) => (
                                            <div key={i} className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl shadow-sm border border-gray-50 group transition-all hover:scale-105 hover:border-primary/20">
                                                <img
                                                    src={item.qr}
                                                    alt={`QR ${i}`}
                                                    className="w-full aspect-square object-contain"
                                                />
                                                <p className="text-[8px] font-mono text-gray-400 truncate w-full text-center">
                                                    {item.productId.split('-').pop()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3 text-red-700 animate-shake">
                                <AlertCircle size={20} />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                className="flex-1 py-4 rounded-xl font-bold"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-[2] py-4 rounded-xl font-bold shadow-xl shadow-primary/20"
                                onClick={handleImport}
                                disabled={parsedData.length === 0 || isImporting}
                            >
                                {isImporting ? (
                                    <RefreshCw className="animate-spin" />
                                ) : (
                                    `IMPORT ALL ${parsedData.length || ''}`
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BulkImportModal;
