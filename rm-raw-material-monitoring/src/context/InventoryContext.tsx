import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export type MaterialStatus = 'good' | 'low' | 'critical';

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
    updateStock: (id: string, amount: number, type: 'inward' | 'outward') => void;
    updateMaterialLimits: (id: string, minLimit: number, criticalLimit: number) => void;
    acknowledgeAlert: (id: number) => void;
    addMaterial: (material: Omit<RawMaterial, 'status'>) => Promise<void>;
    deleteMaterial: (id: string) => Promise<void>;
    refreshData: () => Promise<void>;
    loading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
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

        setLoading(true);
        try {
            const [mats, alrts, txs]: [any, any, any] = await Promise.all([
                api.getMaterials() || [],
                api.getAlerts() || [],
                api.getTransactions() || []
            ]);
            console.log("[DEBUG] Inventory data fetched. Materials:", mats?.length || 0);
            setMaterials(Array.isArray(mats) ? mats : []);
            setAlerts(Array.isArray(alrts) ? alrts : []);
            setTransactions(Array.isArray(txs) ? txs : []);
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
        } catch (error) {
            console.error("Failed to update limits:", error);
        }
    };

    const acknowledgeAlert = async (id: number) => {
        try {
            await api.acknowledgeAlert(id);
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Failed to acknowledge alert:", error);
        }
    };

    const addMaterial = async (newMaterial: Omit<RawMaterial, 'status'>) => {
        try {
            const result: any = await api.createMaterial(newMaterial);
            setMaterials(prev => [...prev, result]);
        } catch (error) {
            console.error("Failed to add material:", error);
            throw error;
        }
    };

    const deleteMaterial = async (id: string) => {
        try {
            await api.deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
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
    if (!context) throw new Error('useInventory must be used within an InventoryProvider');
    return context;
};
