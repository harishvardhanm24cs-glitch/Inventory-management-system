import { useState, useEffect } from 'react';
import { 
    TrendingUp, Box, AlertTriangle, Clock, Download, Filter, 
    BarChart3, PieChart as PieChartIcon, ArrowRightLeft, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import { cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import api from '../services/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
    const { materials, loading: inventoryLoading } = useInventory();
    const [stockData, setStockData] = useState<any[]>([]);
    const [supplierData, setSupplierData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                // In a real app, these would be separate API calls
                // For now, we'll derive some from inventory and mock others
                setStockData(materials.slice(0, 8).map(m => ({
                    name: m.name,
                    stock: m.stock,
                    min: m.minLimit
                })));

                setSupplierData([
                    { name: 'Global Paints Co', value: 40 },
                    { name: 'Industrial Chem', value: 30 },
                    { name: 'Titanium Labs', value: 20 },
                    { name: 'Other', value: 10 },
                ]);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!inventoryLoading) {
            fetchAnalytics();
        }
    }, [materials, inventoryLoading]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Intelligence</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Predictive monitoring and inventory performance metrics</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="bg-white border border-slate-200">
                        <Download size={16} className="mr-2" />
                        Export Data
                    </Button>
                    <Button>
                        <RefreshCw size={16} className="mr-2" />
                        Live Sync
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Stock Chart */}
                <Card className="lg:col-span-8 border-none shadow-md overflow-hidden rounded-2xl">
                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Box size={18} className="text-primary" />
                            Inventory Health Index
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[400px]">
                            {loading || inventoryLoading ? (
                                <LoadingSpinner message="Compiling real-time health data..." />
                            ) : stockData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={stockData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: '800' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="stock" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={32} />
                                        <Bar dataKey="min" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState 
                                    icon={BarChart3}
                                    title="No Analytics Data"
                                    description="Register materials to see real-time performance tracking."
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Donut Chart */}
                <Card className="lg:col-span-4 border-none shadow-md overflow-hidden rounded-2xl">
                    <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <PieChartIcon size={18} className="text-primary" />
                            Supplier Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[400px]">
                            {loading || inventoryLoading ? (
                                <LoadingSpinner message="Mapping source data..." />
                            ) : (
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={supplierData}
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {supplierData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Analytics;
