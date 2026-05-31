import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Create Axios Instance
const apiClient: AxiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Automatically attach JWT token to every request
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Centralized Error Handling with Retry Logic
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response.data,
    async (error) => {
        const config = error.config;
        
        // 1. Retry Mechanism if request failed due to network
        if (config && (!error.response) && (!config._retryCount || config._retryCount < 3)) {
            config._retryCount = (config._retryCount || 0) + 1;
            console.warn(`[API Retry] Attempt ${config._retryCount} for ${config.url}`);
            
            // Wait 1.5 seconds before retrying
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return apiClient(config);
        }

        // 2. Error Translation
        let message = error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
        
        if (message.includes('Network Error') || message.includes('ECONNREFUSED')) {
            message = 'Backend not running';
        }

        console.error('[API Error]:', message);
        return Promise.reject(new Error(message));
    }
);

// Helper to map backend material DB structure to React RawMaterial structure
const mapMaterial = (m: any) => ({
    id: String(m.id),
    barcode: m.barcode,
    name: m.material_name,
    category: 'Paint Material',
    location: 'Warehouse Zone A',
    stock: parseFloat(m.quantity) || 0,
    unit: m.unit,
    minLimit: parseFloat(m.threshold_limit) || 0,
    criticalLimit: (parseFloat(m.threshold_limit) || 0) * 0.5,
    status: (parseFloat(m.quantity) || 0) <= (parseFloat(m.threshold_limit) || 0) * 0.5 
        ? 'critical' 
        : (parseFloat(m.quantity) || 0) <= (parseFloat(m.threshold_limit) || 0) 
            ? 'low' 
            : 'good',
    price: 0,
    batchNumber: m.batch_number || '',
    qrCodeImage: m.qr_data || '',
    registrationId: m.barcode || '',
    weight: parseFloat(m.quantity) || 0,
});

