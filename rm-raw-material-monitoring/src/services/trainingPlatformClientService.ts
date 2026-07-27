import { apiService } from './api';

export interface TrainingConfigPayload {
  id?: string;
  name: string;
  framework: 'TensorFlow' | 'PyTorch' | 'Scikit-Learn' | 'ONNX';
  target_column: string;
  feature_set_version: string;
  hyperparameters: {
    learning_rate?: number;
    batch_size?: number;
    epochs?: number;
    optimizer?: string;
    loss_function?: string;
    split_ratio?: { train: number; validation: number; test: number };
  };
}

export interface TrainingRunItem {
  run_id: string;
  config_id: string;
  model_name: string;
  framework: string;
  version: string;
  dataset_name: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'STAGING';
  metrics: {
    accuracy_pct: number;
    f1_score: number;
    mae_score: number;
    precision: number;
    recall: number;
    training_loss: number;
    val_loss: number;
  };
  hyperparameters: any;
  artifact_path: string;
  deployed_at: string | null;
  created_at: string;
}

export interface ModelEvaluationItem {
  model_id: string;
  name: string;
  framework: string;
  version: string;
  is_active: boolean;
  is_loaded: boolean;
  evaluation: {
    accuracy_pct: number;
    f1_score: number;
    mae_score: number;
    total_predictions_served: number;
    average_latency_ms: number;
  };
  training_run?: TrainingRunItem | null;
}

export interface TrainingPlatformOverviewPayload {
  platform_version: string;
  supported_frameworks: string[];
  active_model_id: string;
  active_model_metadata: any;
  rollback_available: boolean;
  total_registered_models: number;
  total_training_runs: number;
  configs: TrainingConfigPayload[];
  recent_runs: TrainingRunItem[];
  evaluations: ModelEvaluationItem[];
}

class TrainingPlatformClientService {
  async getOverview(): Promise<TrainingPlatformOverviewPayload | null> {
    try {
      const res: any = await (apiService as any).get('/ai/training/overview');
      return res?.data || res || null;
    } catch (err) {
      console.error('[TrainingPlatformClientService] getOverview error:', err);
      return null;
    }
  }

  async generateDataset(datasetName: string = 'warehouse_ml_dataset'): Promise<any> {
    try {
      const res: any = await (apiService as any).post('/ai/training/dataset/generate', { dataset_name: datasetName });
      return res?.data || res || null;
    } catch (err) {
      console.error('[TrainingPlatformClientService] generateDataset error:', err);
      throw err;
    }
  }

  async saveConfig(config: TrainingConfigPayload): Promise<any> {
    try {
      const res: any = await (apiService as any).post('/ai/training/configure', config);
      return res?.data || res || null;
    } catch (err) {
      console.error('[TrainingPlatformClientService] saveConfig error:', err);
      throw err;
    }
  }

  async simulateRun(payload: any): Promise<TrainingRunItem | null> {
    try {
      const res: any = await (apiService as any).post('/ai/training/run', payload);
      return res?.data || res || null;
    } catch (err) {
      console.error('[TrainingPlatformClientService] simulateRun error:', err);
      throw err;
    }
  }

  async getHistory(): Promise<TrainingRunItem[]> {
    try {
      const res: any = await (apiService as any).get('/ai/training/history');
      return res?.data || res || [];
    } catch (err) {
      console.error('[TrainingPlatformClientService] getHistory error:', err);
      return [];
    }
  }

  async getEvaluations(): Promise<ModelEvaluationItem[]> {
    try {
      const res: any = await (apiService as any).get('/ai/training/evaluations');
      return res?.data || res || [];
    } catch (err) {
      console.error('[TrainingPlatformClientService] getEvaluations error:', err);
      return [];
    }
  }

  async deployModel(modelId: string): Promise<any> {
    try {
      const res: any = await (apiService as any).post('/ai/training/deploy', { model_id: modelId });
      return res?.data || res || null;
    } catch (err) {
      console.error('[TrainingPlatformClientService] deployModel error:', err);
      throw err;
    }
  }

  async rollbackModel(): Promise<any> {
    try {
      const res: any = await (apiService as any).post('/ai/training/rollback', {});
      return res?.data || res || null;
    } catch (err) {
      console.error('[TrainingPlatformClientService] rollbackModel error:', err);
      throw err;
    }
  }
}

export const trainingPlatformClientService = new TrainingPlatformClientService();
export default trainingPlatformClientService;
