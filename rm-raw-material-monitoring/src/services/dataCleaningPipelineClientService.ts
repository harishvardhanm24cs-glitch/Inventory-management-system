import { apiService } from './api';

export interface DataCleaningReportPayload {
  pipeline_version: string;
  execution_timestamp: string;
  execution_time_ms: number;
  rows_processed: number;
  rows_removed: number;
  rows_retained: number;
  missing_values_detected: number;
  duplicate_rows_removed: number;
  invalid_records_detected: number;
  normalization_summary: {
    scaling_method: string;
    feature_bounds: Record<string, { min: number; max: number }>;
  };
  encoding_summary: {
    label_encoding_maps: Record<string, Record<string, number>>;
    one_hot_features: string[];
  };
}

export interface DataCleaningPipelineResultPayload {
  success: boolean;
  files_created: string[];
  export_paths: {
    csv: string;
    json: string;
  };
  report: DataCleaningReportPayload;
  sample_rows: any[];
}

class DataCleaningPipelineClientService {
  async runPipeline(): Promise<DataCleaningPipelineResultPayload | null> {
    try {
      const res: any = await (apiService as any).post('/ai/data-cleaning/run', {});
      return res?.data || res || null;
    } catch (err) {
      console.error('[DataCleaningPipelineClientService] runPipeline error:', err);
      throw err;
    }
  }

  async getReport(): Promise<DataCleaningReportPayload | null> {
    try {
      const res: any = await (apiService as any).get('/ai/data-cleaning/report');
      return res?.data || res || null;
    } catch (err) {
      console.error('[DataCleaningPipelineClientService] getReport error:', err);
      return null;
    }
  }

  getCleanDatasetDownloadUrl(format: 'csv' | 'json' = 'csv'): string {
    return `http://localhost:5000/api/ai/data-cleaning/download/${format}`;
  }
}

export const dataCleaningPipelineClientService = new DataCleaningPipelineClientService();
export default dataCleaningPipelineClientService;
