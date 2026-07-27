import axios from "axios";

// Create Axios Instance
const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      console.log("token found");
      config.headers.Authorization = `Bearer ${token}`;
      console.log("token attached");
    } else {
      console.log("token missing");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Error handling & Logging
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API failure", error.message);
    if (error.response && error.response.status === 401) {
      console.log("Not authorized, no token provided or token expired (401)");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const loginUser = async (data) => {
  console.log('[API Call] POST /auth/login with email:', data.email);
  try {
    const response = await API.post("/auth/login", data);
    console.log('API success');
    if (response && response.data && response.data.token) {
      localStorage.setItem("token", response.data.token);
      console.log("JWT token saved successfully");
    }
    return response;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const registerUser = async (data) => {
  console.log('[API Call] POST /auth/register for name:', data.name);
  try {
    const response = await API.post("/auth/register", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

// ─── MATERIALS ───────────────────────────────────────────────────────────────

export const getMaterials = async () => {
  console.log('[API Call] GET /materials');
  try {
    const response = await API.get("/materials");
    console.log('API success');
    if (response.data && response.data.success === true && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (response.data && Array.isArray(response.data.materials)) {
      return response.data.materials;
    }
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const addMaterial = async (data) => {
  console.log('[API Call] POST /materials with data:', data);
  try {
    const response = await API.post("/materials", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const updateMaterial = async (id, data) => {
  console.log(`[API Call] PUT /materials/${id} with data:`, data);
  try {
    const response = await API.put(`/materials/${id}`, data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const updateLocation = async (id, data) => {
  console.log(`[API Call] PUT /materials/${id} location update with data:`, data);
  try {
    const response = await API.put(`/materials/${id}`, data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('updateLocation failure', error.message);
    throw error;
  }
};

export const deleteMaterial = async (id) => {
  console.log(`[API Call] DELETE /materials/${id}`);
  try {
    const response = await API.delete(`/materials/${id}`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const updateStock = async (id, data) => {
  console.log(`[API Call] POST /materials/${id}/stock with data:`, data);
  try {
    const backendData = {
      transaction_type: data.type,
      quantity: parseFloat(data.amount) || 0.00
    };
    const response = await API.post(`/materials/${id}/stock`, backendData);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('updateStock failure', error.message);
    throw error;
  }
};

export const updateMaterialLimits = async (id, minLimit, criticalLimit) => {
  console.log(`[API Call] PUT /materials/${id} limits with minLimit:`, minLimit);
  try {
    const backendData = {
      threshold_limit: minLimit
    };
    const response = await API.put(`/materials/${id}`, backendData);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('updateMaterialLimits failure', error.message);
    throw error;
  }
};

// ─── ALERTS ──────────────────────────────────────────────────────────────────

export const getAlerts = async () => {
  console.log('[API Call] GET /alerts');
  try {
    const response = await API.get("/alerts");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export const getTransactions = async () => {
  console.log('[API Call] GET /transactions');
  try {
    const response = await API.get("/transactions");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

// ─── BATCHES ──────────────────────────────────────────────────────────────────
// No dedicated /batches backend route — batch data lives inside /materials.
// Each material record contains batch_number, manufacture_date, expiry_date, etc.
// We map those fields to the Batch shape expected by BatchInventory.tsx.

export const getBatches = async () => {
  console.log('[API Call] fetching batches via GET /materials');
  try {
    const response = await API.get("/materials");
    const materials = response.data;

    // Map each material row → Batch object
    const batches = (Array.isArray(materials) ? materials : []).map((m) => ({
      id:              String(m.id),
      materialId:      String(m.id),
      materialName:    m.name || m.material_name || "Unknown",
      barcodeId:       m.barcode_id || m.barcodeId || m.sku || "",
      batchNumber:     m.batch_number || m.batchNumber || String(m.id),
      manufactureDate: m.manufacture_date || m.manufactureDate || m.created_at || new Date().toISOString(),
      expiryDate:      m.expiry_date || m.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      quantity:        Number(m.quantity) || 0,
      createdAt:       m.created_at || m.createdAt || new Date().toISOString(),
    }));

    console.log('batches success — count:', batches.length);
    return batches;
  } catch (error) {
    console.error('batches failure', error.message);
    throw error;
  }
};

// ─── RACKS ───────────────────────────────────────────────────────────────────

export const getRacks = async () => {
  console.log('[API Call] GET /racks');
  try {
    const response = await API.get("/racks");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getRacks failure', error.message);
    throw error;
  }
};

export const addRack = async (data) => {
  console.log('[API Call] POST /racks with data:', data);
  try {
    const response = await API.post("/racks", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('addRack failure', error.message);
    throw error;
  }
};

export const updateRack = async (id, data) => {
  console.log(`[API Call] PUT /racks/${id} with data:`, data);
  try {
    const response = await API.put(`/racks/${id}`, data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('updateRack failure', error.message);
    throw error;
  }
};

export const deleteRack = async (id) => {
  console.log(`[API Call] DELETE /racks/${id}`);
  try {
    const response = await API.delete(`/racks/${id}`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('deleteRack failure', error.message);
    throw error;
  }
};

export const generateQR = async (data) => {
  console.log('[API Call] POST /qr/generate with data:', data);
  try {
    const response = await API.post("/qr/generate", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const bulkGenerateQR = async (data) => {
  console.log('[API Call] POST /qr/bulk-generate with data:', data);
  try {
    const response = await API.post("/qr/bulk-generate", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const getQrList = async (params) => {
  console.log('[API Call] GET /qr/list with params:', params);
  try {
    const response = await API.get("/qr/list", { params });
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getQrList failure', error.message);
    throw error;
  }
};

export const autoStoreScanner = async (data) => {
  console.log('[API Call] POST /scanner/auto-store with data:', data);
  try {
    const response = await API.post("/scanner/auto-store", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
    throw error;
  }
};

export const autoStore = autoStoreScanner;

export const outwardScan = async (data) => {
  console.log('[API Call] POST /scanner/outward with data:', data);
  try {
    const response = await API.post("/scanner/outward", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('outwardScan failure', error.message);
    throw error;
  }
};

export const getWarehouseStats = async () => {
  console.log('[API Call] GET /warehouse/stats');
  try {
    const response = await API.get("/warehouse/stats");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getWarehouseStats failure', error.message);
    throw error;
  }
};

export const searchMaterials = async (query) => {
  console.log(`[API Call] GET /materials/search with query: ${query}`);
  try {
    const response = await API.get(`/materials/search?q=${encodeURIComponent(query)}`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('searchMaterials failure', error.message);
    throw error;
  }
};

export const locateMaterials = async (search) => {
  console.log(`[API Call] GET /material-locator with search term: ${search}`);
  try {
    const response = await API.get(`/material-locator?search=${encodeURIComponent(search)}`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('locateMaterials failure', error.message);
    throw error;
  }
};

const mapPrediction = (p) => {
  let riskVal = 'stable';
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

export const getPredictions = async () => {
  console.log('[API Call] GET /materials/predictions');
  try {
    const response = await API.get("/materials/predictions");
    console.log('API success');
    const list = (response.data && response.data.data) || response.data || [];
    return list.map(mapPrediction);
  } catch (error) {
    console.error('getPredictions failure', error.message);
    throw error;
  }
};

export const getAiPredictions = async () => {
  console.log('[API Call] GET /ai/predictions');
  try {
    const response = await API.get("/ai/predictions");
    console.log('API success');
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    }
    return response.data || [];
  } catch (error) {
    console.error('getAiPredictions failure', error.message);
    throw error;
  }
};

export const getAiRecommendations = async () => {
  console.log('[API Call] GET /ai/recommendations');
  try {
    const response = await API.get("/ai/recommendations");
    console.log('API success');
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    }
    return response.data || [];
  } catch (error) {
    console.error('getAiRecommendations failure', error.message);
    throw error;
  }
};

export const getRackOptimizations = async () => {
  console.log('[API Call] GET /ai/rack-optimization');
  try {
    const response = await API.get("/ai/rack-optimization");
    console.log('API success');
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    }
    return response.data || [];
  } catch (error) {
    console.error('getRackOptimizations failure', error.message);
    throw error;
  }
};

export const getAiAlertPrioritization = async () => {
  console.log('[API Call] GET /ai/alert-prioritization');
  try {
    const response = await API.get("/ai/alert-prioritization");
    console.log('API success');
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    }
    return response.data || [];
  } catch (error) {
    console.error('getAiAlertPrioritization failure', error.message);
    throw error;
  }
};

export const getAuditLogs = async (params) => {
  console.log('[API Call] GET /audit-logs');
  try {
    const response = await API.get('/audit-logs', { params });
    return response.data;
  } catch (error) {
    console.error('getAuditLogs failure', error.message);
    throw error;
  }
};

export const exportAuditLogs = async (params) => {
  console.log('[API Call] GET /audit-logs/export');
  try {
    const response = await API.get('/audit-logs/export', { params });
    return response.data;
  } catch (error) {
    console.error('exportAuditLogs failure', error.message);
    throw error;
  }
};

export const getAiReorderRecommendations = async () => {
  console.log('[API Call] GET /ai/reorder-recommendations');
  try {
    const response = await API.get('/ai/reorder-recommendations');
    return response.data;
  } catch (error) {
    console.error('getAiReorderRecommendations failure', error.message);
    throw error;
  }
};

export const getAiRiskAnalysis = async () => {
  console.log('[API Call] GET /ai/risk-analysis');
  try {
    const response = await API.get('/ai/risk-analysis');
    return response.data;
  } catch (error) {
    console.error('getAiRiskAnalysis failure', error.message);
    throw error;
  }
};

export const getRiskAnalysis = getAiRiskAnalysis;


export const uploadReport = async (formData) => {
  console.log('[API Call] POST /reports/upload');
  try {
    const response = await API.post("/reports/upload", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('uploadReport failure', error.message);
    throw error;
  }
};

export const getReports = async () => {
  console.log('[API Call] GET /reports');
  try {
    const response = await API.get("/reports");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getReports failure', error.message);
    throw error;
  }
};

export const deleteReport = async (filename) => {
  console.log(`[API Call] DELETE /reports/${filename}`);
  try {
    const response = await API.delete(`/reports/${filename}`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('deleteReport failure', error.message);
    throw error;
  }
};

export const getDashboardStats = async () => {
  console.log('[API Call] GET /dashboard/stats');
  try {
    const response = await API.get("/dashboard/stats");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getDashboardStats failure', error.message);
    throw error;
  }
};

export const getWarehouseAnalytics = async (params) => {
  console.log('[API Call] GET /dashboard/analytics with params:', params);
  try {
    const response = await API.get('/dashboard/analytics', { params });
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getWarehouseAnalytics failure', error.message);
    throw error;
  }
};

export const getConsumptionAnalytics = async (dateRange = '30d') => {
  console.log('[API Call] GET /materials/consumption-analytics with dateRange:', dateRange);
  try {
    const response = await API.get('/materials/consumption-analytics', { params: { dateRange } });
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getConsumptionAnalytics failure', error.message);
    throw error;
  }
};

export const getQrHistoryList = async (params) => {
  console.log('[API Call] GET /qr/history with params:', params);
  try {
    const response = await API.get("/qr/history", { params });
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getQrHistoryList failure', error.message);
    throw error;
  }
};

export const getQrBarcodeHistory = async (barcodeId) => {
  console.log(`[API Call] GET /qr/history/${barcodeId}`);
  try {
    const response = await API.get(`/qr/history/${encodeURIComponent(barcodeId)}`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getQrBarcodeHistory failure', error.message);
    throw error;
  }
};

export const getReportPdf = async (reportType, action) => {
  console.log(`[API Call] GET /reports/${reportType} with action: ${action}`);
  try {
    const response = await API.get(`/reports/${reportType}`, {
      params: { action },
      responseType: 'blob'
    });
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getReportPdf failure', error.message);
    throw error;
  }
};

export const getQrTrace = async (barcodeId) => {
  console.log(`[API Call] GET /qr/trace/${barcodeId}`);
  try {
    const response = await API.get(`/qr/trace/${encodeURIComponent(barcodeId)}`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getQrTrace failure', error.message);
    throw error;
  }
};

export const getTrafficAnalytics = async () => {
  console.log('[API Call] GET /qr/traffic-analytics');
  try {
    const response = await API.get("/qr/traffic-analytics");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getTrafficAnalytics failure', error.message);
    throw error;
  }
};

export const getRackInventory = async () => {
  console.log('[API Call] GET /rack-inventory');
  try {
    const response = await API.get("/rack-inventory");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getRackInventory failure', error.message);
    throw error;
  }
};

export const getRackMaterials = async (rackCode) => {
  console.log(`[API Call] GET /racks/${rackCode}/materials`);
  try {
    const response = await API.get(`/racks/${encodeURIComponent(rackCode)}/materials`);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error(`getRackMaterials failure for ${rackCode}`, error.message);
    throw error;
  }
};

export const getMovementsRecent = async () => {
  console.log('[API Call] GET /movements/recent');
  try {
    const response = await API.get("/movements/recent");
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('getMovementsRecent failure', error.message);
    throw error;
  }
};

export const createMovement = async (data) => {
  console.log('[API Call] POST /movements with data:', data);
  try {
    const response = await API.post("/movements", data);
    console.log('API success:', response.data);
    return response.data;
  } catch (error) {
    console.error('createMovement failure', error.message);
    // Non-fatal — don't block the scanner flow
    return null;
  }
};

// ─── MODULE 1, 2, 3 AI & INTELLIGENCE ENDPOINTS ──────────────────────────────────────

export const getPredictionEngineOverview = async () => {
  try {
    const res = await API.get('/ai/prediction-engine/overview');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getPredictionEngineOverview failure', err.message);
    throw err;
  }
};

export const getPredictionDemand = async () => {
  try {
    const res = await API.get('/ai/prediction-engine/demand');
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('getPredictionDemand failure', err.message);
    throw err;
  }
};

export const getPredictionDepletion = async () => {
  try {
    const res = await API.get('/ai/prediction-engine/depletion');
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('getPredictionDepletion failure', err.message);
    throw err;
  }
};

export const getPredictionRackUtilization = async () => {
  try {
    const res = await API.get('/ai/prediction-engine/rack-utilization');
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('getPredictionRackUtilization failure', err.message);
    throw err;
  }
};

export const getPredictionWarehouseRisk = async () => {
  try {
    const res = await API.get('/ai/prediction-engine/warehouse-risk');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getPredictionWarehouseRisk failure', err.message);
    throw err;
  }
};

export const getPredictionConsumptionTrend = async () => {
  try {
    const res = await API.get('/ai/prediction-engine/consumption-trend');
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('getPredictionConsumptionTrend failure', err.message);
    throw err;
  }
};

export const getPredictiveRecommendations = async () => {
  try {
    const res = await API.get('/ai/prediction-engine/recommendations');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getPredictiveRecommendations failure', err.message);
    throw err;
  }
};

export const mlPipelineRun = async (datasetName = 'warehouse_ml_dataset') => {
  try {
    const res = await API.post('/ai/ml-pipeline/run', { dataset_name: datasetName });
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('mlPipelineRun failure', err.message);
    throw err;
  }
};

export const mlPipelineStatus = async () => {
  try {
    const res = await API.get('/ai/ml-pipeline/status');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('mlPipelineStatus failure', err.message);
    return null;
  }
};

export const mlPipelineDatasets = async () => {
  try {
    const res = await API.get('/ai/ml-pipeline/datasets');
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('mlPipelineDatasets failure', err.message);
    return [];
  }
};

export const mlPipelineExport = async (framework) => {
  try {
    const res = await API.get(`/ai/ml-pipeline/export/${framework}`);
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('mlPipelineExport failure', err.message);
    return null;
  }
};

export const getFeatures = async () => {
  try {
    const res = await API.get('/ai/features');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getFeatures failure', err.message);
    return null;
  }
};

export const getMaterialFeatures = async () => {
  try {
    const res = await API.get('/ai/features/materials');
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('getMaterialFeatures failure', err.message);
    return [];
  }
};

export const getWarehouseFeatures = async () => {
  try {
    const res = await API.get('/ai/features/warehouse');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getWarehouseFeatures failure', err.message);
    return null;
  }
};

export const getFeatureCatalog = async () => {
  try {
    const res = await API.get('/ai/features/catalog');
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('getFeatureCatalog failure', err.message);
    return [];
  }
};

// --- Module 4: Model Management ---
export const getModels = async () => {
  try {
    const res = await API.get('/ai/models');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getModels failure', err.message);
    return null;
  }
};

export const registerModel = async (payload) => {
  try {
    const res = await API.post('/ai/models/register', payload);
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('registerModel failure', err.message);
    throw err;
  }
};

export const switchModel = async (modelId) => {
  try {
    const res = await API.post('/ai/models/switch', { model_id: modelId });
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('switchModel failure', err.message);
    throw err;
  }
};

export const loadModel = async (modelId) => {
  try {
    const res = await API.post('/ai/models/load', { model_id: modelId });
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('loadModel failure', err.message);
    throw err;
  }
};

export const getModelPerformance = async () => {
  try {
    const res = await API.get('/ai/models/performance');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getModelPerformance failure', err.message);
    return null;
  }
};

// --- Module 5: AI Recommendation Engine ---
export const getRecommendationsEngine = async () => {
  try {
    const res = await API.get('/ai/recommendations/engine');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getRecommendationsEngine failure', err.message);
    return null;
  }
};

export const getRecommendationsByCategory = async (category) => {
  try {
    const res = await API.get(`/ai/recommendations/category/${category}`);
    return res.data ? res.data.data || res.data : [];
  } catch (err) {
    console.error('getRecommendationsByCategory failure', err.message);
    return [];
  }
};

export const switchRecommendationStrategy = async (strategyName) => {
  try {
    const res = await API.post('/ai/recommendations/strategy', { strategy_name: strategyName });
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('switchRecommendationStrategy failure', err.message);
    throw err;
  }
};

// --- Module 6: Explainable AI (XAI) ---
export const explainMaterial = async (materialId) => {
  try {
    const res = await API.get(`/ai/xai/explain/material/${materialId}`);
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('explainMaterial failure', err.message);
    return null;
  }
};

export const explainRack = async (rackCode) => {
  try {
    const res = await API.get(`/ai/xai/explain/rack/${rackCode}`);
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('explainRack failure', err.message);
    return null;
  }
};

export const getXaiDashboard = async () => {
  try {
    const res = await API.get('/ai/xai/dashboard');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getXaiDashboard failure', err.message);
    return null;
  }
};

export const getXaiDigitalTwin = async () => {
  try {
    const res = await API.get('/ai/xai/digital-twin');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getXaiDigitalTwin failure', err.message);
    return null;
  }
};

export const getXaiReports = async () => {
  try {
    const res = await API.get('/ai/xai/reports');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getXaiReports failure', err.message);
    return null;
  }
};

export const getXaiManagerPortal = async () => {
  try {
    const res = await API.get('/ai/xai/manager-portal');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getXaiManagerPortal failure', err.message);
    return null;
  }
};

// --- Module 7: AI Monitoring ---
export const getAiHealth = async () => {
  try {
    const res = await API.get('/ai/monitoring/health');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getAiHealth failure', err.message);
    return null;
  }
};

export const getAiMetrics = async () => {
  try {
    const res = await API.get('/ai/monitoring/metrics');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('getAiMetrics failure', err.message);
    return null;
  }
};

export const resetAiMetrics = async () => {
  try {
    const res = await API.post('/ai/monitoring/reset');
    return res.data ? res.data.data || res.data : null;
  } catch (err) {
    console.error('resetAiMetrics failure', err.message);
    throw err;
  }
};

export const getLowStockIntelligence = async () => {
  try {
    const res = await API.get('/ai/low-stock-intelligence');
    return res.data;
  } catch (err) {
    console.error('getLowStockIntelligence failure', err.message);
    throw err;
  }
};

export const getConsumptionIntelligence = async () => {
  try {
    const res = await API.get('/ai/consumption-intelligence');
    return res.data;
  } catch (err) {
    console.error('getConsumptionIntelligence failure', err.message);
    throw err;
  }
};

export const getDeadStockIntelligence = async (params) => {
  try {
    const res = await API.get('/ai/dead-stock-intelligence', { params });
    return res.data;
  } catch (err) {
    console.error('getDeadStockIntelligence failure', err.message);
    throw err;
  }
};

export const getRackOptimizationIntelligence = async () => {
  try {
    const res = await API.get('/ai/rack-optimization-intelligence');
    return res.data;
  } catch (err) {
    console.error('getRackOptimizationIntelligence failure', err.message);
    throw err;
  }
};

export const getSmartAlerts = async () => {
  try {
    const res = await API.get('/ai/smart-alerts');
    return res.data;
  } catch (err) {
    console.error('getSmartAlerts failure', err.message);
    throw err;
  }
};

export const getWarehouseHealthScore = async () => {
  try {
    const res = await API.get('/ai/warehouse-health-score');
    return res.data;
  } catch (err) {
    console.error('getWarehouseHealthScore failure', err.message);
    throw err;
  }
};

// ─── DEFAULT & NAMED EXPORTS ───────────────────────────────────────────────────

const api = {
  updateStock,
  updateMaterialLimits,
  loginUser,
  registerUser,
  getMaterials,
  addMaterial,
  updateMaterial,
  updateLocation,
  deleteMaterial,
  getAlerts,
  getTransactions,
  getBatches,
  getRacks,
  addRack,
  updateRack,
  deleteRack,
  generateQR,
  bulkGenerateQR,
  getQrList,
  autoStoreScanner,
  autoStore,
  getWarehouseStats,
  searchMaterials,
  locateMaterials,
  getAiPredictions,
  getAiRecommendations,
  getRackOptimizations,
  getAiAlertPrioritization,
  getPredictions,
  getAuditLogs,
  exportAuditLogs,
  getAiReorderRecommendations,
  getAiRiskAnalysis,
  getRiskAnalysis,
  uploadReport,
  getReports,
  deleteReport,
  getDashboardStats,
  getQrHistoryList,
  getQrBarcodeHistory,
  getReportPdf,
  outwardScan,
  getQrTrace,
  getTrafficAnalytics,
  getRackInventory,
  getRackMaterials,
  getMovementsRecent,
  createMovement,
  getWarehouseAnalytics,
  getConsumptionAnalytics,
  // Prediction Engine
  getPredictionEngineOverview,
  getPredictionDemand,
  getPredictionDepletion,
  getPredictionRackUtilization,
  getPredictionWarehouseRisk,
  getPredictionConsumptionTrend,
  getPredictiveRecommendations,
  // ML Pipeline
  mlPipelineRun,
  mlPipelineStatus,
  mlPipelineDatasets,
  mlPipelineExport,
  // Feature Engineering
  getFeatures,
  getMaterialFeatures,
  getWarehouseFeatures,
  getFeatureCatalog,
  // Generic HTTP helpers
  get: (url, config) => API.get(url, config),
  post: (url, data, config) => API.post(url, data, config),
  put: (url, data, config) => API.put(url, data, config),
  delete: (url, config) => API.delete(url, config),
  // Model Management
  getModels,
  registerModel,
  switchModel,
  loadModel,
  getModelPerformance,
  // Recommendation Engine
  getRecommendationsEngine,
  getRecommendationsByCategory,
  switchRecommendationStrategy,
  // Explainable AI
  explainMaterial,
  explainRack,
  getXaiDashboard,
  getXaiDigitalTwin,
  getXaiReports,
  getXaiManagerPortal,
  // AI Monitoring
  getAiHealth,
  getAiMetrics,
  resetAiMetrics,
  // Intelligence
  getLowStockIntelligence,
  getConsumptionIntelligence,
  getDeadStockIntelligence,
  getRackOptimizationIntelligence,
  getSmartAlerts,
  getWarehouseHealthScore
};

export const apiService = api;
export default api;



