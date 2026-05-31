import { History, ArrowDownCircle, ArrowUpCircle, User as UserIcon, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import EmptyState from '../components/ui/EmptyState';

const Transactions = () => {
    const { transactions } = useInventory();

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Movement Logs</h1>
                    <p className="text-sm text-gray-500">Real-time Inward & Outward transaction history</p>
                </div>
            </div>

            <Card className="border-none shadow-xl glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Material</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none whitespace-nowrap">Batch / Location</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none text-right">Quantity</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">User</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none text-right">ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {transactions.map((trx) => (
                                <tr key={trx.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                                            <Clock size={14} className="text-gray-400" />
                                            {trx.timestamp}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 leading-tight">{trx.materialName}</span>
                                            <span className="text-[10px] font-mono text-gray-400">{trx.materialId}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-gray-900 font-bold">{(trx as any).batchNumber || 'N/A'}</span>
                                            <span className="text-[10px] text-gray-400 font-mono italic">{(trx as any).location || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                            trx.type === 'inward'
                                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                                : "bg-red-500/10 text-red-600 border border-red-500/20"
                                        )}>
                                            {trx.type === 'inward' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                                            {trx.type}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={cn(
                                            "font-bold text-base",
                                            trx.type === 'inward' ? "text-emerald-600" : "text-red-600"
                                        )}>
                                            {trx.type === 'inward' ? '+' : '-'}{trx.quantity.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                <UserIcon size={12} className="text-gray-400" />
                                            </div>
                                            <span className="font-medium">{trx.user}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <code className="text-[10px] font-mono text-gray-400 bg-gray-100/50 px-2 py-0.5 rounded">
                                            {trx.id}
                                        </code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {transactions.length === 0 && (
                    <div className="p-20 text-center">
                        <EmptyState
                            icon={History}
                            title="No transactions yet"
                            description="All material movements will be recorded here for auditing."
                        />
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Transactions;
