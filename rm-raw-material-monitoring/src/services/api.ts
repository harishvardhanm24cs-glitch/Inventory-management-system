import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

const apiClient: AxiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 30000, 
    headers: {
        'Content-Type': 'application/json',
    },
});

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

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response.data,
    async (error) => {
        const config = error.config;
        
        
        if (config && (!error.response) && (!config._retryCount || config._retryCount < 3)) {
            config._retryCount = (config._retryCount || 0) + 1;
            console.warn(`[API Retry] Attempt ${config._retryCount} for ${config.url}`);
            
            
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return apiClient(config);
        }

        
        let message = error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
        
        if (message.includes('Network Error') || message.includes('ECONNREFUSED') || message.includes('ERR_CONNECTION_RESET')) {
            message = 'Backend service temporarily unavailable — please retry.';
        }

        console.error('[API Error]:', message);
        return Promise.reject(new Error(message));
    }
);

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

export const apiService = {
    
    get: (url: string, config?: any): Promise<any> => apiClient.get(url, config),
    post: (url: string, data?: any, config?: any): Promise<any> => apiClient.post(url, data, config),
    put: (url: string, data?: any, config?: any): Promise<any> => apiClient.put(url, data, config),
    delete: (url: string, config?: any): Promise<any> => apiClient.delete(url, config),

    
    getHealth: async (): Promise<any> => {
        console.log('[API Call] GET /health');
        try {
            
            const res = await axios.get('http://localhost:5000/health');
            console.log('[API Success] GET /health:', res.data);
            return res.data;
        } catch (err: any) {
            console.error('[API Failure] GET /health failed:', err.message);
            throw err;
        }
    },

    
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

            
            const m = res?.material || res?.data?.material || null;
            const t = res?.transaction || res?.data?.transaction || null;

            if (!m || !t) {
                
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

    
    getProduct: (productId: string): Promise<any> => Promise.resolve({}),
    createProduct: (data: any): Promise<any> => Promise.resolve({}),
    bulkCreateProducts: (products: any[]): Promise<any> => Promise.resolve({ success: true }),

    
    iotUpdate: (data: any): Promise<any> => Promise.resolve({ success: true }),

    
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
    
    getPredictionEngineOverview: async (): Promise<any> => {
        console.log('[API Call] GET /ai/prediction-engine/overview');
        try {
            const res: any = await apiClient.get('/ai/prediction-engine/overview');
            return res.data || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/prediction-engine/overview failed:', err.message);
            throw err;
        }
    },
    getPredictionDemand: async (): Promise<any> => {
        console.log('[API Call] GET /ai/prediction-engine/demand');
        try {
            const res: any = await apiClient.get('/ai/prediction-engine/demand');
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/prediction-engine/demand failed:', err.message);
            throw err;
        }
    },
    getPredictionDepletion: async (): Promise<any> => {
        console.log('[API Call] GET /ai/prediction-engine/depletion');
        try {
            const res: any = await apiClient.get('/ai/prediction-engine/depletion');
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/prediction-engine/depletion failed:', err.message);
            throw err;
        }
    },
    getPredictionRackUtilization: async (): Promise<any> => {
        console.log('[API Call] GET /ai/prediction-engine/rack-utilization');
        try {
            const res: any = await apiClient.get('/ai/prediction-engine/rack-utilization');
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/prediction-engine/rack-utilization failed:', err.message);
            throw err;
        }
    },
    getPredictionWarehouseRisk: async (): Promise<any> => {
        console.log('[API Call] GET /ai/prediction-engine/warehouse-risk');
        try {
            const res: any = await apiClient.get('/ai/prediction-engine/warehouse-risk');
            return res.data || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/prediction-engine/warehouse-risk failed:', err.message);
            throw err;
        }
    },
    getPredictionConsumptionTrend: async (): Promise<any> => {
        console.log('[API Call] GET /ai/prediction-engine/consumption-trend');
        try {
            const res: any = await apiClient.get('/ai/prediction-engine/consumption-trend');
            return res.data || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/prediction-engine/consumption-trend failed:', err.message);
            throw err;
        }
    },
    getPredictiveRecommendations: async (): Promise<any> => {
        console.log('[API Call] GET /ai/prediction-engine/recommendations');
        try {
            const res: any = await apiClient.get('/ai/prediction-engine/recommendations');
            return res.data || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/prediction-engine/recommendations failed:', err.message);
            throw err;
        }
    },
    
    mlPipelineRun: async (datasetName = 'warehouse_ml_dataset'): Promise<any> => {
        console.log('[API Call] POST /ai/ml-pipeline/run');
        try {
            const res: any = await apiClient.post('/ai/ml-pipeline/run', { dataset_name: datasetName });
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/ml-pipeline/run failed:', err.message);
            throw err;
        }
    },
    mlPipelineStatus: async (): Promise<any> => {
        console.log('[API Call] GET /ai/ml-pipeline/status');
        try {
            const res: any = await apiClient.get('/ai/ml-pipeline/status');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/ml-pipeline/status failed:', err.message);
            return null;
        }
    },
    mlPipelineDatasets: async (): Promise<any> => {
        console.log('[API Call] GET /ai/ml-pipeline/datasets');
        try {
            const res: any = await apiClient.get('/ai/ml-pipeline/datasets');
            return res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/ml-pipeline/datasets failed:', err.message);
            return [];
        }
    },
    mlPipelineExport: async (framework: string): Promise<any> => {
        console.log(`[API Call] GET /ai/ml-pipeline/export/${framework}`);
        try {
            const res: any = await apiClient.get(`/ai/ml-pipeline/export/${framework}`);
            return res.data || res || null;
        } catch (err: any) {
            console.error(`[API Failure] GET /ai/ml-pipeline/export/${framework} failed:`, err.message);
            return null;
        }
    },
    
    getFeatures: async (): Promise<any> => {
        console.log('[API Call] GET /ai/features');
        try {
            const res: any = await apiClient.get('/ai/features');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/features failed:', err.message);
            return null;
        }
    },
    getMaterialFeatures: async (): Promise<any> => {
        console.log('[API Call] GET /ai/features/materials');
        try {
            const res: any = await apiClient.get('/ai/features/materials');
            return res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/features/materials failed:', err.message);
            return [];
        }
    },
    getWarehouseFeatures: async (): Promise<any> => {
        console.log('[API Call] GET /ai/features/warehouse');
        try {
            const res: any = await apiClient.get('/ai/features/warehouse');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/features/warehouse failed:', err.message);
            return null;
        }
    },
    getFeatureCatalog: async (): Promise<any> => {
        console.log('[API Call] GET /ai/features/catalog');
        try {
            const res: any = await apiClient.get('/ai/features/catalog');
            return res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/features/catalog failed:', err.message);
            return [];
        }
    },
    
    getModels: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models');
        try {
            const res: any = await apiClient.get('/ai/models');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models failed:', err.message);
            return null;
        }
    },
    registerModel: async (payload: any): Promise<any> => {
        console.log('[API Call] POST /ai/models/register');
        try {
            const res: any = await apiClient.post('/ai/models/register', payload);
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/models/register failed:', err.message);
            throw err;
        }
    },
    switchModel: async (modelId: string): Promise<any> => {
        console.log(`[API Call] POST /ai/models/switch with model_id: ${modelId}`);
        try {
            const res: any = await apiClient.post('/ai/models/switch', { model_id: modelId });
            return res.data || res || null;
        } catch (err: any) {
            console.error(`[API Failure] POST /ai/models/switch failed:`, err.message);
            throw err;
        }
    },
    loadModel: async (modelId?: string): Promise<any> => {
        console.log(`[API Call] POST /ai/models/load with model_id: ${modelId}`);
        try {
            const res: any = await apiClient.post('/ai/models/load', { model_id: modelId });
            return res.data || res || null;
        } catch (err: any) {
            console.error(`[API Failure] POST /ai/models/load failed:`, err.message);
            throw err;
        }
    },
    getModelPerformance: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/performance');
        try {
            const res: any = await apiClient.get('/ai/models/performance');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/performance failed:', err.message);
            return null;
        }
    },
    
    getRecommendationsEngine: async (): Promise<any> => {
        console.log('[API Call] GET /ai/recommendations/engine');
        try {
            const res: any = await apiClient.get('/ai/recommendations/engine');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/recommendations/engine failed:', err.message);
            return null;
        }
    },
    getRecommendationsByCategory: async (category: string): Promise<any> => {
        console.log(`[API Call] GET /ai/recommendations/category/${category}`);
        try {
            const res: any = await apiClient.get(`/ai/recommendations/category/${category}`);
            return res.data || res || [];
        } catch (err: any) {
            console.error(`[API Failure] GET /ai/recommendations/category/${category} failed:`, err.message);
            return [];
        }
    },
    switchRecommendationStrategy: async (strategyName: string): Promise<any> => {
        console.log(`[API Call] POST /ai/recommendations/strategy with strategy_name: ${strategyName}`);
        try {
            const res: any = await apiClient.post('/ai/recommendations/strategy', { strategy_name: strategyName });
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/recommendations/strategy failed:', err.message);
            throw err;
        }
    },
    
    explainMaterial: async (materialId: string): Promise<any> => {
        console.log(`[API Call] GET /ai/xai/explain/material/${materialId}`);
        try {
            const res: any = await apiClient.get(`/ai/xai/explain/material/${materialId}`);
            return res.data || res || null;
        } catch (err: any) {
            console.error(`[API Failure] GET /ai/xai/explain/material/${materialId} failed:`, err.message);
            return null;
        }
    },
    explainRack: async (rackCode: string): Promise<any> => {
        console.log(`[API Call] GET /ai/xai/explain/rack/${rackCode}`);
        try {
            const res: any = await apiClient.get(`/ai/xai/explain/rack/${rackCode}`);
            return res.data || res || null;
        } catch (err: any) {
            console.error(`[API Failure] GET /ai/xai/explain/rack/${rackCode} failed:`, err.message);
            return null;
        }
    },
    getXaiDashboard: async (): Promise<any> => {
        console.log('[API Call] GET /ai/xai/dashboard');
        try {
            const res: any = await apiClient.get('/ai/xai/dashboard');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/xai/dashboard failed:', err.message);
            return null;
        }
    },
    getXaiDigitalTwin: async (): Promise<any> => {
        console.log('[API Call] GET /ai/xai/digital-twin');
        try {
            const res: any = await apiClient.get('/ai/xai/digital-twin');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/xai/digital-twin failed:', err.message);
            return null;
        }
    },
    getXaiReports: async (): Promise<any> => {
        console.log('[API Call] GET /ai/xai/reports');
        try {
            const res: any = await apiClient.get('/ai/xai/reports');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/xai/reports failed:', err.message);
            return null;
        }
    },
    getXaiManagerPortal: async (): Promise<any> => {
        console.log('[API Call] GET /ai/xai/manager-portal');
        try {
            const res: any = await apiClient.get('/ai/xai/manager-portal');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/xai/manager-portal failed:', err.message);
            return null;
        }
    },
    
    getAiHealth: async (): Promise<any> => {
        console.log('[API Call] GET /ai/monitoring/health');
        try {
            const res: any = await apiClient.get('/ai/monitoring/health');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/monitoring/health failed:', err.message);
            return null;
        }
    },
    getAiMetrics: async (): Promise<any> => {
        console.log('[API Call] GET /ai/monitoring/metrics');
        try {
            const res: any = await apiClient.get('/ai/monitoring/metrics');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/monitoring/metrics failed:', err.message);
            return null;
        }
    },
    resetAiMetrics: async (): Promise<any> => {
        console.log('[API Call] POST /ai/monitoring/reset');
        try {
            const res: any = await apiClient.post('/ai/monitoring/reset');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/monitoring/reset failed:', err.message);
            throw err;
        }
    },
    
    getDataCollectionStatus: async (): Promise<any> => {
        console.log('[API Call] GET /ai/data-collection/status');
        try {
            const res: any = await apiClient.get('/ai/data-collection/status');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/data-collection/status failed:', err.message);
            return null;
        }
    },
    getDataCollectionStatistics: async (): Promise<any> => {
        console.log('[API Call] GET /ai/data-collection/statistics');
        try {
            const res: any = await apiClient.get('/ai/data-collection/statistics');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/data-collection/statistics failed:', err.message);
            return null;
        }
    },
    collectDataTransaction: async (payload: any): Promise<any> => {
        console.log('[API Call] POST /ai/data-collection/collect');
        try {
            const res: any = await apiClient.post('/ai/data-collection/collect', payload);
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/data-collection/collect failed:', err.message);
            throw err;
        }
    },
    getDataCollectionLogs: async (): Promise<any> => {
        console.log('[API Call] GET /ai/data-collection/logs');
        try {
            const res: any = await apiClient.get('/ai/data-collection/logs');
            return res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/data-collection/logs failed:', err.message);
            return null;
        }
    },

    
    getDatasets: async (): Promise<any> => {
        console.log('[API Call] GET /ai/datasets');
        try {
            const res: any = await apiClient.get('/ai/datasets');
            return Array.isArray(res?.datasets) ? res.datasets : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
        } catch (err: any) {
            console.error('[API Failure] GET /ai/datasets failed:', err.message);
            return [];
        }
    },
    getCurrentDataset: async (): Promise<any> => {
        console.log('[API Call] GET /ai/datasets/current');
        try {
            const res: any = await apiClient.get('/ai/datasets/current');
            return res.dataset || res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/datasets/current failed:', err.message);
            return null;
        }
    },
    getDatasetByVersion: async (versionTag: string): Promise<any> => {
        console.log(`[API Call] GET /ai/datasets/${versionTag}`);
        try {
            const res: any = await apiClient.get(`/ai/datasets/${versionTag}`);
            return res.dataset || res.data || res || null;
        } catch (err: any) {
            console.error(`[API Failure] GET /ai/datasets/${versionTag} failed:`, err.message);
            return null;
        }
    },
    createDatasetSnapshot: async (payload: any): Promise<any> => {
        console.log('[API Call] POST /ai/datasets/create');
        try {
            const res: any = await apiClient.post('/ai/datasets/create', payload);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/datasets/create failed:', err.message);
            throw err;
        }
    },
    archiveDataset: async (versionTag: string): Promise<any> => {
        console.log(`[API Call] POST /ai/datasets/archive (${versionTag})`);
        try {
            const res: any = await apiClient.post('/ai/datasets/archive', { version_tag: versionTag });
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/datasets/archive failed:', err.message);
            throw err;
        }
    },
    restoreDataset: async (versionTag: string): Promise<any> => {
        console.log(`[API Call] POST /ai/datasets/restore (${versionTag})`);
        try {
            const res: any = await apiClient.post('/ai/datasets/restore', { version_tag: versionTag });
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/datasets/restore failed:', err.message);
            throw err;
        }
    },
    selectDataset: async (versionTag: string): Promise<any> => {
        console.log(`[API Call] POST /ai/datasets/select (${versionTag})`);
        try {
            const res: any = await apiClient.post('/ai/datasets/select', { version_tag: versionTag });
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/datasets/select failed:', err.message);
            throw err;
        }
    },
    getDatasetStatistics: async (): Promise<any> => {
        console.log('[API Call] GET /ai/datasets/statistics');
        try {
            const res: any = await apiClient.get('/ai/datasets/statistics');
            return res.statistics || res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/datasets/statistics failed:', err.message);
            return null;
        }
    },
    getDatasetHistory: async (): Promise<any> => {
        console.log('[API Call] GET /ai/datasets/history');
        try {
            const res: any = await apiClient.get('/ai/datasets/history');
            return res.history || res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/datasets/history failed:', err.message);
            return [];
        }
    },
    verifyDatasetIntegrity: async (versionTag?: string): Promise<any> => {
        console.log('[API Call] GET /ai/datasets/integrity');
        try {
            const res: any = await apiClient.get('/ai/datasets/integrity', { params: { version: versionTag } });
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/datasets/integrity failed:', err.message);
            return null;
        }
    },

    
    getRegisteredModels: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/registry');
        try {
            const res: any = await apiClient.get('/ai/models/registry');
            return res.models || res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/registry failed:', err.message);
            return [];
        }
    },
    getCurrentProductionModel: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/current');
        try {
            const res: any = await apiClient.get('/ai/models/current');
            return res.model || res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/current failed:', err.message);
            return null;
        }
    },
    getRegisteredModelByVersion: async (versionTag: string): Promise<any> => {
        console.log(`[API Call] GET /ai/models/version/${versionTag}`);
        try {
            const res: any = await apiClient.get(`/ai/models/version/${versionTag}`);
            return res.model || res.data || res || null;
        } catch (err: any) {
            console.error(`[API Failure] GET /ai/models/version/${versionTag} failed:`, err.message);
            return null;
        }
    },
    registerNewModel: async (payload: any): Promise<any> => {
        console.log('[API Call] POST /ai/models/register-new');
        try {
            const res: any = await apiClient.post('/ai/models/register-new', payload);
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/models/register-new failed:', err.message);
            throw err;
        }
    },
    archiveModelVersion: async (versionTag: string): Promise<any> => {
        console.log(`[API Call] POST /ai/models/archive-version (${versionTag})`);
        try {
            const res: any = await apiClient.post('/ai/models/archive-version', { model_version: versionTag });
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/models/archive-version failed:', err.message);
            throw err;
        }
    },
    promoteModelToProduction: async (versionTag: string): Promise<any> => {
        console.log(`[API Call] POST /ai/models/promote (${versionTag})`);
        try {
            const res: any = await apiClient.post('/ai/models/promote', { model_version: versionTag });
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/models/promote failed:', err.message);
            throw err;
        }
    },
    updateModelStatus: async (versionTag: string, status: string): Promise<any> => {
        console.log(`[API Call] POST /ai/models/status (${versionTag} -> ${status})`);
        try {
            const res: any = await apiClient.post('/ai/models/status', { model_version: versionTag, status });
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/models/status failed:', err.message);
            throw err;
        }
    },
    getModelRegistryHistory: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/history');
        try {
            const res: any = await apiClient.get('/ai/models/history');
            return res.history || res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/history failed:', err.message);
            return [];
        }
    },
    getModelRegistryMetrics: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/metrics');
        try {
            const res: any = await apiClient.get('/ai/models/metrics');
            return res.metrics || res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/metrics failed:', err.message);
            return null;
        }
    },
    getModelArtifacts: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/artifacts');
        try {
            const res: any = await apiClient.get('/ai/models/artifacts');
            return res.artifacts || res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/artifacts failed:', err.message);
            return [];
        }
    },

    
    compareModels: async (payload?: any): Promise<any> => {
        console.log('[API Call] POST /ai/models/compare');
        try {
            const res: any = await apiClient.post('/ai/models/compare', payload || {});
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/models/compare failed:', err.message);
            return null;
        }
    },
    getModelRanking: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/ranking');
        try {
            const res: any = await apiClient.get('/ai/models/ranking');
            return res.rankings || res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/ranking failed:', err.message);
            return [];
        }
    },
    getModelComparisons: async (): Promise<any> => {
        console.log('[API Call] GET /ai/models/comparisons');
        try {
            const res: any = await apiClient.get('/ai/models/comparisons');
            return res.comparisons || res.data || res || [];
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/comparisons failed:', err.message);
            return [];
        }
    },
    getModelRecommendation: async (prodVersion?: string, candVersion?: string): Promise<any> => {
        console.log('[API Call] GET /ai/models/recommendation');
        try {
            const res: any = await apiClient.get('/ai/models/recommendation', { params: { production: prodVersion, candidate: candVersion } });
            return res.recommendation || res.data || res || null;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/models/recommendation failed:', err.message);
            return null;
        }
    },

    
    evaluateDeploymentCandidate: async (payload?: any): Promise<any> => {
        console.log('[API Call] POST /ai/deployment/evaluate');
        try {
            const res: any = await apiClient.post('/ai/deployment/evaluate', payload || {});
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/deployment/evaluate failed:', err.message);
            return null;
        }
    },
    getDeploymentDecision: async (decisionId?: string): Promise<any> => {
        console.log('[API Call] GET /ai/deployment/decision');
        try {
            const res: any = await apiClient.get('/ai/deployment/decision', { params: { decision_id: decisionId } });
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/deployment/decision failed:', err.message);
            return null;
        }
    },
    getDeploymentHistory: async (filterType?: string): Promise<any> => {
        console.log('[API Call] GET /ai/deployment/history');
        try {
            const res: any = await apiClient.get('/ai/deployment/history', { params: { filter: filterType } });
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/deployment/history failed:', err.message);
            return [];
        }
    },
    overrideDeploymentDecision: async (payload?: any): Promise<any> => {
        console.log('[API Call] POST /ai/deployment/override');
        try {
            const res: any = await apiClient.post('/ai/deployment/override', payload || {});
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/deployment/override failed:', err.message);
            return null;
        }
    },
    getDeploymentPolicies: async (): Promise<any> => {
        console.log('[API Call] GET /ai/deployment/policies');
        try {
            const res: any = await apiClient.get('/ai/deployment/policies');
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/deployment/policies failed:', err.message);
            return null;
        }
    },
    saveDeploymentPolicies: async (payload?: any): Promise<any> => {
        console.log('[API Call] POST /ai/deployment/policies');
        try {
            const res: any = await apiClient.post('/ai/deployment/policies', payload || {});
            return res;
        } catch (err: any) {
            console.error('[API Failure] POST /ai/deployment/policies failed:', err.message);
            return null;
        }
    },
    getLowStockIntelligence: async (): Promise<any> => {
        console.log('[API Call] GET /ai/low-stock-intelligence');
        try {
            const res: any = await apiClient.get('/ai/low-stock-intelligence');
            console.log('[API Success] GET /ai/low-stock-intelligence succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/low-stock-intelligence failed:', err.message);
            throw err;
        }
    },
    getConsumptionIntelligence: async (): Promise<any> => {
        console.log('[API Call] GET /ai/consumption-intelligence');
        try {
            const res: any = await apiClient.get('/ai/consumption-intelligence');
            console.log('[API Success] GET /ai/consumption-intelligence succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/consumption-intelligence failed:', err.message);
            throw err;
        }
    },
    getDeadStockIntelligence: async (params?: any): Promise<any> => {
        console.log('[API Call] GET /ai/dead-stock-intelligence', params);
        try {
            const res: any = await apiClient.get('/ai/dead-stock-intelligence', { params });
            console.log('[API Success] GET /ai/dead-stock-intelligence succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/dead-stock-intelligence failed:', err.message);
            throw err;
        }
    },
    getRackOptimizationIntelligence: async (): Promise<any> => {
        console.log('[API Call] GET /ai/rack-optimization-intelligence');
        try {
            const res: any = await apiClient.get('/ai/rack-optimization-intelligence');
            console.log('[API Success] GET /ai/rack-optimization-intelligence succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/rack-optimization-intelligence failed:', err.message);
            throw err;
        }
    },
    getSmartAlerts: async (): Promise<any> => {
        console.log('[API Call] GET /ai/smart-alerts');
        try {
            const res: any = await apiClient.get('/ai/smart-alerts');
            console.log('[API Success] GET /ai/smart-alerts succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/smart-alerts failed:', err.message);
            throw err;
        }
    },
    getWarehouseHealthScore: async (): Promise<any> => {
        console.log('[API Call] GET /ai/warehouse-health-score');
        try {
            const res: any = await apiClient.get('/ai/warehouse-health-score');
            console.log('[API Success] GET /ai/warehouse-health-score succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /ai/warehouse-health-score failed:', err.message);
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

    
    getNextBarcodeId: (): Promise<any> => Promise.resolve({ nextId: 'BAR-' + Date.now() }),
    getBarcodeMaster: (barcodeId: string): Promise<any> => Promise.resolve({}),
    createBarcodeMaster: (data: any): Promise<any> => apiService.createMaterial(data),
    bulkCreateBarcodeMaster: (data: any[]): Promise<any> => Promise.resolve({ success: true }),
    createBarcodeRegistry: (data: any): Promise<any> => Promise.resolve({ success: true }),
    getNextRegistryId: (): Promise<any> => Promise.resolve({ nextId: 'REG-' + Date.now() }),

    
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

    
    sendLowStockAlert: (data: any): Promise<any> => Promise.resolve({ success: true }),

    
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
    getWarehouseAnalytics: async (params?: any): Promise<any> => {
        console.log('[API Call] GET /dashboard/analytics with params:', params);
        try {
            const res = await apiClient.get('/dashboard/analytics', { params });
            console.log('[API Success] GET /dashboard/analytics succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /dashboard/analytics failed:', err.message);
            throw err;
        }
    },
    getConsumptionAnalytics: async (dateRange: string = '30d'): Promise<any> => {
        console.log('[API Call] GET /materials/consumption-analytics with dateRange:', dateRange);
        try {
            const res = await apiClient.get('/materials/consumption-analytics', { params: { dateRange } });
            console.log('[API Success] GET /materials/consumption-analytics succeeded:', res);
            return res;
        } catch (err: any) {
            console.error('[API Failure] GET /materials/consumption-analytics failed:', err.message);
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
    
    
    addInventory: (data: any): Promise<any> => apiService.createMaterial(data),
    removeInventory: (data: any): Promise<any> => apiService.deleteMaterial(data.id),
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
export const getDashboardStats = apiService.getDashboardStats;
export const getWarehouseAnalytics = apiService.getWarehouseAnalytics;
export const getConsumptionAnalytics = apiService.getConsumptionAnalytics;

export const getDataCollectionStatus = apiService.getDataCollectionStatus;
export const getDataCollectionStatistics = apiService.getDataCollectionStatistics;
export const collectDataTransaction = apiService.collectDataTransaction;
export const getDataCollectionLogs = apiService.getDataCollectionLogs;

export const getDatasets = apiService.getDatasets;
export const getCurrentDataset = apiService.getCurrentDataset;
export const getDatasetByVersion = apiService.getDatasetByVersion;
export const createDatasetSnapshot = apiService.createDatasetSnapshot;
export const archiveDataset = apiService.archiveDataset;
export const restoreDataset = apiService.restoreDataset;
export const selectDataset = apiService.selectDataset;
export const getDatasetStatistics = apiService.getDatasetStatistics;
export const getDatasetHistory = apiService.getDatasetHistory;
export const verifyDatasetIntegrity = apiService.verifyDatasetIntegrity;

export const getRegisteredModels = apiService.getRegisteredModels;
export const getCurrentProductionModel = apiService.getCurrentProductionModel;
export const getRegisteredModelByVersion = apiService.getRegisteredModelByVersion;
export const registerNewModel = apiService.registerNewModel;
export const archiveModelVersion = apiService.archiveModelVersion;
export const promoteModelToProduction = apiService.promoteModelToProduction;
export const updateModelStatus = apiService.updateModelStatus;
export const getModelRegistryHistory = apiService.getModelRegistryHistory;
export const getModelRegistryMetrics = apiService.getModelRegistryMetrics;
export const getModelArtifacts = apiService.getModelArtifacts;

export const compareModels = apiService.compareModels;
export const getModelRanking = apiService.getModelRanking;
export const getModelComparisons = apiService.getModelComparisons;
export const getModelRecommendation = apiService.getModelRecommendation;

export default apiService;
