import { apiService } from './api';

export interface ValidationReasonItem {
  reason: string;
  count: number;
}

export interface ValidationErrorItem {
  timestamp: string;
  reason: string;
  material_id?: number;
  movement_type?: string;
}

export interface DataCollectionStatus {
  pipeline_status: 'HEALTHY' | 'ATTENTION_REQUIRED' | 'DEGRADED';
  version: string;
  current_dataset_version: string;
  total_versions: number;
  latest_version?: string;
  today_collected_records: number;
  total_collected_records: number;
  validation_success_rate: number;
  duplicate_records_blocked: number;
  rejected_records?: number;
  top_validation_reasons?: ValidationReasonItem[];
  recent_validation_errors?: ValidationErrorItem[];
  latest_collection_time: string;
}

export interface DataCollectionStatistics {
  current_dataset_version?: string;
  total_versions?: number;
  latest_version?: string;
  total_transactions: number;
  today_collected_records: number;
  accepted_records: number;
  rejected_records: number;
  duplicate_records: number;
  success_rate: number;
  last_collection_time: string;
}

export interface DataCollectionLog {
  id: number;
  transaction_id: number | null;
  material_id: number;
  quantity: number;
  movement_type: string;
  timestamp: string;
  validation_status: string;
  validation_reason: string | null;
  dataset_version: string;
  collection_time: string;
  hash_signature: string;
}

class DataCollectionService {
  async getStatus(): Promise<DataCollectionStatus | null> {
    try {
      const res: any = typeof (apiService as any).getDataCollectionStatus === 'function'
        ? await (apiService as any).getDataCollectionStatus()
        : await apiService.get('/ai/data-collection/status');
      return res?.data || res || null;
    } catch (err) {
      console.error('[DataCollectionService] getStatus error:', err);
      return null;
    }
  }

  async getStatistics(): Promise<DataCollectionStatistics | null> {
    try {
      const res: any = typeof (apiService as any).getDataCollectionStatistics === 'function'
        ? await (apiService as any).getDataCollectionStatistics()
        : await apiService.get('/ai/data-collection/statistics');
      return res?.data || res || null;
    } catch (err) {
      console.error('[DataCollectionService] getStatistics error:', err);
      return null;
    }
  }

  async getLogs(): Promise<DataCollectionLog[]> {
    try {
      const res: any = typeof (apiService as any).getDataCollectionLogs === 'function'
        ? await (apiService as any).getDataCollectionLogs()
        : await apiService.get('/ai/data-collection/logs');
      const logs = res?.logs || res?.data?.logs || [];
      return logs;
    } catch (err) {
      console.error('[DataCollectionService] getLogs error:', err);
      return [];
    }
  }

  async collectTransaction(payload: { material_id: number; quantity: number; movement_type: string; timestamp?: string }): Promise<any> {
    try {
      const res: any = typeof (apiService as any).collectDataTransaction === 'function'
        ? await (apiService as any).collectDataTransaction(payload)
        : await apiService.post('/ai/data-collection/collect', payload);
      return res;
    } catch (err) {
      console.error('[DataCollectionService] collectTransaction error:', err);
      throw err;
    }
  }
}

export const dataCollectionService = new DataCollectionService();
export default dataCollectionService;
