import { apiService } from './api';

export type MlFramework = 'tensorflow' | 'pytorch' | 'scikit-learn' | 'onnx';

export interface MlPipelineRunResult {
  dataset_info: {
    dataset_name: string;
    version: string;
    filename: string;
    records_count: number;
    saved_at: string;
  };
  harvest_counts: {
    inventory: number;
    transactions: number;
    scan_events: number;
    audit_events: number;
    racks: number;
    overload_events: number;
    alerts: number;
  };
  cleaning_stats: {
    inventory_duplicates_removed: number;
    transactions_duplicates_removed: number;
    racks_duplicates_removed: number;
    alerts_duplicates_removed: number;
    total_records_processed: number;
  };
}

export interface MlPipelineStatus {
  pipeline_status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  operational_sources: {
    inventory_records: number;
    transaction_records: number;
    scan_events: number;
    rack_records: number;
    alert_records: number;
  };
  ml_dataset_layer: {
    stored_datasets_count: number;
    datasets: MlDatasetMeta[];
  };
}

export interface MlDatasetMeta {
  id: number;
  dataset_name: string;
  version: string;
  file_path: string;
  created_at: string;
  records_count?: number;
}

export interface MlExportPayload {
  framework: string;
  tensors?: any;
  matrix_X?: number[][];
  vector_y?: number[];
  feature_names?: string[];
  graph_schema?: any;
  tf_dataset_init_code?: string;
  pytorch_dataset_init_code?: string;
  sklearn_init_code?: string;
  onnx_runtime_init_code?: string;
  [key: string]: any;
}

class MlPipelineClientService {
  async runPipeline(datasetName = 'warehouse_ml_dataset'): Promise<MlPipelineRunResult | null> {
    try {
      const res: any = await (apiService as any).mlPipelineRun(datasetName);
      return res?.data || res || null;
    } catch (err) {
      console.error('[MlPipelineService] runPipeline error:', err);
      throw err;
    }
  }

  async getStatus(): Promise<MlPipelineStatus | null> {
    try {
      const res: any = await (apiService as any).mlPipelineStatus();
      return res?.data || res || null;
    } catch (err) {
      console.error('[MlPipelineService] getStatus error:', err);
      return null;
    }
  }

  async getDatasets(): Promise<MlDatasetMeta[]> {
    try {
      const res: any = await (apiService as any).mlPipelineDatasets();
      return res?.data || res || [];
    } catch (err) {
      console.error('[MlPipelineService] getDatasets error:', err);
      return [];
    }
  }

  async exportDataset(framework: MlFramework): Promise<MlExportPayload | null> {
    try {
      const res: any = await (apiService as any).mlPipelineExport(framework);
      return res?.data || res || null;
    } catch (err) {
      console.error('[MlPipelineService] exportDataset error:', err);
      return null;
    }
  }
}

export const mlPipelineService = new MlPipelineClientService();
export default mlPipelineService;
