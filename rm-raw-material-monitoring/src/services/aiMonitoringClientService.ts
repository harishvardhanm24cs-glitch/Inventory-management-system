import { apiService } from './api';

export type AiOperationalStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

export interface PredictionAccuracyMetrics {
  accuracy_pct: number;
  f1_score: number;
  mae_score: number;
}

export interface PredictionLatencyMetrics {
  avg_latency_ms: number;
  p95_latency_ms: number;
  total_predictions_served: number;
}

export interface FeatureAvailabilityMetrics {
  readiness_pct: number;
  missing_vector_ratio: number;
}

export interface ModelStatusMetrics {
  active_model_id: string;
  active_model_name: string;
  framework: string;
  is_loaded: boolean;
  total_models_registered: number;
}

export interface DataQualityMetrics {
  cleanliness_score_pct: number;
  schema_integrity_pct: number;
  deduplication_rate_pct: number;
}

export interface PredictionFailuresMetrics {
  total_failures: number;
  failure_rate_pct: number;
  fallback_triggers_count: number;
}

export interface AiHealthSummaryPayload {
  health_index: number; // 0 - 100
  status: AiOperationalStatus;
  timestamp: string;
  non_interference_guarantee: boolean;
  metrics: {
    prediction_accuracy: PredictionAccuracyMetrics;
    prediction_latency: PredictionLatencyMetrics;
    feature_availability: FeatureAvailabilityMetrics;
    model_status: ModelStatusMetrics;
    data_quality: DataQualityMetrics;
    prediction_failures: PredictionFailuresMetrics;
  };
}

class AiMonitoringClientService {
  async getAiHealth(): Promise<AiHealthSummaryPayload | null> {
    try {
      const res: any = await (apiService as any).getAiHealth();
      return res?.data || res || null;
    } catch (err) {
      console.error('[AiMonitoringClientService] getAiHealth error:', err);
      return null;
    }
  }

  async resetMetrics(): Promise<any> {
    try {
      const res: any = await (apiService as any).resetAiMetrics();
      return res?.data || res || null;
    } catch (err) {
      console.error('[AiMonitoringClientService] resetMetrics error:', err);
      throw err;
    }
  }
}

export const aiMonitoringClientService = new AiMonitoringClientService();
export default aiMonitoringClientService;
