import { apiService } from './api';

export interface FeatureMetadataPayload {
  pipeline_name: string;
  version: string;
  generated_at: string;
  execution_time_ms: number;
  total_feature_rows: number;
  feature_groups: Record<string, string[]>;
}

export interface FeatureStatisticsPayload {
  total_materials_indexed: number;
  total_dataset_records: number;
  critical_stock_alerts_count: number;
  low_stock_alerts_count: number;
  avg_inventory_health_score: number;
  avg_rack_health_score: number;
  avg_threshold_risk_score: number;
}

export interface FeaturePipelineResultPayload {
  success: boolean;
  files_created: string[];
  export_paths: {
    csv: string;
    json: string;
    metadata: string;
    statistics: string;
  };
  metadata: FeatureMetadataPayload;
  statistics: FeatureStatisticsPayload;
  sample_rows: any[];
}

class FeatureEngineeringPipelineClientService {
  async runPipeline(): Promise<FeaturePipelineResultPayload | null> {
    try {
      const res: any = await (apiService as any).post('/ai/feature-engineering/run', {});
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] runPipeline error:', err);
      throw err;
    }
  }

  async getMetadata(): Promise<FeatureMetadataPayload | null> {
    try {
      const res: any = await (apiService as any).get('/ai/feature-engineering/metadata');
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] getMetadata error:', err);
      return null;
    }
  }

  async getStatistics(): Promise<FeatureStatisticsPayload | null> {
    try {
      const res: any = await (apiService as any).get('/ai/feature-engineering/statistics');
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] getStatistics error:', err);
      return null;
    }
  }

  async getFeatureRegistry(): Promise<any | null> {
    try {
      const res: any = await (apiService as any).get('/ai/governance/feature-registry');
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] getFeatureRegistry error:', err);
      return null;
    }
  }

  async getFeatureImportanceTemplate(): Promise<any | null> {
    try {
      const res: any = await (apiService as any).get('/ai/governance/feature-importance-template');
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] getFeatureImportanceTemplate error:', err);
      return null;
    }
  }

  async getPreprocessingConfig(): Promise<any | null> {
    try {
      const res: any = await (apiService as any).get('/ai/governance/preprocessing-config');
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] getPreprocessingConfig error:', err);
      return null;
    }
  }

  async getFeaturePipelineDoc(): Promise<any | null> {
    try {
      const res: any = await (apiService as any).get('/ai/governance/feature-pipeline');
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] getFeaturePipelineDoc error:', err);
      return null;
    }
  }

  async getModelRegistry(): Promise<any | null> {
    try {
      const res: any = await (apiService as any).get('/ai/governance/model-registry');
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringPipelineClientService] getModelRegistry error:', err);
      return null;
    }
  }

  getFeatureDatasetDownloadUrl(format: 'csv' | 'json' = 'csv'): string {
    return `http://localhost:5000/api/ai/feature-engineering/download/${format}`;
  }
}

export const featureEngineeringPipelineClientService = new FeatureEngineeringPipelineClientService();
export default featureEngineeringPipelineClientService;
