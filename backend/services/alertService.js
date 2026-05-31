import db from '../config/db.js';

/**
 * Checks the material stock against its threshold limit and processes alerts.
 * Can run inside an active database connection (for transaction safety) or falls back to pool.
 * @param {object} connection - The database connection (optional)
 * @param {number} materialId - ID of the material
 */
export const processThresholdCheck = async (connection, materialId) => {
  const conn = connection || db;
  try {
    // 1. Fetch current quantity, threshold_limit, and material details
    const [materials] = await conn.query(
      'SELECT id, material_name, quantity, threshold_limit, unit FROM materials WHERE id = ?',
      [materialId]
    );

    if (materials.length === 0) {
      console.warn(`[alertService] Material not found for ID ${materialId}`);
      return null;
    }

    const { material_name, quantity, threshold_limit, unit } = materials[0];
    const qty = parseFloat(quantity);
    const limit = parseFloat(threshold_limit);

    // 2. If quantity falls below or matches threshold
    if (qty <= limit) {
      // Check if there is already an active alert
      const [existingAlerts] = await conn.query(
        "SELECT id FROM alerts WHERE material_id = ? AND alert_status = 'active'",
        [materialId]
      );

      if (existingAlerts.length === 0) {
        const message = `Low stock alert: '${material_name}' has ${qty} ${unit} remaining (Threshold: ${limit} ${unit})`;
        
        await conn.query(
          "INSERT INTO alerts (material_id, message, alert_status) VALUES (?, ?, 'active')",
          [materialId, message]
        );
        console.log(`[alertService] Created active alert for material: ${material_name}`);
        return { alertGenerated: true, message };
      } else {
        // Return existing message warning
        return { alertGenerated: true, message: `Low stock alert: '${material_name}' has ${qty} ${unit} remaining (Threshold: ${limit} ${unit})` };
      }
    } else {
      // Quantity is above threshold, resolve any active alerts
      const [activeAlerts] = await conn.query(
        "SELECT id FROM alerts WHERE material_id = ? AND alert_status = 'active'",
        [materialId]
      );

      if (activeAlerts.length > 0) {
        await conn.query(
          "UPDATE alerts SET alert_status = 'resolved' WHERE material_id = ? AND alert_status = 'active'",
          [materialId]
        );
        console.log(`[alertService] Resolved active alerts for material: ${material_name}`);
        return { alertResolved: true };
      }
    }
    return null;
  } catch (error) {
    console.error('[alertService] Error in processThresholdCheck:', error.message);
    throw error;
  }
};
