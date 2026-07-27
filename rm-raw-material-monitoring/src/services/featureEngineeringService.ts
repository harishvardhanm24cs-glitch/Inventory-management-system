import { apiService } from './api';

export interface FeatureMetadata {
  version: string;
  module: string;
  features_count: number;
  generated_at: string;
  consumers: string[];
}

export interface MaterialFeatureVector {
  material_id: number;
  barcode: string;
  material_name: string;
  unit: string;
  current_stock: number;
  threshold_limit: number;
  daily_consumption: number;
  weekly_consumption: number;
  monthly_consumption: number;
  turnover_ratio: number;
  turnover_category: 'HIGH_TURNOVER' | 'MODERATE_TURNOVER' | 'SLOW_MOVING';
  movement_events_24h: number;
  movement_events_7d: number;
  movement_events_30d: number;
  activity_score: number;
  activity_tier: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'DORMANT';
  threshold_distance: number;
  margin_percentage: number;
  risk_flag: 'DEPLETED' | 'BELOW_THRESHOLD' | 'NEAR_THRESHOLD' | 'SAFE';
}

export interface RackOccupancyFeature {
  rack_code: string;
  material_name: string;
  current_capacity: number;
  max_capacity: number;
  occupancy_percentage: number;
  status_flag: 'OVERLOADED' | 'OPTIMAL' | 'UNDERUTILIZED';
}

export interface AverageScanTimeFeature {
  total_scans: number;
  interval_count?: number;
  avg_scan_interval_seconds: number;
  avg_scan_interval_formatted: string;
  scan_efficiency_rating: 'FAST' | 'MODERATE' | 'SLOW';
}

export interface WarehouseUtilizationFeature {
  total_racks: number;
  total_current_capacity: number;
  total_max_capacity: number;
  warehouse_utilization_percentage: number;
  utilization_status: 'NEAR_FULL_CAPACITY' | 'BALANCED' | 'UNDERUTILIZED_SPACE';
}

export interface FeaturePayload {
  metadata: FeatureMetadata;
  material_features: MaterialFeatureVector[];
  rack_features: {
    racks: RackOccupancyFeature[];
  };
  warehouse_features: {
    average_scan_time: AverageScanTimeFeature;
    warehouse_utilization: WarehouseUtilizationFeature;
  };
}

export interface FeatureCatalogItem {
  id: string;
  name: string;
  unit: string;
  version: string;
  formula: string;
  consumed_by: string[];
}

class FeatureEngineeringClientService {
  async getAllFeatures(): Promise<FeaturePayload | null> {
    try {
      const res: any = await (apiService as any).getFeatures();
      return res?.data || res || null;
    } catch (err) {
      console.error('[FeatureEngineeringService] getAllFeatures error:', err);
      return null;
    }
  }

  async getMaterialFeatures(): Promise<MaterialFeatureVector[]> {
    try {
      const res: any = await (apiService as any).getMaterialFeatures();
      return res?.data || res || [];
    } catch (err) {
      console.error('[FeatureEngineeringService] getMaterialFeatures error:', err);
      return [];
    }
  }

  async getFeatureCatalog(): Promise<FeatureCatalogItem[]> {
    try {
      const res: any = await (apiService as any).getFeatureCatalog();
      return res?.data || res || [];
    } catch (err) {
      console.error('[FeatureEngineeringService] getFeatureCatalog error:', err);
      return [];
    }
  }
}

export const featureEngineeringService = new FeatureEngineeringClientService();
export default featureEngineeringService;
