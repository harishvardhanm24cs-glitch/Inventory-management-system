/**
 * lowStockIntelligence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 2 – Low Stock Intelligence Client Engine
 *
 * Dedicated client-side module for dynamic low stock analysis.
 * Analyzes Current Quantity, Threshold Limit, Consumption Rate (burn rate),
 * and Recent Transactions to evaluate dynamic states (SAFE, MONITOR, REORDER_SOON, CRITICAL).
 *
 * Provides typed methods for:
 * • Dashboard KPI Widgets & Stock Health Cards
 * • Reorder Priority Tables & Action Timelines
 * • Support for pluggable client-side ML Predictor models
 */

import api from './api';

export type LowStockStatus = 'SAFE' | 'MONITOR' | 'REORDER_SOON' | 'CRITICAL';

export interface LowStockAnalysisItem {
  material_id: string | number;
  material_name: string;
  barcode: string;
  unit: string;
  current_stock: number;
  threshold_limit: number;
  burn_rate: number;
  days_remaining: number | null;
  days_until_threshold: number | null;
  status: LowStockStatus;
  recommended_reorder_qty: number;
  suggested_timeframe: string;
  recommendation: string;
  confidence_score: number;
  predictor_type: string;
}

export interface LowStockSummary {
  totalItems: number;
  criticalCount: number;
  reorderSoonCount: number;
  monitorCount: number;
  safeCount: number;
  highRiskItems: LowStockAnalysisItem[];
}

class ClientLowStockIntelligence {
  /**
   * Fetch live low-stock analytical predictions from backend engine
   */
  async getAnalysis(): Promise<LowStockAnalysisItem[]> {
    try {
      const res: any = await api.getLowStockIntelligence();
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error('[LowStockIntelligence] Failed to fetch analysis:', err);
      return [];
    }
  }

  /**
   * Summarize warehouse inventory health for executive widgets
   */
  async getSummary(): Promise<LowStockSummary> {
    const items = await this.getAnalysis();

    const criticalCount = items.filter(i => i.status === 'CRITICAL').length;
    const reorderSoonCount = items.filter(i => i.status === 'REORDER_SOON').length;
    const monitorCount = items.filter(i => i.status === 'MONITOR').length;
    const safeCount = items.filter(i => i.status === 'SAFE').length;

    const highRiskItems = items.filter(i => i.status === 'CRITICAL' || i.status === 'REORDER_SOON');

    return {
      totalItems: items.length,
      criticalCount,
      reorderSoonCount,
      monitorCount,
      safeCount,
      highRiskItems,
    };
  }
}

export const lowStockIntelligenceService = new ClientLowStockIntelligence();
