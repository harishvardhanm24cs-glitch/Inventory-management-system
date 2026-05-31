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
  console.log('[API Call] POST /generate-qr with data:', data);
  try {
    const response = await API.post("/generate-qr", data);
    console.log('API success');
    return response.data;
  } catch (error) {
    console.error('API failure', error.message);
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

// ─── DEFAULT EXPORT ────────────────────────────────────────────────────────────

const api = {
  loginUser,
  registerUser,
  getMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getAlerts,
  getTransactions,
  getBatches,
  getRacks,
  addRack,
  updateRack,
  deleteRack,
  generateQR,
  autoStoreScanner,
};

export default api;
