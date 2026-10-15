import { apiService } from './api';

export interface ModelItem {
  id?: number;
  model_id: string;
  model_name: string;
  model_version: string;
  algorithm: string;
  dataset_version: string;
  status: 'DEVELOPMENT' | 'CANDIDATE' | 'PRODUCTION' | 'ARCHIVED';
  is_production?: boolean;
  artifact_path: string;
  artifact_filename?: string;
  checksum: string;
  training_date: string;
  mae: number;
  rmse: number;
  r2_score: number;
  cv_score: number;
  feature_count: number;
  sample_count: number;
  training_duration: number;
  model_size: number;
  created_by: string;
  description: string;
  tags?: string;
  features_json?: string[] | any;
  notes?: string;
  created_at?: string;
}

export interface ModelHistoryItem {
  id: number;
  model_version: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface ModelMetrics {
  total_models: number;
  production_models: number;
  candidate_models: number;
  archived_models: number;
  active_production_version: string;
  production_model?: ModelItem | null;
  best_performing_model?: {
    version: string;
    r2: number;
  };
  average_mae: number;
  average_r2_score: number;
}

class ModelRegistryService {
  async getModels(): Promise<ModelItem[]> {
    try {
      const res: any = typeof (apiService as any).getRegisteredModels === 'function'
        ? await (apiService as any).getRegisteredModels()
        : await apiService.get('/ai/models/registry');
      const list = Array.isArray(res?.models) ? res.models : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('[ModelRegistryService] getModels error:', err);
      return [];
    }
  }

  async getCurrentProductionModel(): Promise<ModelItem | null> {
    try {
      const res: any = typeof (apiService as any).getCurrentProductionModel === 'function'
        ? await (apiService as any).getCurrentProductionModel()
        : await apiService.get('/ai/models/current');
      return res?.model || res?.data || res || null;
    } catch (err) {
      console.error('[ModelRegistryService] getCurrentProductionModel error:', err);
      return null;
    }
  }

  async registerModel(payload?: any): Promise<any> {
    try {
      const res: any = typeof (apiService as any).registerNewModel === 'function'
        ? await (apiService as any).registerNewModel(payload || {})
        : await apiService.post('/ai/models/register-new', payload || {});
      return res;
    } catch (err) {
      console.error('[ModelRegistryService] registerModel error:', err);
      throw err;
    }
  }

  async promoteModel(versionTag: string): Promise<any> {
    try {
      const res: any = typeof (apiService as any).promoteModelToProduction === 'function'
        ? await (apiService as any).promoteModelToProduction(versionTag)
        : await apiService.post('/ai/models/promote', { model_version: versionTag });
      return res;
    } catch (err) {
      console.error('[ModelRegistryService] promoteModel error:', err);
      throw err;
    }
  }

  async archiveModel(versionTag: string): Promise<any> {
    try {
      const res: any = typeof (apiService as any).archiveModelVersion === 'function'
        ? await (apiService as any).archiveModelVersion(versionTag)
        : await apiService.post('/ai/models/archive-version', { model_version: versionTag });
      return res;
    } catch (err) {
      console.error('[ModelRegistryService] archiveModel error:', err);
      throw err;
    }
  }

  async updateStatus(versionTag: string, status: string): Promise<any> {
    try {
      const res: any = typeof (apiService as any).updateModelStatus === 'function'
        ? await (apiService as any).updateModelStatus(versionTag, status)
        : await apiService.post('/ai/models/status', { model_version: versionTag, status });
      return res;
    } catch (err) {
      console.error('[ModelRegistryService] updateStatus error:', err);
      throw err;
    }
  }

  async getHistory(): Promise<ModelHistoryItem[]> {
    try {
      const res: any = typeof (apiService as any).getModelRegistryHistory === 'function'
        ? await (apiService as any).getModelRegistryHistory()
        : await apiService.get('/ai/models/history');
      const list = Array.isArray(res?.history) ? res.history : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('[ModelRegistryService] getHistory error:', err);
      return [];
    }
  }

  async getMetrics(): Promise<ModelMetrics | null> {
    try {
      const res: any = typeof (apiService as any).getModelRegistryMetrics === 'function'
        ? await (apiService as any).getModelRegistryMetrics()
        : await apiService.get('/ai/models/metrics');
      return res?.metrics || res?.data || res || null;
    } catch (err) {
      console.error('[ModelRegistryService] getMetrics error:', err);
      return null;
    }
  }

  async getArtifacts(): Promise<any[]> {
    try {
      const res: any = typeof (apiService as any).getModelArtifacts === 'function'
        ? await (apiService as any).getModelArtifacts()
        : await apiService.get('/ai/models/artifacts');
      const list = Array.isArray(res?.artifacts) ? res.artifacts : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('[ModelRegistryService] getArtifacts error:', err);
      return [];
    }
  }
}

export const modelRegistryService = new ModelRegistryService();
export default modelRegistryService;
