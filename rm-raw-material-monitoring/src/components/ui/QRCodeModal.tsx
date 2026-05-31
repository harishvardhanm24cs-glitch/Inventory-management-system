import React, { useEffect, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { generateQRCode, downloadQRCode, printQRCode } from '../../lib/qrcode';
import apiService from '../../services/api';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    materialName: string;
    materialId: string;
    barcode: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
    isOpen,
    onClose,
    materialName,
    materialId,
    barcode
}) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && barcode) {
            setIsLoading(true);
            generateQRCode(barcode)
                .then(async (url) => {
                    setQrCodeUrl(url);
                    // Phase 1: Archive to MongoDB
                    try {
                        await apiService.saveQR({
                            materialId,
                            qrData: barcode,
                            qrImage: url
                        });
                        console.log('[ARCHIVER] QR successfully backed up to cloud registry');
                    } catch (err) {
                        console.error('[ARCHIVER] Failed to secure QR to cloud registry', err);
                    }
                })
                .catch((err: unknown) => console.error('Failed to generate QR code:', err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, barcode, materialId]);

    if (!isOpen) return null;

    const handleDownload = () => {
        if (qrCodeUrl) {
            downloadQRCode(qrCodeUrl, `QR_${materialId}`);
        }
    };

    const handlePrint = () => {
        if (qrCodeUrl) {
            printQRCode(qrCodeUrl, `${materialName} (${materialId})`);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="glass-panel max-w-md w-full rounded-2xl shadow-2xl transform transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{materialName}</h3>
                            <p className="text-sm text-gray-500 mt-1">ID: {materialId}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* QR Code Display */}
                                <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                                    {qrCodeUrl && (
                                        <img
                                            src={qrCodeUrl}
                                            alt={`QR Code for ${barcode}`}
                                            className="max-w-full h-auto"
                                        />
                                    )}
                                </div>

                                {/* Barcode Info */}
                                <div className="text-center">
                                    <p className="text-sm text-gray-600">Barcode</p>
                                    <p className="text-lg font-mono font-bold text-gray-900">{barcode}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
                                    >
                                        <Download size={18} />
                                        Download
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 transition-all"
                                    >
                                        <Printer size={18} />
                                        Print
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default QRCodeModal;