// API Service Functions
export const apiService = {
    // --- Health ---
    getHealth: async (): Promise<any> => {
        console.log('[API Call] GET /health');
        try {
            // Hit backend custom health endpoint
            const res = await axios.get('http://localhost:5000/health');
            console.log('[API Success] GET /health:', res.data);
            return res.data;
        } catch (err: any) {
            console.error('[API Failure] GET /health failed:', err.message);
            throw err;
        }
    },


    // --- Authentication ---
    loginUser: async (data: any): Promise<any> => {
        console.log('[API Call] POST /auth/login with email:', data.email);
        try {
            const res: any = await apiClient.post('/auth/login', data);
            console.log('[API Success] POST /auth/login succeeded');
            return { data: res };
        } catch (err: any) {
            console.error('[API Failure] POST /auth/login failed:', err.message);
            throw err;
        }
    },

    registerUser: async (data: any): Promise<any> => {
        console.log('[API Call] POST /auth/register for name:', data.name);
        try {
            const res: any = await apiClient.post('/auth/register', data);
            console.log('[API Success] POST /auth/register succeeded');
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /auth/register failed:', err.message);
            throw err;
        }
    },

    // --- Inventory / Materials ---
    getInventory: (): Promise<any> => apiService.getMaterials(),
    getMaterials: async (): Promise<any> => {
        console.log('[API Call] GET /materials');
        try {
            const res: any = await apiClient.get('/materials');
            console.log('[API Success] GET /materials succeeded:', res);
            const rawMaterials = res.materials || [];
            return rawMaterials.map(mapMaterial);
        } catch (err: any) {
            console.error('[API Failure] GET /materials failed:', err.message);
            throw err;
        }
    },
    getInventorySummary: async (): Promise<any> => {
        // Fallback or calculate summary from materials
        const mats = await apiService.getMaterials();
        return {
            totalMaterials: mats.length,
            lowStock: mats.filter((m: any) => m.status === 'low' || m.status === 'critical').length,
            criticalStock: mats.filter((m: any) => m.status === 'critical').length
        };
    },
    createMaterial: async (data: any): Promise<any> => {
        console.log('[API Call] POST /materials with:', data);
        try {
            const backendData = {
                barcode: data.barcode,
                material_name: data.name,
                quantity: parseFloat(data.stock) || 0.00,
                threshold_limit: parseFloat(data.minLimit) || 0.00,
                unit: data.unit,
                batch_number: data.batchNumber || ''
            };
            const res: any = await apiClient.post('/materials', backendData);
            console.log('[API Success] POST /materials succeeded:', res);
            return mapMaterial(res.material || res.data);
        } catch (err: any) {
            console.error('[API Failure] POST /materials failed:', err.message);
            throw err;
        }
    },
    addMaterial: (data: any): Promise<any> => apiService.createMaterial(data),
    removeMaterial: (data: any): Promise<any> => apiService.deleteMaterial(data.id),
    deleteMaterial: async (id: string): Promise<any> => {
        console.log('[API Call] DELETE /materials/' + id);
        try {
            const res = await apiClient.delete('/materials/' + id);
            console.log('[API Success] DELETE /materials/' + id + ' succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] DELETE /materials failed:', err.message);
            throw err;
        }
    },
    updateStock: async (id: string, data: { amount: number, type: 'inward' | 'outward', user?: string }): Promise<any> => {
        console.log('[API Call] POST /materials/' + id + '/stock with:', data);
        try {
            const backendData = {
                transaction_type: data.type,
                quantity: parseFloat(String(data.amount)) || 0.00
            };
            const res: any = await apiClient.post(`/materials/${id}/stock`, backendData);
            console.log('[API Success] POST /materials/' + id + '/stock succeeded:', res);
            const m = res.material;
            const t = res.transaction;
            return {
                material: mapMaterial(m),
                transaction: {
                    id: String(t.id),
                    materialId: String(t.material_id),
                    materialName: m.material_name,
                    type: t.transaction_type,
                    quantity: parseFloat(t.quantity),
                    batchNumber: m.batch_number || '',
                    location: 'Warehouse Zone A',
                    user: data.user || 'App User',
                    timestamp: t.created_at || new Date().toISOString()
                }
            };
        } catch (err: any) {
            console.error('[API Failure] POST /materials/' + id + '/stock failed:', err.message);
            throw err;
        }
    },
    updateLimits: async (id: string, minLimit: number, criticalLimit: number): Promise<any> => {
        console.log('[API Call] PUT /materials/' + id + ' limits with:', minLimit);
        try {
            const backendData = {
                threshold_limit: minLimit
            };
            const res: any = await apiClient.put(`/materials/${id}`, backendData);
            console.log('[API Success] PUT /materials/' + id + ' succeeded:', res);
            return mapMaterial(res.material);
        } catch (err: any) {
            console.error('[API Failure] PUT /materials/' + id + ' failed:', err.message);
            throw err;
        }
    },
    updateMaterial: async (id: string, data: any): Promise<any> => {
        console.log('[API Call] PUT /materials/' + id + ' with:', data);
        try {
            const res: any = await apiClient.put(`/materials/${id}`, data);
            console.log('[API Success] PUT /materials/' + id + ' succeeded:', res);
            return res.material || res.data;
        } catch (err: any) {
            console.error('[API Failure] PUT /materials/' + id + ' failed:', err.message);
            throw err;
        }
    },
    updateLocation: (id: string, location: any): Promise<any> => Promise.resolve({ success: true }),
    updateSubstitute: (id: string, substituteId: string | null): Promise<any> => Promise.resolve({ success: true }),

    // --- Products ---
    getProducts: (): Promise<any> => Promise.resolve([]),
    getProduct: (productId: string): Promise<any> => Promise.resolve({}),
    createProduct: (data: any): Promise<any> => Promise.resolve({}),
    bulkCreateProducts: (products: any[]): Promise<any> => Promise.resolve({ success: true }),

    // --- IoT & Tracking ---
    iotUpdate: (data: any): Promise<any> => Promise.resolve({ success: true }),

    // --- Analytics & Alerts ---
    getAlerts: async (): Promise<any> => {
        console.log('[API Call] GET /alerts');
        try {
            const res: any = await apiClient.get('/alerts');
            console.log('[API Success] GET /alerts succeeded:', res);
            const rawAlerts = res.data || [];
            return rawAlerts.map((a: any) => ({
                id: a.id,
                type: a.alert_status === 'active' ? 'critical' : 'success',
                title: a.alert_status === 'active' ? 'Low Stock Warning' : 'Resolved Stock Warning',
                message: a.message,
                time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : 'Just now',
            }));
        } catch (err: any) {
            console.error('[API Failure] GET /alerts failed:', err.message);
            return [];
        }
    },
    acknowledgeAlert: (id: number): Promise<any> => Promise.resolve({ success: true }),
    getLogs: (): Promise<any> => apiService.getTransactions(),
    getTransactions: async (): Promise<any> => {
        console.log('[API Call] GET /logs');
        try {
            const res: any = await apiClient.get('/logs');
            console.log('[API Success] GET /logs succeeded:', res);
            const rawTxs = res.data || [];
            return rawTxs.map((t: any) => ({
                id: String(t.id),
                materialId: String(t.material_id),
                materialName: t.material_name || 'Unknown',
                type: t.transaction_type,
                quantity: parseFloat(t.quantity) || 0,
                batchNumber: t.batch_number || '',
                location: 'Warehouse Zone A',
                user: 'System Operator',
                timestamp: t.created_at || new Date().toISOString()
            }));
        } catch (err: any) {
            console.error('[API Failure] GET /logs failed:', err.message);
            return [];
        }
    },
    getAnalytics: (): Promise<any> => Promise.resolve({}),
    getAnomalies: (): Promise<any> => Promise.resolve([]),
    getPredictions: (): Promise<any> => Promise.resolve([]),

    // --- Barcode Master & Registry ---
    getNextBarcodeId: (): Promise<any> => Promise.resolve({ nextId: 'BAR-' + Date.now() }),
    getBarcodeMaster: (barcodeId: string): Promise<any> => Promise.resolve({}),
    createBarcodeMaster: (data: any): Promise<any> => apiService.createMaterial(data),
    bulkCreateBarcodeMaster: (data: any[]): Promise<any> => Promise.resolve({ success: true }),
    createBarcodeRegistry: (data: any): Promise<any> => Promise.resolve({ success: true }),
    getNextRegistryId: (): Promise<any> => Promise.resolve({ nextId: 'REG-' + Date.now() }),

    // --- Batches ---
    getBatches: async (): Promise<any> => {
        console.log('[API Call] fetching batches via GET /materials');
        try {
            const res = await apiClient.get('/materials');
            const materials: any[] = Array.isArray(res.data) ? res.data : [];
            const batches = materials.map((m: any) => ({
                id:              String(m.id),
                materialId:      String(m.id),
                materialName:    m.name || m.material_name || 'Unknown',
                barcodeId:       m.barcode_id || m.barcodeId || m.sku || '',
                batchNumber:     m.batch_number || m.batchNumber || String(m.id),
                manufactureDate: m.manufacture_date || m.manufactureDate || m.created_at || new Date().toISOString(),
                expiryDate:      m.expiry_date || m.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                quantity:        Number(m.quantity) || 0,
                createdAt:       m.created_at || m.createdAt || new Date().toISOString(),
            }));
            console.log('batches success — count:', batches.length);
            return batches;
        } catch (error: any) {
            console.error('batches failure', error.message);
            throw error;
        }
    },
    createBatch: (data: any): Promise<any> => Promise.resolve({ success: true }),

    // --- Notifications ---
    sendLowStockAlert: (data: any): Promise<any> => Promise.resolve({ success: true }),

    // --- Scanning Logic ---
    processScan: async (data: any): Promise<any> => {
        console.log('[API Call] processScan with:', data);
        try {
            const barcode = data.sku_id || data.barcode;
            const type = data.type || data.manualType || 'inward';
            const weight = parseFloat(data.weight) || 1.00;

            console.log('[API Call] Resolving barcode:', barcode);
            const matRes: any = await apiClient.get(`/materials/${encodeURIComponent(barcode)}`);
            console.log('[API Success] Barcode resolved material:', matRes.material);

            const materialId = matRes.material.id;
            const backendData = {
                transaction_type: type,
                quantity: weight
            };

            console.log('[API Call] POST /materials/' + materialId + '/stock with:', backendData);
            const stockRes: any = await apiClient.post(`/materials/${materialId}/stock`, backendData);
            console.log('[API Success] Stock adjustment succeeded:', stockRes);
            return stockRes;
        } catch (err: any) {
            console.error('[API Failure] processScan failed:', err.message);
            throw err;
        }
    },
    getRegistry: (): Promise<any> => Promise.resolve([]),

    updateInventory: (data: any): Promise<any> => Promise.resolve({ success: true }),
    createSKU: (data: any): Promise<any> => apiService.createMaterial(data),
    getSKUs: (): Promise<any> => apiService.getMaterials(),

    // --- QR Archive ---
    saveQR: (data: any): Promise<any> => Promise.resolve({ success: true }),
    getAllQRs: (): Promise<any> => Promise.resolve([]),
    getQRById: (id: string): Promise<any> => Promise.resolve({}),
    deleteQR: (id: string): Promise<any> => Promise.resolve({ success: true }),
    generateQR: async (data: any): Promise<any> => {
        console.log('[API Call] POST /generate-qr with:', data);
        try {
            const res = await apiClient.post('/generate-qr', data);
            console.log('[API Success] POST /generate-qr succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /generate-qr failed:', err.message);
            throw err;
        }
    },
    autoStoreScanner: async (data: any): Promise<any> => {
        console.log('[API Call] POST /scanner/auto-store with:', data);
        try {
            const res = await apiClient.post('/scanner/auto-store', data);
            console.log('[API Success] POST /scanner/auto-store succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /scanner/auto-store failed:', err.message);
            throw err;
        }
    },

    // --- Racks ---
    getRacks: async (): Promise<any> => {
        console.log('[API Call] GET /racks');
        try {
            const res = await apiClient.get('/racks');
            console.log('[API Success] GET /racks succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /racks failed:', err.message);
            throw err;
        }
    },
    addRack: async (data: any): Promise<any> => {
        console.log('[API Call] POST /racks with data:', data);
        try {
            const res = await apiClient.post('/racks', data);
            console.log('[API Success] POST /racks succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /racks failed:', err.message);
            throw err;
        }
    },
    updateRack: async (id: string, data: any): Promise<any> => {
        console.log(`[API Call] PUT /racks/${id} with data:`, data);
        try {
            const res = await apiClient.put(`/racks/${id}`, data);
            console.log('[API Success] PUT /racks succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] PUT /racks failed:', err.message);
            throw err;
        }
    },
    deleteRack: async (id: string): Promise<any> => {
        console.log(`[API Call] DELETE /racks/${id}`);
        try {
            const res = await apiClient.delete(`/racks/${id}`);
            console.log('[API Success] DELETE /racks succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] DELETE /racks failed:', err.message);
            throw err;
        }
    },
    
    // Legacy Aliases
    addInventory: (data: any): Promise<any> => apiService.createMaterial(data),
    removeInventory: (data: any): Promise<any> => apiService.deleteMaterial(data.id),

    // Axios Wrapper Compatibility Methods
    get: async (url: string, config?: any): Promise<any> => {
        const res = await apiClient.get(url, config);
        return { data: res };
    },
    delete: async (url: string, config?: any): Promise<any> => {
        const res = await apiClient.delete(url, config);
        return { data: res };
    },
};

export default apiService;
