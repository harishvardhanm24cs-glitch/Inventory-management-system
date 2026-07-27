/**
 * rackOptimizationIntelligence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 6 – Rack Optimization Intelligence Client Engine
 *
 * Dedicated client-side module for rack optimization.
 * Analyzes rack occupancy, available capacity, material frequency, category,
 * and zone utilization.
 *
 * Advisory-Only Safety Guarantee:
 * • Never automatically moves materials or mutates DB allocations.
 * • Generates advisory recommendations only.
 *
 * Recommendations:
 * • Better rack placement
 * • Rack nearing full capacity
 * • Rack underutilized
 * • Improve warehouse flow
 *
 * Reusable by:
 * • Dashboard (Executive & Operations)
 * • Digital Twin (WarehouseTwin Slot Inspector & Heatmaps)
 * • Manager Panel (Rack View)
 */

import api from './api';

export type OptimizationType = 'BETTER_PLACEMENT' | 'NEAR_FULL_CAPACITY' | 'RACK_UNDERUTILIZED' | 'IMPROVE_WAREHOUSE_FLOW';

export interface RackOptimizationItem {
  id: string;
  optimization_type: OptimizationType;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  current_rack: string;
  suggested_rack: string | null;
  material_name: string | null;
  category: string | null;
  suggestion: string;
  expected_improvement: string;
  metrics: {
    occupancy_percentage: number;
    available_capacity: number;
    scan_frequency_30d: number;
  };
  created_at: string;
}

export interface RackOptimizationReportPayload {
  optimizations: RackOptimizationItem[];
  summary: {
    total_recommendations: number;
    near_full_racks_count: number;
    underutilized_racks_count: number;
    placement_suggestions_count: number;
    flow_suggestions_count: number;
  };
}

class ClientRackOptimizationIntelligence {
  /**
   * Fetch complete rack optimization report
   */
  async getReport(): Promise<RackOptimizationReportPayload> {
    try {
      const res: any = await api.getRackOptimizationIntelligence();
      if (res && res.data) {
        return res.data;
      }
      return {
        optimizations: [],
        summary: {
          total_recommendations: 0,
          near_full_racks_count: 0,
          underutilized_racks_count: 0,
          placement_suggestions_count: 0,
          flow_suggestions_count: 0,
        }
      };
    } catch (err) {
      console.error('[RackOptimizationIntelligence] Failed to fetch report:', err);
      return {
        optimizations: [],
        summary: {
          total_recommendations: 0,
          near_full_racks_count: 0,
          underutilized_racks_count: 0,
          placement_suggestions_count: 0,
          flow_suggestions_count: 0,
        }
      };
    }
  }

  /**
   * Fetch placement suggestions specifically
   */
  async getPlacementSuggestions(): Promise<RackOptimizationItem[]> {
    const report = await this.getReport();
    return (report.optimizations || []).filter(o => o.optimization_type === 'BETTER_PLACEMENT');
  }

  /**
   * Fetch near-full capacity rack alerts
   */
  async getNearFullRacks(): Promise<RackOptimizationItem[]> {
    const report = await this.getReport();
    return (report.optimizations || []).filter(o => o.optimization_type === 'NEAR_FULL_CAPACITY');
  }
}

export const rackOptimizationIntelligenceService = new ClientRackOptimizationIntelligence();
