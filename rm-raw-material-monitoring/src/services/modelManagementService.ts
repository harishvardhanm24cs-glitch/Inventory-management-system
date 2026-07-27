import { apiService } from './api';

export type ModelFramework = 'TensorFlow' | 'PyTorch' | 'ONNX' | 'Scikit-Learn' | 'Statistical/Heuristic' | string;

export interface ModelPerformance {
  model_id: string;
  name: string;
  framework: ModelFramework;
  version: string;
  total_predictions_served: number;
  average_latency_ms: number;
  accuracy_score: number;
  f1_score: number;
  mae_score: number;
  last_prediction_at: string | null;
}

export interface ModelMetadata {
  id: string;
  name: string;
  framework: ModelFramework;
  version: string;
  author: string;
  description: string;
  model_path?: string | null;
  is_loaded: boolean;
  is_active: boolean;
  performance?: ModelPerformance | null;
}

export interface PerformanceAnalyticsPayload {
  active_model_id: string;
  active_model_name: string;
  total_registered_models: number;
  models: ModelMetadata[];
  fallback_guarantee_active: boolean;
}

export interface RegisterModelPayload {
  name: string;
  framework: ModelFramework;
  version?: string;
  author?: string;
  description?: string;
  modelPath?: string;
}

class ModelManagementClientService {
  async getModels(): Promise<ModelMetadata[]> {
    try {
      const res: any = await (apiService as any).getModels();
      return res?.data || res || [];
    } catch (err) {
      console.error('[ModelManagementService] getModels error:', err);
      return [];
    }
  }

  async registerModel(payload: RegisterModelPayload): Promise<ModelMetadata | null> {
    try {
      const res: any = await (apiService as any).registerModel(payload);
      return res?.data || res || null;
    } catch (err) {
      console.error('[ModelManagementService] registerModel error:', err);
      throw err;
    }
  }

  async switchModel(modelId: string): Promise<ModelMetadata | null> {
    try {
      const res: any = await (apiService as any).switchModel(modelId);
      return res?.data || res || null;
    } catch (err) {
      console.error('[ModelManagementService] switchModel error:', err);
      throw err;
    }
  }

  async loadModel(modelId?: string): Promise<ModelMetadata | null> {
    try {
      const res: any = await (apiService as any).loadModel(modelId);
      return res?.data || res || null;
    } catch (err) {
      console.error('[ModelManagementService] loadModel error:', err);
      throw err;
    }
  }

  async getPerformance(): Promise<PerformanceAnalyticsPayload | null> {
    try {
      const res: any = await (apiService as any).getModelPerformance();
      return res?.data || res || null;
    } catch (err) {
      console.error('[ModelManagementService] getPerformance error:', err);
      return null;
    }
  }
}

export const modelManagementService = new ModelManagementClientService();
export default modelManagementService;
