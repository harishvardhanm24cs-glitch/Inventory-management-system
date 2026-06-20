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
    location: m.location || 'UNASSIGNED',
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

// Helper to map backend predictions structure to React Prediction structure
const mapPrediction = (p: any) => {
    let riskVal: 'high' | 'medium' | 'stable' = 'stable';
    if (p.risk) {
        const r = p.risk.toLowerCase();
        if (r === 'high') riskVal = 'high';
        else if (r === 'medium') riskVal = 'medium';
    }

    return {
        id: String(p.id),
        name: p.materialName || p.material_name || '',
        stock: parseFloat(p.quantity) || parseFloat(p.current_stock) || 0,
        unit: p.unit || 'KG',
        avgDailyConsumption: parseFloat(p.dailyRate) || parseFloat(p.avg_daily_usage) || 0,
        daysRemaining: p.daysUntilReorder !== undefined ? parseInt(p.daysUntilReorder, 10) : (p.days_until_threshold !== undefined ? parseInt(p.days_until_threshold, 10) : 0),
        recommendedReorder: parseFloat(p.recommendedReorderQty) || parseFloat(p.recommended_reorder_qty) || 0,
        risk: riskVal,
    };
};

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
            let rawMaterials = [];
            if (res && res.success === true && Array.isArray(res.data)) {
                rawMaterials = res.data;
            } else if (res && Array.isArray(res.materials)) {
                rawMaterials = res.materials;
            } else {
                rawMaterials = res.materials || [];
            }
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
            console.log('[API Success] POST /materials/' + id + '/stock raw response:', JSON.stringify(res));

            // Defensive: res.material and res.transaction may be undefined if backend shape differs
            const m = res?.material || res?.data?.material || null;
            const t = res?.transaction || res?.data?.transaction || null;

            if (!m || !t) {
                // Return a minimal success object so callers don't crash
                console.warn('[API Warn] updateStock: material or transaction missing in response. Returning raw.');
                return res;
            }

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
            console.log('[API Success] PUT /materials/' + id + ' raw response:', JSON.stringify(res));

            // Defensive: res.material may be undefined if backend shape differs
            const m = res?.material || res?.data?.material || null;
            if (!m) {
                console.warn('[API Warn] updateLimits: material missing in response. Returning raw.');
                return res;
            }
            return mapMaterial(m);
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
    updateLocation: async (id: string, data: any): Promise<any> => {
        console.log(`[API Call] PUT /materials/${id} with data:`, data);
        try {
            const res: any = await apiClient.put(`/materials/${id}`, data);
            console.log('[API Success] PUT /materials/' + id + ' succeeded:', res);
            return res.material || res.data;
        } catch (err: any) {
            console.error('[API Failure] PUT /materials/' + id + ' failed:', err.message);
            throw err;
        }
    },
    updateSubstitute: (id: string, substituteId: string | null): Promise<any> => Promise.resolve({ success: true }),

    // --- Products ---
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
            return rawAlerts.map((a: any) => {
                let mappedType = 'SYSTEM_ALERT';
                if (a.message.includes('Rack Almost Full') || a.message.includes('Almost Full')) {
                    mappedType = 'RACK_ALMOST_FULL';
                } else if (a.message.includes('Low Stock Warning') || a.message.includes('Low Stock')) {
                    mappedType = 'LOW_STOCK_WARNING';
                }
                return {
                    id: a.id,
                    type: mappedType,
                    severity: a.alert_status === 'active' ? 'critical' : 'medium',
                    title: a.alert_status === 'active' ? 'Active Alert' : 'Resolved Alert',
                    message: a.message,
                    date: a.created_at,
                    time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : 'Just now',
                };
            });
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
                barcode: t.barcode || '',
                type: t.transaction_type,
                quantity: parseFloat(t.quantity) || 0,
                batchNumber: t.batch_number || '',
                location: t.rack_code || 'Warehouse Zone A',
                user: t.user_name || 'System Operator',
                timestamp: t.created_at || new Date().toISOString()
            }));
        } catch (err: any) {
            console.error('[API Failure] GET /logs failed:', err.message);
            return [];
        }
    },
    getAnalytics: (): Promise<any> => Promise.resolve({}),
    getAnomalies: (): Promise<any> => Promise.resolve([]),
    getPredictions: async (): Promise<any> => {
        console.log('[API Call] GET /materials/predictions');
        try {
            const res: any = await apiClient.get('/materials/predictions');
            console.log('[API Success] GET /materials/predictions succeeded:', res);
            const list = res.data || [];
            return list.map(mapPrediction);
        } catch (err: any) {
            console.error('[API Failure] GET /materials/predictions failed:', err.message);
            throw err;
        }
    },
    getAiPredictions: async (): Promise<any> => {
        console.log('[API Call] GET /ai/predictions');
        try {
            const res: any = await apiClient.get('/ai/predictions');
            console.log('[API Success] GET /ai/predictions succeeded:', res);
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/predictions failed:', err.message);
            throw err;
        }
    },
    getAiReorderRecommendations: async (): Promise<any> => {
        console.log('[API Call] GET /ai/reorder-recommendations');
        try {
            const res: any = await apiClient.get('/ai/reorder-recommendations');
            console.log('[API Success] GET /ai/reorder-recommendations succeeded:', res);
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/reorder-recommendations failed:', err.message);
            throw err;
        }
    },
    getAiRiskAnalysis: async (): Promise<any> => {
        console.log('[API Call] GET /ai/risk-analysis');
        try {
            const res: any = await apiClient.get('/ai/risk-analysis');
            console.log('[API Success] GET /ai/risk-analysis succeeded:', res);
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/risk-analysis failed:', err.message);
            throw err;
        }
    },
    getRiskAnalysis: async (): Promise<any> => {
        return apiService.getAiRiskAnalysis();
    },
    getAiRecommendations: async (): Promise<any> => {
        console.log('[API Call] GET /ai/recommendations');
        try {
            const res: any = await apiClient.get('/ai/recommendations');
            console.log('[API Success] GET /ai/recommendations succeeded:', res);
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/recommendations failed:', err.message);
            throw err;
        }
    },
    getRackOptimizations: async (): Promise<any> => {
        console.log('[API Call] GET /ai/rack-optimization');
        try {
            const res: any = await apiClient.get('/ai/rack-optimization');
            console.log('[API Success] GET /ai/rack-optimization succeeded:', res);
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/rack-optimization failed:', err.message);
            throw err;
        }
    },
    getAiAlertPrioritization: async (): Promise<any> => {
        console.log('[API Call] GET /ai/alert-prioritization');
        try {
            const res: any = await apiClient.get('/ai/alert-prioritization');
            console.log('[API Success] GET /ai/alert-prioritization succeeded:', res);
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/alert-prioritization failed:', err.message);
            throw err;
        }
    },
    getWarehouseStats: async (): Promise<any> => {
        console.log('[API Call] GET /warehouse/stats');
        try {
            const res = await apiClient.get('/warehouse/stats');
            console.log('[API Success] GET /warehouse/stats succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /warehouse/stats failed:', err.message);
            throw err;
        }
    },
    searchMaterials: async (query: string): Promise<any> => {
        console.log(`[API Call] GET /materials/search with query: ${query}`);
        try {
            const res = await apiClient.get(`/materials/search?q=${encodeURIComponent(query)}`);
            console.log('[API Success] GET /materials/search succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /materials/search failed:', err.message);
            throw err;
        }
    },
    locateMaterials: async (search: string): Promise<any> => {
        console.log(`[API Call] GET /material-locator with search term: ${search}`);
        try {
            const res = await apiClient.get(`/material-locator?search=${encodeURIComponent(search)}`);
            console.log('[API Success] GET /material-locator succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /material-locator failed:', err.message);
            throw err;
        }
    },

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
        console.log('[API Call] POST /qr/generate with:', data);
        try {
            const res = await apiClient.post('/qr/generate', data);
            console.log('[API Success] POST /qr/generate succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /qr/generate failed:', err.message);
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
    autoStore: async (data: any): Promise<any> => {
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
    outwardScan: async (data: { barcode_id: string }): Promise<any> => {
        console.log('[API Call] POST /scanner/outward with:', data);
        try {
            const res = await apiClient.post('/scanner/outward', data);
            console.log('[API Success] POST /scanner/outward succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /scanner/outward failed:', err.message);
            throw err;
        }
    },

    assignRack: async (data: { material_id: number; quantity: number; rack_code?: string }): Promise<any> => {
        console.log('[API Call] POST /racks/assign with data:', data);
        try {
            const res = await apiClient.post('/racks/assign', data);
            console.log('[API Success] POST /racks/assign succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /racks/assign failed:', err.message);
            throw err;
        }
    },

    bulkGenerateQR: async (data: { material_name: string; quantity: number; rack_code?: string; units: number }): Promise<any> => {
        console.log('[API Call] POST /qr/bulk-generate with data:', data);
        try {
            const res = await apiClient.post('/qr/bulk-generate', data);
            console.log('[API Success] POST /qr/bulk-generate succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /qr/bulk-generate failed:', err.message);
            throw err;
        }
    },

    getQrList: async (params?: { q?: string; status?: string; page?: number; limit?: number }): Promise<any> => {
        console.log('[API Call] GET /qr/list with params:', params);
        try {
            const res = await apiClient.get('/qr/list', { params });
            console.log('[API Success] GET /qr/list succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /qr/list failed:', err.message);
            throw err;
        }
    },

    getQrTrace: async (barcodeId: string): Promise<any> => {
        console.log(`[API Call] GET /qr/trace/${barcodeId}`);
        try {
            const res = await apiClient.get(`/qr/trace/${encodeURIComponent(barcodeId)}`);
            console.log('[API Success] GET /qr/trace succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /qr/trace failed:', err.message);
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
    getEmptyRacks: async (): Promise<any> => {
        console.log('[API Call] GET /racks/empty');
        try {
            const res = await apiClient.get('/racks/empty');
            console.log('[API Success] GET /racks/empty succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /racks/empty failed:', err.message);
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
    getDigitalTwin: async (): Promise<any> => {
        console.log('[API Call] GET /digital-twin');
        try {
            const res = await apiClient.get('/digital-twin');
            console.log('[API Success] GET /digital-twin succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /digital-twin failed:', err.message);
            throw err;
        }
    },
    getRackInventory: async (): Promise<any> => {
        console.log('[API Call] GET /rack-inventory');
        try {
            const res: any = await apiClient.get('/rack-inventory');
            console.log('[API Success] GET /rack-inventory succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /rack-inventory failed:', err.message);
            throw err;
        }
    },
    updateRackInventory: async (rackCode: string, data: { current_capacity?: number; max_capacity?: number }): Promise<any> => {
        console.log(`[API Call] PUT /rack-inventory/${rackCode}`, data);
        try {
            const res: any = await apiClient.put(`/rack-inventory/${rackCode}`, data);
            console.log('[API Success] PUT /rack-inventory succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] PUT /rack-inventory failed:', err.message);
            throw err;
        }
    },
    getRackMaterials: async (rackCode: string): Promise<any> => {
        console.log(`[API Call] GET /racks/${rackCode}/materials`);
        try {
            const res: any = await apiClient.get(`/racks/${encodeURIComponent(rackCode)}/materials`);
            console.log(`[API Success] GET /racks/${rackCode}/materials succeeded:`, res);
            return res;
        } catch (err: any) {
            console.error(`[API Failure] GET /racks/${rackCode}/materials failed:`, err.message);
            throw err;
        }
    },
    createMovement: async (data: {
        barcode_id?: string;
        material_name?: string;
        source_location: string;
        destination_location: string;
        movement_type: 'INWARD' | 'OUTWARD';
    }): Promise<any> => {
        console.log('[API Call] POST /movements with:', data);
        try {
            const res: any = await apiClient.post('/movements', data);
            console.log('[API Success] POST /movements succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /movements failed:', err.message);
            // Non-fatal — don't block the scanner flow
            return null;
        }
    },
    getMovementsRecent: async (): Promise<any> => {
        console.log('[API Call] GET /movements/recent');
        try {
            const res: any = await apiClient.get('/movements/recent');
            console.log('[API Success] GET /movements/recent succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /movements/recent failed:', err.message);
            throw err;
        }
    },
    uploadReport: async (formData: FormData): Promise<any> => {
        console.log('[API Call] POST /reports/upload');
        try {
            const res = await apiClient.post('/reports/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('[API Success] POST /reports/upload succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /reports/upload failed:', err.message);
            throw err;
        }
    },
    getReports: async (): Promise<any> => {
        console.log('[API Call] GET /reports');
        try {
            const res = await apiClient.get('/reports');
            console.log('[API Success] GET /reports succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /reports failed:', err.message);
            throw err;
        }
    },
    deleteReport: async (filename: string): Promise<any> => {
        console.log(`[API Call] DELETE /reports/${filename}`);
        try {
            const res = await apiClient.delete(`/reports/${filename}`);
            console.log('[API Success] DELETE /reports succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] DELETE /reports failed:', err.message);
            throw err;
        }
    },
    getDashboardStats: async (): Promise<any> => {
        console.log('[API Call] GET /dashboard/stats');
        try {
            const res = await apiClient.get('/dashboard/stats');
            console.log('[API Success] GET /dashboard/stats succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /dashboard/stats failed:', err.message);
            throw err;
        }
    },
    getQrHistoryList: async (params?: { action?: string; limit?: number; page?: number }): Promise<any> => {
        console.log('[API Call] GET /qr/history with params:', params);
        try {
            const res = await apiClient.get('/qr/history', { params });
            console.log('[API Success] GET /qr/history succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /qr/history failed:', err.message);
            throw err;
        }
    },
    getQrBarcodeHistory: async (barcodeId: string): Promise<any> => {
        console.log(`[API Call] GET /qr/history/${barcodeId}`);
        try {
            const res = await apiClient.get(`/qr/history/${encodeURIComponent(barcodeId)}`);
            console.log('[API Success] GET /qr/history/' + barcodeId + ' succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /qr/history/' + barcodeId + ' failed:', err.message);
            throw err;
        }
    },
    getReportPdf: async (reportType: string, action: 'preview' | 'download', params?: any): Promise<Blob> => {
        console.log(`[API Call] GET /reports/${reportType} with action: ${action}`, params);
        try {
            const res = await apiClient.get(`/reports/${reportType}`, {
                params: { ...params, action },
                responseType: 'blob'
            });
            return res as any;
        } catch (err: any) {
            console.error(`[API Failure] GET /reports/${reportType} failed:`, err.message);
            throw err;
        }
    },
    getAuditLogs: async (params?: any): Promise<any> => {
        console.log('[API Call] GET /audit-logs with params:', params);
        try {
            const res = await apiClient.get('/audit-logs', { params });
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /audit-logs failed:', err.message);
            throw err;
        }
    },
    getRecentAuditLogs: async (limit?: number): Promise<any> => {
        console.log('[API Call] GET /audit-logs/recent');
        try {
            const res = await apiClient.get('/audit-logs/recent', { params: { limit } });
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /audit-logs/recent failed:', err.message);
            throw err;
        }
    },
    exportAuditLogs: async (params?: any): Promise<any> => {
        console.log('[API Call] GET /audit-logs/export with params:', params);
        try {
            const res = await apiClient.get('/audit-logs/export', { params });
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /audit-logs/export failed:', err.message);
            throw err;
        }
    },
    getTrafficAnalytics: async (): Promise<any> => {
        console.log('[API Call] GET /qr/traffic-analytics');
        try {
            const res = await apiClient.get('/qr/traffic-analytics');
            console.log('[API Success] GET /qr/traffic-analytics succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /qr/traffic-analytics failed:', err.message);
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
    updateMaterialLimits: async (id: string, minLimit: number, criticalLimit: number): Promise<any> => {
        return apiService.updateLimits(id, minLimit, criticalLimit);
    },
};

export const getAiPredictions = apiService.getAiPredictions;
export const getAiReorderRecommendations = apiService.getAiReorderRecommendations;
export const getAiRiskAnalysis = apiService.getAiRiskAnalysis;
export const getRackOptimizations = apiService.getRackOptimizations;
export const getRacks = apiService.getRacks;
export const getAuditLogs = apiService.getAuditLogs;
export const exportAuditLogs = apiService.exportAuditLogs;

export default apiService;
