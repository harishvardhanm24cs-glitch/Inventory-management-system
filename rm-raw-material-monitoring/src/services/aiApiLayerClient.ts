import { apiService } from './api';

export interface ApiResponseEnvelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: {
    timestamp: string;
    version: string;
    cloud_ready: boolean;
    service: string;
  };
}

export interface AiApiPredictionItem {
  material_id: number;
  material_name: string;
  barcode: string;
  unit: string;
  current_stock: number;
  threshold_limit: number;
  avg_daily_usage: number;
  days_remaining: number | null;
  days_until_threshold: number | null;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_score: number;
  model_used: string;
}

export interface AiApiRecommendationItem {
  id: string;
  type: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  impact: string;
  suggestedAction: string;
  targetEntity: any;
  created_at: string;
}

export interface AiApiWarehouseHealthPayload {
  health_index: number;
  risk_score: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  metrics: {
    total_materials: number;
    depleted_materials: number;
    low_stock_materials: number;
    overloaded_racks: number;
    active_alerts: number;
  };
  risk_factors: {
    stock_risk: number;
    rack_bottleneck_risk: number;
    alert_system_risk: number;
  };
}

export interface AiApiForecastItem {
  material_id: number;
  material_name: string;
  unit: string;
  current_stock: number;
  forecast_7d: number;
  forecast_14d: number;
  forecast_30d: number;
  avg_daily_usage: number;
  projected_depletion_date: string;
}

export interface AiApiModelStatusPayload {
  active_model: {
    id: string;
    name: string;
    framework: string;
    version: string;
    is_loaded: boolean;
    status: string;
  };
  pipeline: {
    status: string;
    dataset_version: string;
    last_run_at: string;
    fallback_mode_enabled: boolean;
  };
  performance: {
    accuracy_pct: number;
    f1_score: number;
    mae_score: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    error_rate_pct: number;
  };
  total_registered_models: number;
  models: any[];
}

export interface AiApiInsightsPayload {
  executive_summary: {
    headline: string;
    key_findings: string[];
    system_status: string;
  };
  insights: {
    materials_analyzed: number;
    racks_analyzed: number;
    confidence_index: number;
    xai_transparency_guarantee: boolean;
  };
}

class AiApiLayerClient {
  private baseUrl = 'http://localhost:5000/api/v1/ai';

  private async fetchJson<T>(endpoint: string): Promise<ApiResponseEnvelope<T> | null> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`[AiApiLayerClient] Error fetching ${endpoint}:`, err);
      return null;
    }
  }

  async getPredictions(): Promise<ApiResponseEnvelope<{ count: number; predictions: AiApiPredictionItem[] }> | null> {
    return this.fetchJson<{ count: number; predictions: AiApiPredictionItem[] }>('/predictions');
  }

  async getRecommendations(): Promise<ApiResponseEnvelope<{ total: number; recommendations: AiApiRecommendationItem[] }> | null> {
    return this.fetchJson<{ total: number; recommendations: AiApiRecommendationItem[] }>('/recommendations');
  }

  async getWarehouseHealth(): Promise<ApiResponseEnvelope<AiApiWarehouseHealthPayload> | null> {
    return this.fetchJson<AiApiWarehouseHealthPayload>('/warehouse-health');
  }

  async getForecasts(): Promise<ApiResponseEnvelope<{ total: number; forecasts: AiApiForecastItem[] }> | null> {
    return this.fetchJson<{ total: number; forecasts: AiApiForecastItem[] }>('/forecasts');
  }

  async getModelStatus(): Promise<ApiResponseEnvelope<AiApiModelStatusPayload> | null> {
    return this.fetchJson<AiApiModelStatusPayload>('/models/status');
  }

  async getInsights(): Promise<ApiResponseEnvelope<AiApiInsightsPayload> | null> {
    return this.fetchJson<AiApiInsightsPayload>('/insights');
  }
}

export const aiApiLayerClient = new AiApiLayerClient();
export default aiApiLayerClient;
