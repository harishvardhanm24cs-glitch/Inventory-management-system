import db from '../config/db.js';
import lowStockIntelligence from './lowStockIntelligence.js';
import consumptionIntelligence from './consumptionIntelligence.js';
import deadStockIntelligence from './deadStockIntelligence.js';
import rackOptimizationIntelligence from './rackOptimizationIntelligence.js';

/**
 * smartAlertIntelligence.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 7 – AI Smart Alert System
 *
 * Enhances existing threshold alerts with intelligent recommendations and suggested actions.
 * Reuses existing alerts DB table while synthesizing multi-module AI insights.
 */

class SmartAlertIntelligenceEngine {
  async generateSmartAlerts() {
    const alerts = [];
    const nowISO = new Date().toISOString();

    // 1. Fetch DB alerts if available
    let dbAlerts = [];
    try {
      const [rows] = await db.query('SELECT * FROM alerts WHERE status != "RESOLVED" ORDER BY created_at DESC LIMIT 20');
      dbAlerts = rows || [];
    } catch {
      dbAlerts = [];
    }

    dbAlerts.forEach((da, idx) => {
      alerts.push({
        id: da.id ? `db-alert-${da.id}` : `alert-db-${idx}`,
        alert_type: da.alert_type || 'CRITICAL_STOCK',
        severity: da.severity || (da.alert_type === 'CRITICAL_STOCK' ? 'CRITICAL' : 'WARNING'),
        material: da.material_name || 'Warehouse Stock',
        rack: da.rack_code || 'A1',
        timestamp: da.created_at ? new Date(da.created_at).toISOString() : nowISO,
        recommendation: da.message || 'System threshold alert triggered.',
        suggested_action: da.suggested_action || 'Inspect physical rack location and confirm stock balance.',
        status: 'ACTIVE',
      });
    });

    // 2. Synthesize Module 2 (Low Stock Intelligence)
    try {
      const lowStockData = await lowStockIntelligence.analyzeAll();
      const criticalLow = lowStockData.filter(ls => ls.status === 'CRITICAL');
      criticalLow.forEach((ls, idx) => {
        alerts.push({
          id: `alert-lowstock-${ls.material_id}-${idx}`,
          alert_type: 'CRITICAL_STOCK',
          severity: 'CRITICAL',
          material: ls.material_name,
          rack: 'Assigned Rack',
          timestamp: nowISO,
          recommendation: ls.recommendation,
          suggested_action: `Initiate purchase order for ${ls.recommended_reorder_qty} ${ls.unit} ${ls.suggested_timeframe}.`,
          status: 'ACTIVE',
        });
      });
    } catch (err) {
      console.error('[SmartAlerts] Low stock synthesis error:', err);
    }

    // 3. Synthesize Module 5 (Dead Stock Intelligence)
    try {
      const deadStockReport = await deadStockIntelligence.analyzeAll();
      deadStockReport.dead_stock_materials.forEach((ds, idx) => {
        alerts.push({
          id: `alert-deadstock-${ds.material_id}-${idx}`,
          alert_type: 'DEAD_STOCK',
          severity: 'WARNING',
          material: ds.material_name,
          rack: ds.rack_location,
          timestamp: nowISO,
          recommendation: ds.recommended_action,
          suggested_action: 'Schedule physical audit and consider relocating to long-term storage.',
          status: 'ACTIVE',
        });
      });
    } catch (err) {
      console.error('[SmartAlerts] Dead stock synthesis error:', err);
    }

    // 4. Synthesize Module 4 (High Consumption Spikes)
    try {
      const consumptionReport = await consumptionIntelligence.analyzeAll();
      const highConsumptionMats = consumptionReport.materials.filter(m => m.trend === 'Increasing' && m.trend_percentage_change > 20);
      highConsumptionMats.forEach((hc, idx) => {
        alerts.push({
          id: `alert-highconsumption-${hc.material_id}-${idx}`,
          alert_type: 'HIGH_CONSUMPTION',
          severity: 'WARNING',
          material: hc.material_name,
          rack: 'Multiple Slots',
          timestamp: nowISO,
          recommendation: `Consumption spike of +${hc.trend_percentage_change}% detected over recent 7 days (${hc.recent_7d_consumed} ${hc.unit} consumed).`,
          suggested_action: 'Review production line schedule & verify stock depletion rate.',
          status: 'ACTIVE',
        });
      });
    } catch (err) {
      console.error('[SmartAlerts] High consumption synthesis error:', err);
    }

    // 5. Synthesize Module 6 (Rack Capacity Warnings)
    try {
      const rackOptReport = await rackOptimizationIntelligence.analyzeAll();
      const capacityOpts = rackOptReport.optimizations.filter(o => o.optimization_type === 'NEAR_FULL_CAPACITY');
      capacityOpts.forEach((rc, idx) => {
        alerts.push({
          id: `alert-rackcap-${rc.current_rack}-${idx}`,
          alert_type: 'RACK_CAPACITY',
          severity: rc.priority === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          material: rc.material_name || 'Rack Material',
          rack: rc.current_rack,
          timestamp: nowISO,
          recommendation: rc.suggestion,
          suggested_action: `Relocate stock to Rack ${rc.suggested_rack || 'A3'} to restore safety headroom.`,
          status: 'ACTIVE',
        });
      });
    } catch (err) {
      console.error('[SmartAlerts] Rack capacity synthesis error:', err);
    }

    // 6. Provide System SUCCESS Notifications if no critical stock/rack alerts exist
    const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
    const warningCount = alerts.filter(a => a.severity === 'WARNING').length;

    if (criticalCount === 0) {
      alerts.push({
        id: `alert-success-sys-1-${Date.now()}`,
        alert_type: 'SYNC_FAILURE',
        severity: 'SUCCESS',
        material: 'All Materials',
        rack: 'All Racks',
        timestamp: nowISO,
        recommendation: 'Warehouse stock sync & rack telemetry operating normally. Zero critical stockouts.',
        suggested_action: 'No manual intervention required.',
        status: 'RESOLVED',
      });
    }

    const successCount = alerts.filter(a => a.severity === 'SUCCESS').length;

    return {
      alerts,
      summary: {
        total_alerts: alerts.length,
        critical_count: criticalCount,
        warning_count: warningCount,
        success_count: successCount,
      }
    };
  }
}

export const smartAlertIntelligence = new SmartAlertIntelligenceEngine();
export default smartAlertIntelligence;
