import { apiService } from './api';

export interface XaiFactor {
  factor_name: string;
  weight: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | string;
  description: string;
}

export interface XaiExplanation {
  id: string;
  target_id: string;
  target_name?: string;
  prediction: string;
  confidence_score: number;
  key_factors: XaiFactor[];
  reasoning: string[];
  suggested_action: string;
  data_sources_used: string[];
  timestamp: string;
  priority?: string;
  category?: string;
}

export interface PortalXaiPayload {
  portal: 'Dashboard' | 'Digital Twin' | 'Reports' | 'Manager Portal' | string;
  description: string;
  timestamp: string;
  summary?: any;
  nodes_explained?: number;
  spatial_explanations?: XaiExplanation[];
  total_reports_explained?: number;
  explanations?: XaiExplanation[];
  escalated_items_count?: number;
  escalated_explanations?: XaiExplanation[];
}

class XaiClientService {
  async explainMaterial(materialId: string): Promise<XaiExplanation | null> {
    try {
      const res: any = await (apiService as any).explainMaterial(materialId);
      return res?.data || res || null;
    } catch (err) {
      console.error(`[XaiClientService] explainMaterial error (${materialId}):`, err);
      return null;
    }
  }

  async explainRack(rackCode: string): Promise<XaiExplanation | null> {
    try {
      const res: any = await (apiService as any).explainRack(rackCode);
      return res?.data || res || null;
    } catch (err) {
      console.error(`[XaiClientService] explainRack error (${rackCode}):`, err);
      return null;
    }
  }

  async getDashboardXai(): Promise<PortalXaiPayload | null> {
    try {
      const res: any = await (apiService as any).getXaiDashboard();
      return res?.data || res || null;
    } catch (err) {
      console.error('[XaiClientService] getDashboardXai error:', err);
      return null;
    }
  }

  async getDigitalTwinXai(): Promise<PortalXaiPayload | null> {
    try {
      const res: any = await (apiService as any).getXaiDigitalTwin();
      return res?.data || res || null;
    } catch (err) {
      console.error('[XaiClientService] getDigitalTwinXai error:', err);
      return null;
    }
  }

  async getReportsXai(): Promise<PortalXaiPayload | null> {
    try {
      const res: any = await (apiService as any).getXaiReports();
      return res?.data || res || null;
    } catch (err) {
      console.error('[XaiClientService] getReportsXai error:', err);
      return null;
    }
  }

  async getManagerPortalXai(): Promise<PortalXaiPayload | null> {
    try {
      const res: any = await (apiService as any).getXaiManagerPortal();
      return res?.data || res || null;
    } catch (err) {
      console.error('[XaiClientService] getManagerPortalXai error:', err);
      return null;
    }
  }
}

export const xaiService = new XaiClientService();
export default xaiService;
