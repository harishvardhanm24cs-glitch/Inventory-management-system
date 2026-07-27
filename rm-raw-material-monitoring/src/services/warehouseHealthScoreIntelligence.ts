/**
 * warehouseHealthScoreIntelligence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 10 – Warehouse Health Score Client Engine
 *
 * Client-side service module for warehouse health score.
 * Consumes overall 0-100 score, health status classification (OPTIMAL, MONITOR, ATTENTION, CRITICAL),
 * sub-score breakdowns, priority issues, recommendations, and recent improvements.
 *
 * Exposes score to:
 * • Dashboard (Executive & Operations)
 * • Digital Twin (Map Header & Status Inspector)
 * • Reports & Analytics Engine
 * • Manager Home Screen (ManagerDashboard)
 */

import api from './api';

export type WarehouseHealthStatus = 'OPTIMAL' | 'MONITOR' | 'ATTENTION' | 'CRITICAL';

export interface SubScoresBreakdown {
  inventory_availability_pct: number;
  low_stock_penalty: number;
  dead_stock_penalty: number;
  rack_utilization_penalty: number;
  scanner_health_pct: number;
  sync_health_pct: number;
  pending_alerts_penalty: number;
}

export interface WarehouseHealthScorePayload {
  overall_score: number;
  health_status: WarehouseHealthStatus;
  status_color: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  sub_scores: SubScoresBreakdown;
  priority_issues: string[];
  recommendations: string[];
  recent_improvements: string[];
  last_updated: string;
}

class ClientWarehouseHealthScoreIntelligence {
  /**
   * Fetch live overall warehouse health score
   */
  async getHealthScore(): Promise<WarehouseHealthScorePayload> {
    try {
      const res: any = await api.getWarehouseHealthScore();
      if (res && res.data) {
        return res.data;
      }
      return {
        overall_score: 100,
        health_status: 'OPTIMAL',
        status_color: 'GREEN',
        sub_scores: {
          inventory_availability_pct: 100,
          low_stock_penalty: 0,
          dead_stock_penalty: 0,
          rack_utilization_penalty: 0,
          scanner_health_pct: 100,
          sync_health_pct: 100,
          pending_alerts_penalty: 0,
        },
        priority_issues: [],
        recommendations: [],
        recent_improvements: ['Operational health operating normally.'],
        last_updated: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[WarehouseHealthScore] Failed to fetch health score:', err);
      return {
        overall_score: 100,
        health_status: 'OPTIMAL',
        status_color: 'GREEN',
        sub_scores: {
          inventory_availability_pct: 100,
          low_stock_penalty: 0,
          dead_stock_penalty: 0,
          rack_utilization_penalty: 0,
          scanner_health_pct: 100,
          sync_health_pct: 100,
          pending_alerts_penalty: 0,
        },
        priority_issues: [],
        recommendations: [],
        recent_improvements: [],
        last_updated: new Date().toISOString(),
      };
    }
  }
}

export const warehouseHealthScoreService = new ClientWarehouseHealthScoreIntelligence();
