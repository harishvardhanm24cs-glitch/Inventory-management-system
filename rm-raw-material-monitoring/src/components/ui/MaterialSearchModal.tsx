import React, { useState, useEffect } from 'react';
import { X, Search, MapPin, AlertTriangle } from 'lucide-react';
import apiService from '../../services/api';
import { cn } from '../../lib/utils';

interface MaterialSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MaterialSearchModal: React.FC<MaterialSearchModalProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setResults([]);
            setSearched(false);
        }
    }, [isOpen]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        setSearched(true);
        try {
            const res = await apiService.searchMaterials(searchQuery);
            if (res && res.data) {
                setResults(res.data);
            } else if (res && res.materials) {
                setResults(res.materials);
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error('Failed searching materials:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <div className="glass-panel max-w-2xl w-full rounded-3xl shadow-2xl transform transition-all overflow-hidden flex flex-col max-h-[85vh] bg-white border border-slate-100 animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Material Locator</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Locate active raw material slots & batches</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search Form */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <form onSubmit={handleSearch} className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by material name, batch code, or barcode..."
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-sm font-semibold placeholder:text-slate-450"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-all disabled:opacity-50"
                                disabled={isLoading}
                            >
                                Search
                            </button>
                        </form>
                    </div>

                    {/* Results Container */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent text-primary" />
                                <p className="text-xs font-bold text-slate-400">Scanning inventory database...</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest pl-1">{results.length} Matches Found</p>
                                <div className="grid grid-cols-1 gap-4">
                                    {results.map((item, idx) => (
                                        <div key={idx} className="border border-slate-150 rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 flex flex-col justify-between relative bg-white">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{item.material_name}</h4>
                                                    <span className="text-[10px] font-bold font-mono text-slate-400 mt-1 block">SKU/BARCODE: {item.barcode}</span>
                                                </div>
                                                <span className={cn(
                                                    "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm",
                                                    item.rack_location === 'Not Assigned' 
                                                        ? "bg-slate-100 text-slate-500 border-slate-200" 
                                                        : "bg-blue-50 text-blue-600 border-blue-200"
                                                )}>
                                                    <MapPin size={10} />
                                                    {item.rack_location}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[10px]">
                                                <div>
                                                    <span className="block font-black text-slate-400 uppercase tracking-wider">Current Stock</span>
                                                    <span className="font-bold text-slate-700 text-xs mt-0.5 block">{parseFloat(item.quantity || 0).toLocaleString()} KG</span>
                                                </div>
                                                <div>
                                                    <span className="block font-black text-slate-400 uppercase tracking-wider">Batch Code</span>
                                                    <span className="font-bold text-slate-700 text-xs mt-0.5 block">{item.batch_number || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="block font-black text-slate-400 uppercase tracking-wider">Manufactured</span>
                                                    <span className="font-bold text-slate-700 text-xs mt-0.5 block">
                                                        {item.manufacturing_date ? new Date(item.manufacturing_date).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : searched ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <AlertTriangle className="text-rose-500 mb-3" size={36} />
                                <h4 className="text-sm font-bold text-slate-750">No Materials Found</h4>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">No items in the database match your criteria. Please refine your name, batch code, or barcode query.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-350">
                                <Search className="stroke-[1.5] mb-3 text-slate-300" size={32} />
                                <p className="text-xs font-bold text-slate-400">Awaiting Search Input</p>
                                <p className="text-[10px] text-slate-400 mt-1">Enter a query to lookup warehouse locations instantly.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MaterialSearchModal;
