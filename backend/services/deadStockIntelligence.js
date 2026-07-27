import db from '../config/db.js';

/**
 * deadStockIntelligence.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 5 – Dead Stock Intelligence Engine
 *
 * Reuses existing inventory, rack assignments, and movement transaction history
 * without creating duplicate database tables.
 */

class DeadStockIntelligenceEngine {
  async analyzeAll(config = {}) {
    const activeMaxDays = config.activeMaxDays !== undefined ? config.activeMaxDays : 15;
    const idleMaxDays = config.idleMaxDays !== undefined ? config.idleMaxDays : 45;

    // 1. Query Materials with associated Rack Code
    const [materials] = await db.query(`
      SELECT 
        m.id, 
        m.barcode, 
        m.material_name, 
        m.quantity, 
        m.unit,
        COALESCE(r.rack_code, 'Not Assigned') AS rack_code,
        m.created_at AS material_created_at
      FROM materials m
      LEFT JOIN racks r ON (r.material_name = m.material_name OR r.rack_code = m.barcode)
      ORDER BY m.material_name ASC
    `);

    // 2. Query Movement History across transactions, material_usage_history, and qr_history
    let allMovements = [];
    try {
      const [rows] = await db.query(`
        SELECT material_name, created_at FROM qr_history
        UNION ALL
        SELECT m.material_name, t.created_at FROM transactions t JOIN materials m ON t.material_id = m.id
        UNION ALL
        SELECT m.material_name, muh.created_at FROM material_usage_history muh JOIN materials m ON muh.material_id = m.id
        ORDER BY created_at DESC
      `);
      allMovements = rows;
    } catch {
      const [rows] = await db.query(`
        SELECT m.material_name, t.created_at FROM transactions t JOIN materials m ON t.material_id = m.id ORDER BY t.created_at DESC
      `);
      allMovements = rows;
    }

    const movementMap = {};
    (allMovements || []).forEach((mv) => {
      const nameKey = (mv.material_name || '').toLowerCase();
      if (!movementMap[nameKey]) {
        movementMap[nameKey] = new Date(mv.created_at);
      }
    });

    const now = new Date();
    let activeCount = 0;
    let idleCount = 0;
    let deadStockCount = 0;

    const deadStockList = [];
    const idleList = [];
    const activeList = [];

    const processedRecords = (materials || []).map((mat) => {
      const nameKey = (mat.material_name || '').toLowerCase();
      const lastTxDate = movementMap[nameKey] || (mat.material_created_at ? new Date(mat.material_created_at) : now);
      
      const diffMs = now.getTime() - lastTxDate.getTime();
      const days_since_last_movement = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const last_movement_date = lastTxDate.toISOString().split('T')[0];

      const qty = parseFloat(mat.quantity) || 0.00;
      const unitStr = mat.unit || 'KG';
      const rackLoc = mat.rack_code || 'Not Assigned';

      // Classification Logic
      let classification = 'Active';
      let suggested_action_type = 'NO_ACTION';
      let recommended_action = '';

      if (days_since_last_movement > idleMaxDays) {
        classification = 'Dead Stock';
        suggested_action_type = 'SCHEDULE_INSPECTION';
        recommended_action = `Schedule inspection for ${mat.material_name} stored in Rack ${rackLoc}. Inactive for ${days_since_last_movement} days.`;
        deadStockCount++;
      } else if (days_since_last_movement > activeMaxDays) {
        classification = 'Idle';
        suggested_action_type = 'CONSIDER_RELOCATION';
        recommended_action = `Review inventory & consider relocation for ${mat.material_name} in Rack ${rackLoc}. Inactive for ${days_since_last_movement} days.`;
        idleCount++;
      } else {
        classification = 'Active';
        suggested_action_type = 'REVIEW_INVENTORY';
        recommended_action = `Review inventory schedule for ${mat.material_name} in Rack ${rackLoc}. Active material flow recorded.`;
        activeCount++;
      }

      const record = {
        material_id: mat.id,
        material_name: mat.material_name,
        barcode: mat.barcode,
        unit: unitStr,
        total_quantity: qty,
        rack_location: rackLoc,
        last_movement_date,
        days_since_last_movement,
        classification,
        suggested_action_type,
        recommended_action,
      };

      if (classification === 'Dead Stock') deadStockList.push(record);
      else if (classification === 'Idle') idleList.push(record);
      else activeList.push(record);

      return record;
    });

    const totalMaterials = processedRecords.length;
    const dead_stock_percentage = totalMaterials > 0 ? parseFloat(((deadStockCount / totalMaterials) * 100).toFixed(1)) : 0;

    return {
      materials: processedRecords,
      dead_stock_materials: deadStockList,
      idle_materials: idleList,
      active_materials: activeList,
      summary: {
        total_materials: totalMaterials,
        active_count: activeCount,
        idle_count: idleCount,
        dead_stock_count: deadStockCount,
        dead_stock_percentage,
      },
      configurable_thresholds: {
        active_max_days: activeMaxDays,
        idle_max_days: idleMaxDays,
      }
    };
  }
}

export const deadStockIntelligence = new DeadStockIntelligenceEngine();
export default deadStockIntelligence;
