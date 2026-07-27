/**
 * warehouseIntelligenceEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend AI Warehouse Intelligence Engine Service (Module 1 - System Brain)
 *
 * Dedicated, UI-decoupled client-side intelligence module.
 * Consumes warehouse data (Inventory, Racks, Transactions, Thresholds, Twin)
 * and generates structured recommendations, insights, and alert prioritization.
 *
 * Fully reusable by:
 * • Dashboard (Executive & Operations)
 * • Digital Twin (WarehouseTwin)
 * • Notifications & Alert System
 * • Reports & Analytics Engine
 */

import api from './api';

export interface StructuredRecommendation {
  id: string;
  recommendation_type: 'STOCK_REORDER' | 'STOCK_WARNING' | 'RACK_CAPACITY' | 'OCCUPANCY_BALANCE' | 'ZONE_UNDERUTILIZATION' | 'SLOW_MOVING_STOCK' | 'SPACE_OPTIMIZATION' | string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  impact?: string;
  suggestedAction?: string;
  targetEntity?: {
    type: 'material' | 'rack' | 'zone';
    codeOrId: string;
  };
  metrics?: {
    currentStock?: number;
    threshold?: number;
    occupancyPct?: number;
    riskScore?: number;
    daysRemaining?: number | null;
  };
  createdAt?: string;
}

export interface IntelligenceInsight {
  totalRiskItems: number;
  criticalReordersCount: number;
  overloadedRacksCount: number;
  underutilizedZonesCount: number;
  topPriorityAction: StructuredRecommendation | null;
}

class ClientIntelligenceEngine {
  /**
   * Fetch and synthesize structured recommendations across warehouse services
   */
  async getRecommendations(): Promise<StructuredRecommendation[]> {
    try {
      const res: any = await api.getAiRecommendations();
      let rawList: any[] = [];

      if (res && res.data && Array.isArray(res.data)) {
        rawList = res.data;
      } else if (Array.isArray(res)) {
        rawList = res;
      }

      return rawList.map((item, idx) => this.normalizeRecommendation(item, idx));
    } catch (err) {
      console.error('[IntelligenceEngine] Failed to fetch recommendations:', err);
      return [];
    }
  }

  /**
   * Synthesize real-time operational insights for Dashboard & Reports
   */
  async getInsights(): Promise<IntelligenceInsight> {
    const recommendations = await this.getRecommendations();

    const criticalReordersCount = recommendations.filter(
      r => r.recommendation_type === 'STOCK_REORDER' && r.priority === 'CRITICAL'
    ).length;

    const overloadedRacksCount = recommendations.filter(
      r => r.recommendation_type === 'RACK_CAPACITY' && (r.priority === 'CRITICAL' || r.priority === 'HIGH')
    ).length;

    const underutilizedZonesCount = recommendations.filter(
      r => r.recommendation_type === 'ZONE_UNDERUTILIZATION'
    ).length;

    const topPriorityAction = recommendations.find(r => r.priority === 'CRITICAL') || recommendations[0] || null;

    return {
      totalRiskItems: recommendations.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH').length,
      criticalReordersCount,
      overloadedRacksCount,
      underutilizedZonesCount,
      topPriorityAction,
    };
  }

  /**
   * Get load balancing and rack optimization suggestions for Digital Twin
   */
  async getRackOptimizations(): Promise<any[]> {
    try {
      const res: any = await api.getRackOptimizations();
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error('[IntelligenceEngine] Failed to fetch rack optimizations:', err);
      return [];
    }
  }

  /**
   * Normalize raw payload into a strongly-typed StructuredRecommendation object
   */
  private normalizeRecommendation(item: any, idx: number): StructuredRecommendation {
    const id = item.id || `rec-${item.recommendation_type || 'AI'}-${idx}-${Date.now()}`;
    const type = item.recommendation_type || 'SPACE_OPTIMIZATION';
    const priority = item.priority || 'MEDIUM';
    const message = item.message || item.suggestion || 'Optimization suggestion generated.';

    let title = 'AI Recommendation';
    let impact = 'Improves warehouse operational efficiency.';
    let suggestedAction = message;

    if (type === 'STOCK_REORDER') {
      title = 'Critical Reorder Required';
      impact = 'Prevents inventory depletion and manufacturing downtime.';
      suggestedAction = 'Place purchase order with supplier immediately.';
    } else if (type === 'RACK_CAPACITY') {
      title = 'Rack Capacity Warning';
      impact = 'Prevents shelf overload and physical bottlenecking.';
      suggestedAction = 'Relocate portion of stock to adjacent empty rack.';
    } else if (type === 'OCCUPANCY_BALANCE') {
      title = 'Rack Load Balancing';
      impact = 'Distributes warehouse weight evenly across active zones.';
      suggestedAction = 'Perform internal stock relocation.';
    } else if (type === 'ZONE_UNDERUTILIZATION') {
      title = 'Zone Underutilization';
      impact = 'Increases floor space efficiency.';
      suggestedAction = 'Reassign inbound storage batches to this zone.';
    }

    return {
      id,
      recommendation_type: type,
      priority,
      title: item.title || title,
      message,
      impact: item.impact || impact,
      suggestedAction: item.suggestedAction || suggestedAction,
      targetEntity: item.targetEntity || {
        type: type.includes('RACK') ? 'rack' : type.includes('ZONE') ? 'zone' : 'material',
        codeOrId: item.current_rack || 'WAREHOUSE'
      },
      metrics: item.metrics || {},
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }
}

export const warehouseIntelligenceEngine = new ClientIntelligenceEngine();
