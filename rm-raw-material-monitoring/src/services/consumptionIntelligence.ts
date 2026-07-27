/**
 * consumptionIntelligence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 4 – Consumption Intelligence Client Engine
 *
 * Dedicated client-side module for material consumption intelligence.
 * Calculates daily, weekly, monthly consumption rates, consumption trend vectors
 * (Increasing, Stable, Decreasing), and most/least consumed material rankings.
 *
 * Provides reusable client APIs for:
 * • Dashboard Analytics Charts & KPI Widgets
 * • Inventory & Material Analytics Reports
 * • Digital Twin Material Flow Corridors
 * • AI Recommendation Engine
 */

import api from './api';

export type ConsumptionTrend = 'Increasing' | 'Stable' | 'Decreasing';

export interface MaterialConsumptionItem {
  material_id: string | number;
  material_name: string;
  barcode: string;
  unit: string;
  current_quantity: number;
  total_consumed: number;
  avg_daily_consumption: number;
  avg_weekly_consumption: number;
  avg_monthly_consumption: number;
  recent_7d_consumed: number;
  trend: ConsumptionTrend;
  trend_percentage_change: number;
}

export interface ConsumptionReportPayload {
  materials: MaterialConsumptionItem[];
  most_consumed: MaterialConsumptionItem[];
  least_consumed: MaterialConsumptionItem[];
  summary: {
    total_warehouse_daily_consumption: number;
    total_warehouse_weekly_consumption: number;
    total_warehouse_monthly_consumption: number;
    increasing_count: number;
    stable_count: number;
    decreasing_count: number;
  };
}

class ClientConsumptionIntelligence {
  /**
   * Fetch complete consumption intelligence report
   */
  async getReport(): Promise<ConsumptionReportPayload> {
    try {
      const res: any = await api.getConsumptionIntelligence();
      if (res && res.data) {
        return res.data;
      }
      return {
        materials: [],
        most_consumed: [],
        least_consumed: [],
        summary: {
          total_warehouse_daily_consumption: 0,
          total_warehouse_weekly_consumption: 0,
          total_warehouse_monthly_consumption: 0,
          increasing_count: 0,
          stable_count: 0,
          decreasing_count: 0,
        }
      };
    } catch (err) {
      console.error('[ConsumptionIntelligence] Failed to fetch report:', err);
      return {
        materials: [],
        most_consumed: [],
        least_consumed: [],
        summary: {
          total_warehouse_daily_consumption: 0,
          total_warehouse_weekly_consumption: 0,
          total_warehouse_monthly_consumption: 0,
          increasing_count: 0,
          stable_count: 0,
          decreasing_count: 0,
        }
      };
    }
  }

  /**
   * Fetch top 5 most consumed materials
   */
  async getMostConsumed(): Promise<MaterialConsumptionItem[]> {
    const report = await this.getReport();
    return report.most_consumed || [];
  }

  /**
   * Fetch top 5 least consumed materials
   */
  async getLeastConsumed(): Promise<MaterialConsumptionItem[]> {
    const report = await this.getReport();
    return report.least_consumed || [];
  }
}

export const consumptionIntelligenceService = new ClientConsumptionIntelligence();
