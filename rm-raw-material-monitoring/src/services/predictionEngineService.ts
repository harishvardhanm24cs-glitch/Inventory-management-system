import { apiService } from './api';

export interface DemandPredictionItem {
  material_id: number;
  material_name: string;
  barcode: string;
  unit: string;
  current_stock: number;
  avg_daily_usage: number;
  forecast_7d: number;
  forecast_14d: number;
  forecast_30d: number;
  confidence_score: number;
  model_used: string;
}

export interface DepletionPredictionItem {
  material_id: number;
  material_name: string;
  barcode: string;
  unit: string;
  current_stock: number;
  threshold_limit: number;
  avg_daily_usage: number;
  days_until_depletion: number | null;
  predicted_depletion_date: string | null;
  days_until_threshold: number | null;
  depletion_status: 'HEALTHY' | 'BELOW_THRESHOLD' | 'DEPLETED' | 'CRITICAL_DEPLETION_RISK' | 'WARNING_DEPLETION_RISK';
  model_used: string;
}

export interface RackUtilizationPredictionItem {
  rack_code: string;
  material_name: string;
  current_capacity: number;
  max_capacity: number;
  current_occupancy_pct: number;
  projected_occ_7d: number;
  projected_occ_14d: number;
  projected_occ_30d: number;
  bottleneck_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  model_used: string;
}

export interface WarehouseRiskPredictionPayload {
  overall_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_factors: {
    stock_risk: number;
    rack_bottleneck_risk: number;
    alert_system_risk: number;
  };
  metrics_breakdown: {
    depleted_materials: number;
    below_threshold_materials: number;
    overloaded_racks: number;
    critical_alerts: number;
  };
  model_used: string;
}

export interface ConsumptionTrendPredictionItem {
  material_id: number;
  material_name: string;
  barcode: string;
  avg_daily_usage: number;
  trend_direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  trend_slope_pct: number;
  anomaly_detected: boolean;
  model_used: string;
}

export interface PredictionEngineOverview {
  timestamp: string;
  engine_version: string;
  model_strategy: string;
  predictions: {
    demand: DemandPredictionItem[];
    depletion: DepletionPredictionItem[];
    rack_utilization: RackUtilizationPredictionItem[];
    warehouse_risk: WarehouseRiskPredictionPayload;
    consumption_trend: ConsumptionTrendPredictionItem[];
  };
}

export interface PredictiveRecommendationItem {
  id: string;
  recommendation_type: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  impact?: string;
  suggestedAction?: string;
  targetEntity?: {
    type: string;
    codeOrId: string;
  };
  metrics?: any;
  createdAt: string;
}

export interface PredictiveRecommendationPayload {
  warehouse_risk: WarehouseRiskPredictionPayload;
  total_recommendations: number;
  recommendations: PredictiveRecommendationItem[];
}

class PredictionEngineClientService {
  async getOverview(): Promise<PredictionEngineOverview | null> {
    try {
      return await apiService.getPredictionEngineOverview();
    } catch (err) {
      console.error('[PredictionEngineClientService] getOverview error:', err);
      return null;
    }
  }

  async getDemand(): Promise<DemandPredictionItem[]> {
    try {
      return await apiService.getPredictionDemand();
    } catch (err) {
      console.error('[PredictionEngineClientService] getDemand error:', err);
      return [];
    }
  }

  async getDepletion(): Promise<DepletionPredictionItem[]> {
    try {
      return await apiService.getPredictionDepletion();
    } catch (err) {
      console.error('[PredictionEngineClientService] getDepletion error:', err);
      return [];
    }
  }

  async getRackUtilization(): Promise<RackUtilizationPredictionItem[]> {
    try {
      return await apiService.getPredictionRackUtilization();
    } catch (err) {
      console.error('[PredictionEngineClientService] getRackUtilization error:', err);
      return [];
    }
  }

  async getWarehouseRisk(): Promise<WarehouseRiskPredictionPayload | null> {
    try {
      return await apiService.getPredictionWarehouseRisk();
    } catch (err) {
      console.error('[PredictionEngineClientService] getWarehouseRisk error:', err);
      return null;
    }
  }

  async getConsumptionTrend(): Promise<ConsumptionTrendPredictionItem[]> {
    try {
      return await apiService.getPredictionConsumptionTrend();
    } catch (err) {
      console.error('[PredictionEngineClientService] getConsumptionTrend error:', err);
      return [];
    }
  }

  async getRecommendations(): Promise<PredictiveRecommendationPayload | null> {
    try {
      return await apiService.getPredictiveRecommendations();
    } catch (err) {
      console.error('[PredictionEngineClientService] getRecommendations error:', err);
      return null;
    }
  }
}

export const predictionEngineService = new PredictionEngineClientService();
export default predictionEngineService;
