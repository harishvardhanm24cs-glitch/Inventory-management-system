import { useState, useEffect } from 'react';
import { Search, Package, Box, Plus, Download, Trash2, Eye, History, Layers, QrCode } from 'lucide-react';
import AddMaterialModal from '../components/ui/AddMaterialModal';
import BulkImportModal from '../components/ui/BulkImportModal';
import QRCodeModal from '../components/ui/QRCodeModal';
import { Card } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import API from '../services/api';
import { useInventory } from '../context/InventoryContext';

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        good: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        low: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        critical: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    };

    const labels = {
        good: 'Available',
        low: 'Low Stock',
        critical: 'Critical',
    };

    return (
        <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm flex items-center gap-1.5 w-fit mx-auto",
            styles[status as keyof typeof styles]
        )}>
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                status === 'good' ? 'bg-emerald-500' : status === 'low' ? 'bg-amber-500' : 'bg-rose-500'
            )} />
            {labels[status as keyof typeof labels]}
        </span>
    );
};

const Inventory = () => {
    const { materials: contextMaterials, loading, deleteMaterial, lastUpdated, refreshData } = useInventory();
    const materials = contextMaterials as any[];
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLocation, setFilterLocation] = useState('All');
    const [selectedMaterial, setSelectedMaterial] = useState<{ name: string; id: string; barcode: string } | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this material?')) return;
        try {
            await deleteMaterial(id);
        } catch (error) {
            console.error('Failed to delete material:', error);
            alert('Failed to delete material');
        }
    };

    const locations = ['All', ...new Set(materials.map(m => m.location || 'Warehouse Zone A'))];

    const getStatus = (quantity: number, thresholdLimit: number) => {
        if (quantity < thresholdLimit) return 'critical';
        if (quantity <= thresholdLimit * 1.25) return 'low';
        return 'good';
    };

    const filteredData = materials.filter(item => {
        const materialName = item.material_name || item.name || '';
        const materialId = String(item.id) || '';
        const barcode = item.barcode || '';
        const location = item.location || 'Warehouse Zone A';

        const matchesSearch = (
            materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            materialId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            barcode.includes(searchTerm)
        );
        const matchesLocation = filterLocation === 'All' || location === filterLocation;
        return matchesSearch && matchesLocation;
    });

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('Inventory Report', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ["Material ID", "Name", "Barcode", "Current Stock", "Min. Limit", "Status"];
        const tableRows: any[] = [];

        filteredData.forEach(item => {
            const qty = parseFloat(item.quantity !== undefined ? item.quantity : item.stock) || 0;
            const limit = parseFloat(item.threshold_limit !== undefined ? item.threshold_limit : item.minLimit) || 0;
            const status = getStatus(qty, limit);
            const rowData = [
                String(item.id),
                item.material_name || item.name || '',
                item.barcode || '',
                `${qty} ${item.unit || ''}`,
                `${limit} ${item.unit || ''}`,
                status.toUpperCase()
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] }, // Primary color
        });

        doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-8 animate-fade-in text-slate-900">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Control</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Real-time raw material monitoring & SKU management</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <Button
                        variant="ghost"
                        onClick={handleDownloadPDF}
                        className="bg-white border border-slate-200 text-slate-600 px-5 rounded-xl text-sm font-bold shadow-sm"
                    >
                        <Download size={18} className="mr-2" />
                        Export
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setIsBulkModalOpen(true)}
                        className="bg-primary/10 text-primary border border-primary/5 px-5 rounded-xl text-sm font-bold"
                    >
                        <Layers size={18} className="mr-2" />
                        Bulk Actions
                    </Button>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 rounded-xl text-sm font-bold shadow-lg shadow-primary/30"
                    >
                        <Plus size={18} className="mr-2" />
                        Add Material
                    </Button>
                </div>
            </div>

            <div className="saas-card overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search materials..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-sm font-medium placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex items-center gap-3">
                             <span className="text-xs font-semibold text-slate-500">Location:</span>
                             <select 
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-primary/10 outline-none transition-all cursor-pointer"
                             >
                                {locations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                             </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {lastUpdated && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                Last Updated: {lastUpdated}
                            </span>
                        )}
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <Package size={14} className="text-primary" />
                            {filteredData.length} Live Items
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto hidden md:block">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-pulse">
                            <LoadingSpinner />
                            <p className="text-sm font-semibold text-slate-400">Loading inventory...</p>
                        </div>
                    ) : filteredData.length > 0 ? (
                        <table className="saas-table">
                            <thead>
                                <tr>
                                    <th className="px-6 py-4">Material Details</th>
                                    <th className="px-6 py-4">Identity & Loc</th>
                                    <th className="px-6 py-4 text-right">Stock Levels</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item) => {
                                    const qty = parseFloat(item.quantity !== undefined ? item.quantity : item.stock) || 0;
                                    const limit = parseFloat(item.threshold_limit !== undefined ? item.threshold_limit : item.minLimit) || 0;
                                    const status = getStatus(qty, limit);
                                    const name = item.material_name || item.name || '';
                                    const batch = item.batch_number || item.batchNumber || 'N/A';
                                    
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Box className="text-slate-300" size={20} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 truncate">{name}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">#{item.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-100 w-fit">
                                                        <QrCode size={12} className="text-slate-400" />
                                                        <span className="text-[11px] font-medium text-slate-600">{item.barcode}</span>
                                                    </div>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        Loc: {item.location || 'Warehouse Zone A'} | Batch: {batch}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-base font-bold text-slate-900">{qty.toLocaleString()}</span>
                                                        <span className="text-[11px] font-semibold text-slate-400">{item.unit || ''}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">Min: {limit}{item.unit || ''}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center">
                                                    <StatusBadge status={status} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => setSelectedMaterial({ name: name, id: String(item.id), barcode: item.barcode || '' })}
                                                        className="h-9 w-9 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50"
                                                    >
                                                        <QrCode size={18} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDelete(String(item.id))}
                                                        className="h-9 w-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState 
                            icon={Search}
                            title="No materials found"
                            description={searchTerm ? `No materials match "${searchTerm}" in our database.` : "The inventory registry is currently empty."}
                            action={searchTerm ? undefined : {
                                label: "Register Material",
                                onClick: () => setIsAddModalOpen(true)
                            }}
                        />
                    )}
                </div>

                {/* Mobile View - Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-pulse">
                            <LoadingSpinner />
                            <p className="text-sm font-semibold text-slate-400">Loading inventory...</p>
                        </div>
                    ) : filteredData.length > 0 ? (
                        filteredData.map((item) => {
                            const qty = parseFloat(item.quantity !== undefined ? item.quantity : item.stock) || 0;
                            const limit = parseFloat(item.threshold_limit !== undefined ? item.threshold_limit : item.minLimit) || 0;
                            const status = getStatus(qty, limit);
                            const name = item.material_name || item.name || '';
                            const batch = item.batch_number || item.batchNumber || 'N/A';
                            
                            return (
                                <div key={item.id} className="p-4 space-y-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
                                                {item.image ? (
                                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Box className="text-slate-400" size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none">{name}</p>
                                                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-tight font-mono">{item.id}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={status} />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 py-2">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Current Stock</p>
                                            <p className="text-lg font-black text-slate-900">{qty.toLocaleString()} <span className="text-[10px]">{item.unit || ''}</span></p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Location & Batch</p>
                                            <p className="text-xs font-bold text-slate-700">Loc: {item.location || 'Warehouse Zone A'}<br/>Batch: {batch}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
                                            <QrCode size={10} className="text-slate-400" />
                                            <code className="text-[10px] font-bold font-mono text-slate-600">{item.barcode}</code>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setSelectedMaterial({ name: name, id: String(item.id), barcode: item.barcode || '' })}
                                                className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600"
                                            >
                                                <QrCode size={18} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDelete(String(item.id))}
                                                className="h-10 w-10 rounded-xl bg-red-50 text-red-600"
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <EmptyState 
                            icon={Search} 
                            title="No materials found" 
                            description="Adjust your search or filters to find what you're looking for."
                        />
                    )}
                </div>
            </div>

            <QRCodeModal
                isOpen={selectedMaterial !== null}
                onClose={() => setSelectedMaterial(null)}
                materialName={selectedMaterial?.name || ''}
                materialId={selectedMaterial?.id || ''}
                barcode={selectedMaterial?.barcode || ''}
            />

            <AddMaterialModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <BulkImportModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={refreshData}
            />
        </div>
    );
};

export default Inventory;
