import { apiService } from './api';

export interface DatasetGeneratorOptions {
  dataset_name?: string;
  format?: 'CSV' | 'JSON';
  version?: string;
}

export interface DatasetVersionItem {
  id: number;
  dataset_name: string;
  version: string;
  row_count: number;
  source_tables: string;
  output_file_path: string;
  export_format: string;
  generation_timestamp: string;
}

export interface DatasetGenerationResultPayload {
  dataset_name: string;
  version: string;
  row_count: number;
  source_tables: string[];
  export_format: string;
  filename: string;
  output_file_path: string;
  generation_timestamp: string;
  sample_rows: any[];
}

class DatasetGeneratorClientService {
  async generateDataset(options: DatasetGeneratorOptions = {}): Promise<DatasetGenerationResultPayload | null> {
    try {
      const res: any = await (apiService as any).post('/ai/dataset-generator/generate', options);
      return res?.data || res || null;
    } catch (err) {
      console.error('[DatasetGeneratorClientService] generateDataset error:', err);
      throw err;
    }
  }

  async getDatasetVersions(): Promise<DatasetVersionItem[]> {
    try {
      const res: any = await (apiService as any).get('/ai/dataset-generator/versions');
      return res?.data || res || [];
    } catch (err) {
      console.error('[DatasetGeneratorClientService] getDatasetVersions error:', err);
      return [];
    }
  }

  getDownloadUrl(filename: string): string {
    return `http://localhost:5000/api/ai/dataset-generator/download/${filename}`;
  }
}

export const datasetGeneratorClientService = new DatasetGeneratorClientService();
export default datasetGeneratorClientService;
