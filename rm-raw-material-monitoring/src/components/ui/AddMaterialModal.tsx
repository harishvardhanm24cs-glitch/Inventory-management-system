import React, { useState, useEffect } from 'react';
import { X, Plus, Package, QrCode, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw, Printer } from 'lucide-react';
import { generateQRCode } from '../../lib/qrcode';
import api from '../../services/api';
import { useInventory } from '../../context/InventoryContext';

interface AddMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({ isOpen, onClose }) => {
    const { refreshData } = useInventory();
    const [formData, setFormData] = useState({
        name: '',
        stock: 0,
        price: 0,
        category: 'General',
        unit: 'pcs',
        minLimit: 10,
        criticalLimit: 5
    });
    const [id, setId] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Generate unique ID RM-{timestamp}
            const newId = `RM-${Date.now()}`;
            setId(newId);

            // Generate QR code for the new ID
            generateQRCode(newId).then(setQrCodeUrl);
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'stock' || name === 'price' || name === 'minLimit' || name === 'criticalLimit'
                ? parseFloat(value) || 0
                : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Prepare product object for database save (aligned with backend expectations)
            const materialData = {
                sku_id: id,
                paint_name: formData.name,
                weight: formData.stock
            };

            await api.createMaterial(materialData);
            await refreshData();

            onClose();
            // Reset form
            setFormData({
                name: '',
                stock: 0,
                price: 0,
                category: 'General',
                unit: 'pcs',
                minLimit: 10,
                criticalLimit: 5
            });
        } catch (error) {
            console.error('Submission failed:', error);
            alert('Failed to add product. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="glass-panel max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                    {/* Left: QR Preview (Show QR instantly) */}
                    <div className="w-full md:w-1/3 bg-primary/5 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100/50">
                        <div className="text-center mb-6">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-1">Generated QR</h4>
                            <p className="text-xs text-gray-400">Scan code below</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-primary/10 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 group">
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="Product QR Code" className="w-32 h-32" />
                            ) : (
                                <div className="w-32 h-32 flex items-center justify-center bg-gray-50 rounded-lg">
                                    <QrCode size={40} className="text-gray-200" />
                                </div>
                            )}
                        </div>

                        <div className="text-center w-full space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Registry ID</p>
                            </div>
                            <p className="font-mono text-xs font-bold text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 shadow-inner w-full">
                                {id || 'SYSTEM_GENERATING...'}
                            </p>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="flex-1 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Product</h3>
                                <p className="text-sm text-gray-500">Enter product details</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Product Name</label>
                                    <input
                                        required
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-semibold"
                                        placeholder="Enter product name"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quantity</label>
                                        <input
                                            required
                                            type="number"
                                            name="stock"
                                            min="0"
                                            value={formData.stock}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Price ($)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            name="price"
                                            min="0"
                                            value={formData.price}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-4 px-6 rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] py-4 px-6 rounded-xl font-bold text-white bg-primary shadow-lg shadow-primary/30 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            Save Product
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AddMaterialModal;
