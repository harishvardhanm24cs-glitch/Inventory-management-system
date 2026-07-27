/**
 * smartAlertIntelligence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 7 – AI Smart Alert System Client Engine
 *
 * Client-side intelligence module for smart alert management.
 * Enhances existing threshold alerts with intelligent recommendations and suggested actions.
 *
 * Supported Alert Types:
 * • CRITICAL_STOCK
 * • DEAD_STOCK
 * • HIGH_CONSUMPTION
 * • RACK_CAPACITY
 * • SCANNER_FAILURE
 * • SYNC_FAILURE
 *
 * Supported Severities:
 * • CRITICAL (Red)
 * • WARNING (Yellow/Amber)
 * • SUCCESS (Green)
 *
 * Reusable by:
 * • Dashboard (Top Notification Banner & Executive Alerts)
 * • Digital Twin (Heatmap Badges & Real-time Alert Markers)
 * • Manager Portal (Alert Management Page)
 */

import api from './api';

export type SmartAlertType = 
  | 'CRITICAL_STOCK' 
  | 'DEAD_STOCK' 
  | 'HIGH_CONSUMPTION' 
  | 'RACK_CAPACITY' 
  | 'SCANNER_FAILURE' 
  | 'SYNC_FAILURE';

export type SmartAlertSeverity = 'CRITICAL' | 'WARNING' | 'SUCCESS';

export interface SmartAlertItem {
  id: string;
  alert_type: SmartAlertType;
  severity: SmartAlertSeverity;
  material: string;
  rack: string;
  timestamp: string;
  recommendation: string;
  suggested_action: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
}

export interface SmartAlertReportPayload {
  alerts: SmartAlertItem[];
  summary: {
    total_alerts: number;
    critical_count: number;
    warning_count: number;
    success_count: number;
  };
}

class ClientSmartAlertIntelligence {
  /**
   * Fetch live smart alerts across all 6 alert categories
   */
  async getReport(): Promise<SmartAlertReportPayload> {
    try {
      const res: any = await api.getSmartAlerts();
      if (res && res.data) {
        return res.data;
      }
      return {
        alerts: [],
        summary: {
          total_alerts: 0,
          critical_count: 0,
          warning_count: 0,
          success_count: 0,
        }
      };
    } catch (err) {
      console.error('[SmartAlertIntelligence] Failed to fetch report:', err);
      return {
        alerts: [],
        summary: {
          total_alerts: 0,
          critical_count: 0,
          warning_count: 0,
          success_count: 0,
        }
      };
    }
  }

  /**
   * Get alerts filtered by severity (CRITICAL | WARNING | SUCCESS)
   */
  async getAlertsBySeverity(severity: SmartAlertSeverity): Promise<SmartAlertItem[]> {
    const report = await this.getReport();
    return (report.alerts || []).filter(a => a.severity === severity);
  }
}

export const smartAlertIntelligenceService = new ClientSmartAlertIntelligence();
