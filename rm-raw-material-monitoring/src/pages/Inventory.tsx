import { useState } from 'react';
import { Search, Package, Box, Plus, Download, Trash2, Layers, QrCode } from 'lucide-react';
import AddMaterialModal from '../components/ui/AddMaterialModal';
import BulkImportModal from '../components/ui/BulkImportModal';
import QRCodeModal from '../components/ui/QRCodeModal';
import EmptyState from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        good: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
        low: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
        critical: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60',
    };

    const labels = {
        good: 'Optimal',
        low: 'Low Stock',
        critical: 'Critical',
    };

    return (
        <span className={cn(
            "px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-fit mx-auto select-none",
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
        doc.text('Inventory Control Report', 14, 22);
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
            headStyles: { fillColor: [37, 99, 235] },
        });

        doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6 text-slate-900 dark:text-slate-100">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Inventory Control</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Real-time raw material monitoring & SKU management</p>
                </div>

                <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
                    <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        size="md"
                    >
                        <Download size={16} className="mr-1.5" />
                        Export PDF
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setIsBulkModalOpen(true)}
                        size="md"
                    >
                        <Layers size={16} className="mr-1.5" />
                        Bulk Actions
                    </Button>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        size="md"
                    >
                        <Plus size={16} className="mr-1.5" />
                        Add Material
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search materials..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium placeholder:text-slate-400 text-slate-900 dark:text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Location:</span>
                             <select 
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                             >
                                {locations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                             </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {lastUpdated && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                Sync: {lastUpdated}
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Package size={14} className="text-blue-600 dark:text-blue-400" />
                            {filteredData.length} Live Items
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3 animate-pulse">
                            <LoadingSpinner />
                            <p className="text-xs font-semibold text-slate-400">Loading inventory data...</p>
                        </div>
                    ) : filteredData.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="px-5 py-3.5">Material Details</th>
                                    <th className="px-5 py-3.5">Identity & Location</th>
                                    <th className="px-5 py-3.5 text-right">Stock Level</th>
                                    <th className="px-5 py-3.5 text-center">Status</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                                {filteredData.map((item) => {
                                    const qty = parseFloat(item.quantity !== undefined ? item.quantity : item.stock) || 0;
                                    const limit = parseFloat(item.threshold_limit !== undefined ? item.threshold_limit : item.minLimit) || 0;
                                    const status = getStatus(qty, limit);
                                    const name = item.material_name || item.name || '';
                                    const batch = item.batch_number || item.batchNumber || 'N/A';
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Box className="text-slate-400" size={18} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white truncate">{name}</p>
                                                        <p className="text-[11px] text-slate-400 font-mono">#{item.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 w-fit">
                                                        <QrCode size={12} className="text-slate-400" />
                                                        <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">{item.barcode}</span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        Loc: {item.location || 'Warehouse Zone A'} | Batch: {batch}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">{qty.toLocaleString()}</span>
                                                        <span className="text-[11px] font-semibold text-slate-400">{item.unit || ''}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">Min: {limit} {item.unit || ''}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-center">
                                                    <StatusBadge status={status} />
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => setSelectedMaterial({ name: name, id: String(item.id), barcode: item.barcode || '' })}
                                                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60"
                                                    >
                                                        <QrCode size={16} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDelete(String(item.id))}
                                                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                                                    >
                                                        <Trash2 size={16} />
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
