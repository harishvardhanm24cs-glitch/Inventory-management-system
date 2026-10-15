

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
