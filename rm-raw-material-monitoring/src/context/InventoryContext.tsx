import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export type MaterialStatus = 'good' | 'low' | 'critical';

export interface Rack {
  id: number;
  rack_code: string;
  rack_name: string;
  material_name: string | null;
  batch_number: string | null;
  quantity: string | number;
  current_stock: string | number;
  max_capacity: string | number;
  capacity: string | number;
  threshold_limit: string | number;
  status: 'healthy' | 'warning' | 'critical' | 'empty';
  occupancy_percentage: number;
  status_color: 'GREEN' | 'YELLOW' | 'RED';
}

export interface RawMaterial {
    id: string;
    barcode: string;
    name: string;
    category: string;
    location: string;
    stock: number;
    unit: string;
    minLimit: number;
    criticalLimit: number;
    status: MaterialStatus;
    price: number;
    image?: string;
    substituteId?: string | null;
}

export interface Alert {
    id: number;
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    time: string;
    emailSent?: boolean;
    recipients?: string;
}

export interface Transaction {
    id: string;
    materialId: string;
    materialName: string;
    barcode?: string;
    type: 'inward' | 'outward';
    quantity: number;
    batchNumber?: string;
    location?: string;
    user: string;
    timestamp: string;
}

interface InventoryContextType {
    materials: RawMaterial[];
    alerts: Alert[];
    transactions: Transaction[];
    racks: Rack[];
    warehouseStats: any;
    batches: any[];
    lastUpdated: string;
    updateStock: (id: string, amount: number, type: 'inward' | 'outward') => void;
    updateMaterialLimits: (id: string, minLimit: number, criticalLimit: number) => void;
    acknowledgeAlert: (id: number) => void;
    addMaterial: (material: Omit<RawMaterial, 'status'>) => Promise<void>;
    deleteMaterial: (id: string) => Promise<void>;
    refreshData: () => Promise<void>;
    loading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const fallbackContext: InventoryContextType = {
    materials: [],
    alerts: [],
    transactions: [],
    racks: [],
    warehouseStats: null,
    batches: [],
    lastUpdated: '',
    updateStock: () => console.warn('[InventoryContext] updateStock called outside InventoryProvider'),
    updateMaterialLimits: () => console.warn('[InventoryContext] updateMaterialLimits called outside InventoryProvider'),
    acknowledgeAlert: () => console.warn('[InventoryContext] acknowledgeAlert called outside InventoryProvider'),
    addMaterial: async () => console.warn('[InventoryContext] addMaterial called outside InventoryProvider'),
    deleteMaterial: async () => console.warn('[InventoryContext] deleteMaterial called outside InventoryProvider'),
    refreshData: async () => console.warn('[InventoryContext] refreshData called outside InventoryProvider'),
    loading: false
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [racks, setRacks] = useState<Rack[]>([]);
    const [warehouseStats, setWarehouseStats] = useState<any>(null);
    const [batches, setBatches] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const token = localStorage.getItem("token");
        
        if (!token) {
            console.log("token missing");
            const path = window.location.pathname;
            if (path !== '/login' && path !== '/signup') {
                window.location.href = '/login';
            }
            return;
        }

        console.log("token found");
        console.log("fetch started");

        // Only show spinner on initial load to prevent background updates from interrupting user
        if (materials.length === 0) {
            setLoading(true);
        }
        
        try {
            const [mats, alrts, txs, rawRacksResponse, statsRes, batchesRes]: [any, any, any, any, any, any] = await Promise.all([
                api.getMaterials() || [],
                api.getAlerts() || [],
                api.getTransactions() || [],
                api.getRacks() || [],
                api.getWarehouseStats() || null,
                api.getBatches() || []
            ]);
            console.log("[DEBUG] Inventory data fetched. Materials:", mats?.length || 0);
            setMaterials(Array.isArray(mats) ? mats : []);
            setAlerts(Array.isArray(alrts) ? alrts : []);
            setTransactions(Array.isArray(txs) ? txs : []);
            if (statsRes && statsRes.data) {
                setWarehouseStats(statsRes.data);
            }
            if (Array.isArray(batchesRes)) {
                setBatches(batchesRes);
            }

            // Set Last Updated formatted as HH:MM:SS
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            setLastUpdated(timeStr);

            let rawRacks: any[] = [];
            if (rawRacksResponse && rawRacksResponse.racks) {
                rawRacks = rawRacksResponse.racks;
            } else if (Array.isArray(rawRacksResponse)) {
                rawRacks = rawRacksResponse;
            }

            const mappedRacks: Rack[] = rawRacks.map((r: any) => {
                const qty = parseFloat(String(r.quantity)) || 0;
                const maxCap = parseFloat(String(r.max_capacity)) || 100;
                const capacity = r.capacity !== undefined ? parseFloat(String(r.capacity)) : maxCap;
                const current_stock = r.current_stock !== undefined ? parseFloat(String(r.current_stock)) : qty;
                const occupancy_percentage = capacity > 0 ? parseFloat(((current_stock / capacity) * 100).toFixed(2)) : 0.00;
                const fallbackStatusColor = occupancy_percentage > 80 ? 'RED' : occupancy_percentage > 40 ? 'YELLOW' : 'GREEN';
                return {
                    ...r,
                    rack_name: r.rack_name || r.rack_code || '',
                    capacity,
                    current_stock,
                    occupancy_percentage,
                    status_color: r.status_color || fallbackStatusColor
                };
            });
            setRacks(mappedRacks);
        } catch (error: any) {
            console.error("[DEBUG] Failed to fetch inventory data:", error);
            const errMsg = error.message || "";
            if (errMsg.includes('401') || errMsg.toLowerCase().includes('not authorized') || errMsg.toLowerCase().includes('unauthorized') || error.response?.status === 401) {
                console.log("token missing");
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                const path = window.location.pathname;
                if (path !== '/login' && path !== '/signup') {
                    window.location.href = '/login';
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Quiet background polling every 5 seconds
        const interval = setInterval(() => {
            const token = localStorage.getItem("token");
            if (token) {
                fetchData();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const refreshData = async () => {
        await fetchData();
    };

    const updateStock = async (id: string, amount: number, type: 'inward' | 'outward') => {
        try {
            const result: any = await api.updateStock(id, { amount, type });
            if (result.material) {
                setMaterials(prev => prev.map(m => m.id === id ? result.material : m));
                setTransactions(prev => [result.transaction, ...prev]);
                // Refresh alerts to get potential new ones from backend
                const newAlerts: any = await api.getAlerts();
                setAlerts(newAlerts);

                // Trigger immediate refresh of racks & stats
                await fetchData();
                window.dispatchEvent(new CustomEvent('rack-inventory-update'));
                if (typeof (window as any).refreshDigitalTwin === 'function') {
                    (window as any).refreshDigitalTwin();
                }

                // --- Emails ---
                if (type === 'outward' && result.material.stock < result.material.minLimit && !result.material.emailSent) {
                    try {
                        const emailResult = await api.sendLowStockAlert({
                            materialName: result.material.name,
                            barcode: result.material.barcode,
                            quantity: result.material.stock,
                            minLimit: result.material.minLimit,
                            id: result.material.id
                        });
                        
                        if (emailResult.success) {
                            setMaterials(prev => prev.map(m => m.id === id ? { ...m, emailSent: true } : m));
                        }
                    } catch (e) {
                        console.error("Critical: Failed to safely send low stock alert network request.", e);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to update stock:", error);
        }
    };

    const updateMaterialLimits = async (id: string, minLimit: number, criticalLimit: number) => {
        try {
            const updatedMaterial: any = await api.updateLimits(id, minLimit, criticalLimit);
            setMaterials(prev => prev.map(m => m.id === id ? updatedMaterial : m));
            // Refresh alerts to get potential new ones based on limit changes
            const newAlerts: any = await api.getAlerts();
            setAlerts(newAlerts);
            await fetchData();
        } catch (error) {
            console.error("Failed to update limits:", error);
        }
    };

    const acknowledgeAlert = async (id: number) => {
        try {
            await api.acknowledgeAlert(id);
            setAlerts(prev => prev.filter(a => a.id !== id));
            await fetchData();
        } catch (error) {
            console.error("Failed to acknowledge alert:", error);
        }
    };

    const addMaterial = async (newMaterial: Omit<RawMaterial, 'status'>) => {
        try {
            const result: any = await api.createMaterial(newMaterial);
            setMaterials(prev => [...prev, result]);
            await fetchData();
        } catch (error) {
            console.error("Failed to add material:", error);
            throw error;
        }
    };

    const deleteMaterial = async (id: string) => {
        try {
            await api.deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
            await fetchData();
        } catch (error) {
            console.error("Failed to delete material:", error);
            throw error;
        }
    };

    return (
        <InventoryContext.Provider value={{
            materials,
            alerts,
            transactions,
            racks,
            warehouseStats,
            batches,
            lastUpdated,
            updateStock,
            updateMaterialLimits,
            acknowledgeAlert,
            addMaterial,
            deleteMaterial,
            refreshData,
            loading
        }}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (!context) {
        console.warn('Warning: useInventory was called outside of an InventoryProvider. Returning fallback state.');
        return fallbackContext;
    }
    return context;
};
