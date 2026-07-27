/**
 * deadStockIntelligence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 5 – Dead Stock Intelligence Client Engine
 *
 * Dedicated client-side module for dead stock detection.
 * Analyzes Last Movement Date, Days Since Last Movement, Total Quantity,
 * and Rack Location for every material in inventory.
 *
 * Classifies materials into:
 * • Active     (<= 15 days)
 * • Idle       (16 - 45 days)
 * • Dead Stock (> 45 days)
 *
 * Reusable by:
 * • Dashboard KPI Cards & Inactive Stock Widgets
 * • Digital Twin (Cold Spot & Inspection Badges)
 * • Reports & Audit Logs
 * • Notification Center
 */

import api from './api';

export type DeadStockClassification = 'Active' | 'Idle' | 'Dead Stock';

export interface DeadStockMaterialItem {
  material_id: string | number;
  material_name: string;
  barcode: string;
  unit: string;
  total_quantity: number;
  rack_location: string;
  last_movement_date: string | null;
  days_since_last_movement: number;
  classification: DeadStockClassification;
  suggested_action_type: 'SCHEDULE_INSPECTION' | 'CONSIDER_RELOCATION' | 'REVIEW_INVENTORY' | 'NO_ACTION';
  recommended_action: string;
}

export interface DeadStockReportPayload {
  materials: DeadStockMaterialItem[];
  dead_stock_materials: DeadStockMaterialItem[];
  idle_materials: DeadStockMaterialItem[];
  active_materials: DeadStockMaterialItem[];
  summary: {
    total_materials: number;
    active_count: number;
    idle_count: number;
    dead_stock_count: number;
    dead_stock_percentage: number;
  };
  configurable_thresholds: {
    active_max_days: number;
    idle_max_days: number;
  };
}

class ClientDeadStockIntelligence {
  /**
   * Fetch complete dead stock intelligence report with optional custom threshold parameters
   */
  async getReport(params?: { active_max_days?: number; idle_max_days?: number }): Promise<DeadStockReportPayload> {
    try {
      const res: any = await api.getDeadStockIntelligence(params);
      if (res && res.data) {
        return res.data;
      }
      return {
        materials: [],
        dead_stock_materials: [],
        idle_materials: [],
        active_materials: [],
        summary: {
          total_materials: 0,
          active_count: 0,
          idle_count: 0,
          dead_stock_count: 0,
          dead_stock_percentage: 0,
        },
        configurable_thresholds: {
          active_max_days: params?.active_max_days || 15,
          idle_max_days: params?.idle_max_days || 45,
        }
      };
    } catch (err) {
      console.error('[DeadStockIntelligence] Failed to fetch report:', err);
      return {
        materials: [],
        dead_stock_materials: [],
        idle_materials: [],
        active_materials: [],
        summary: {
          total_materials: 0,
          active_count: 0,
          idle_count: 0,
          dead_stock_count: 0,
          dead_stock_percentage: 0,
        },
        configurable_thresholds: {
          active_max_days: 15,
          idle_max_days: 45,
        }
      };
    }
  }

  /**
   * Get materials classified specifically as Dead Stock (>45 days inactive)
   */
  async getDeadStockItems(): Promise<DeadStockMaterialItem[]> {
    const report = await this.getReport();
    return report.dead_stock_materials || [];
  }

  /**
   * Get materials classified as Idle (16-45 days inactive)
   */
  async getIdleItems(): Promise<DeadStockMaterialItem[]> {
    const report = await this.getReport();
    return report.idle_materials || [];
  }
}

export const deadStockIntelligenceService = new ClientDeadStockIntelligence();
