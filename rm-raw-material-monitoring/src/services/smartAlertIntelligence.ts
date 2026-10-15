

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

  
  async getAlertsBySeverity(severity: SmartAlertSeverity): Promise<SmartAlertItem[]> {
    const report = await this.getReport();
    return (report.alerts || []).filter(a => a.severity === severity);
  }
}

export const smartAlertIntelligenceService = new ClientSmartAlertIntelligence();
