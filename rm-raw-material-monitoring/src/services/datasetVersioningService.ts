import { apiService } from './api';

export interface DatasetItem {
  id?: number;
  dataset_id: string;
  dataset_version: string;
  dataset_name: string;
  status: 'ACTIVE' | 'FROZEN' | 'ARCHIVED' | 'SELECTED';
  created_at: string;
  created_by: string;
  description: string;
  source: string;
  record_count: number;
  feature_count: number;
  validation_rate: number;
  duplicate_count: number;
  rejected_count: number;
  checksum: string;
  storage_path: string;
  snapshot_path?: string;
  integrity_status: 'VERIFIED' | 'CORRUPTED' | 'UNVERIFIED';
  last_verified?: string;
  archive_date?: string;
  restore_date?: string;
  is_selected: boolean;
  notes?: string;
}

export interface DatasetHistoryItem {
  id: number;
  dataset_version: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface DatasetStatistics {
  total_datasets: number;
  active_datasets: number;
  archived_datasets: number;
  current_dataset_version: string;
  selected_dataset?: DatasetItem | null;
  largest_dataset?: {
    version: string;
    records: number;
  };
  total_records_managed: number;
  average_feature_count: number;
  average_validation_rate: number;
  growth_trend?: {
    version: string;
    records: number;
    date: string;
  }[];
}

class DatasetVersioningService {
  async getDatasets(): Promise<DatasetItem[]> {
    try {
      const res: any = typeof (apiService as any).getDatasets === 'function'
        ? await (apiService as any).getDatasets()
        : await apiService.get('/ai/datasets');
      const list = Array.isArray(res?.datasets) ? res.datasets : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('[DatasetVersioningService] getDatasets error:', err);
      return [];
    }
  }

  async getCurrentDataset(): Promise<DatasetItem | null> {
    try {
      const res: any = typeof (apiService as any).getCurrentDataset === 'function'
        ? await (apiService as any).getCurrentDataset()
        : await apiService.get('/ai/datasets/current');
      return res?.dataset || res?.data || res || null;
    } catch (err) {
      console.error('[DatasetVersioningService] getCurrentDataset error:', err);
      return null;
    }
  }

  async createSnapshot(payload?: { version_tag?: string; dataset_name?: string; description?: string }): Promise<any> {
    try {
      const res: any = typeof (apiService as any).createDatasetSnapshot === 'function'
        ? await (apiService as any).createDatasetSnapshot(payload || {})
        : await apiService.post('/ai/datasets/create', payload || {});
      return res;
    } catch (err) {
      console.error('[DatasetVersioningService] createSnapshot error:', err);
      throw err;
    }
  }

  async archiveDataset(versionTag: string): Promise<any> {
    try {
      const res: any = typeof (apiService as any).archiveDataset === 'function'
        ? await (apiService as any).archiveDataset(versionTag)
        : await apiService.post('/ai/datasets/archive', { version_tag: versionTag });
      return res;
    } catch (err) {
      console.error('[DatasetVersioningService] archiveDataset error:', err);
      throw err;
    }
  }

  async restoreDataset(versionTag: string): Promise<any> {
    try {
      const res: any = typeof (apiService as any).restoreDataset === 'function'
        ? await (apiService as any).restoreDataset(versionTag)
        : await apiService.post('/ai/datasets/restore', { version_tag: versionTag });
      return res;
    } catch (err) {
      console.error('[DatasetVersioningService] restoreDataset error:', err);
      throw err;
    }
  }

  async selectDataset(versionTag: string): Promise<any> {
    try {
      const res: any = typeof (apiService as any).selectDataset === 'function'
        ? await (apiService as any).selectDataset(versionTag)
        : await apiService.post('/ai/datasets/select', { version_tag: versionTag });
      return res;
    } catch (err) {
      console.error('[DatasetVersioningService] selectDataset error:', err);
      throw err;
    }
  }

  async getStatistics(): Promise<DatasetStatistics | null> {
    try {
      const res: any = typeof (apiService as any).getDatasetStatistics === 'function'
        ? await (apiService as any).getDatasetStatistics()
        : await apiService.get('/ai/datasets/statistics');
      return res?.statistics || res?.data || res || null;
    } catch (err) {
      console.error('[DatasetVersioningService] getStatistics error:', err);
      return null;
    }
  }

  async getHistory(): Promise<DatasetHistoryItem[]> {
    try {
      const res: any = typeof (apiService as any).getDatasetHistory === 'function'
        ? await (apiService as any).getDatasetHistory()
        : await apiService.get('/ai/datasets/history');
      const list = Array.isArray(res?.history) ? res.history : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('[DatasetVersioningService] getHistory error:', err);
      return [];
    }
  }

  async verifyIntegrity(versionTag?: string): Promise<any> {
    try {
      const res: any = typeof (apiService as any).verifyDatasetIntegrity === 'function'
        ? await (apiService as any).verifyDatasetIntegrity(versionTag)
        : await apiService.get('/ai/datasets/integrity', { params: { version: versionTag } });
      return res;
    } catch (err) {
      console.error('[DatasetVersioningService] verifyIntegrity error:', err);
      return null;
    }
  }
}

export const datasetVersioningService = new DatasetVersioningService();
export default datasetVersioningService;
