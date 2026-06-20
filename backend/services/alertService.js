import db from '../config/db.js';
import { sendEmail } from './emailService.js';
import { logAudit } from '../utils/auditLogger.js';

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

    // 2. If quantity falls below or equal to threshold
    if (qty <= limit) {
      // Check if there is already an active alert
      const [existingAlerts] = await conn.query(
        "SELECT id FROM alerts WHERE material_id = ? AND message LIKE 'Low Stock Warning%' AND alert_status = 'active'",
        [materialId]
      );

      if (existingAlerts.length === 0) {
        const message = `Low Stock Warning: '${material_name}' has ${qty} ${unit} remaining (Threshold: ${limit} ${unit})`;
        
        await conn.query(
          "INSERT INTO alerts (material_id, message, alert_status) VALUES (?, ?, 'active')",
          [materialId, message]
        );
        console.log(`[alertService] Created active low stock alert for material: ${material_name}`);

        // Log threshold alert
        await logAudit({
          action_type: 'Threshold Alert',
          material_name: material_name,
          user_name: 'System',
          action_details: message
        });

        // Send email notification
        const recipient = process.env.EMAIL_USER || 'manager@gmail.com';
        const subject = `LOW STOCK ALERT - ${material_name}`;
        sendEmail(recipient, subject, message).then(result => {
          if (!result.success) {
            console.error('[alertService] Low Stock email notification failed:', result.error);
          } else {
            console.log('[alertService] Low Stock email notification sent:', result.messageId);
            logAudit({
              action_type: 'Email Alert',
              material_name: material_name,
              user_name: 'System',
              action_details: `Email sent to ${recipient} (Subject: ${subject})`
            });
          }
        }).catch(emailErr => {
          console.error('[alertService] Low Stock email notification uncaught failure:', emailErr.message);
        });

        return { alertGenerated: true, message };
      } else {
        return { alertGenerated: true, message: `Low Stock Warning: '${material_name}' has ${qty} ${unit} remaining (Threshold: ${limit} ${unit})` };
      }
    } else {
      // Quantity is strictly above threshold, resolve any active alerts
      const [activeAlerts] = await conn.query(
        "SELECT id FROM alerts WHERE material_id = ? AND message LIKE 'Low Stock Warning%' AND alert_status = 'active'",
        [materialId]
      );

      if (activeAlerts.length > 0) {
        await conn.query(
          "UPDATE alerts SET alert_status = 'resolved' WHERE material_id = ? AND message LIKE 'Low Stock Warning%' AND alert_status = 'active'",
          [materialId]
        );
        console.log(`[alertService] Resolved active low stock alerts for material: ${material_name}`);
        return { alertResolved: true };
      }
    }
    return null;
  } catch (error) {
    console.error('[alertService] Error in processThresholdCheck:', error.message);
    throw error;
  }
};

/**
 * Checks a rack's occupancy and processes occupancy alerts.
 * @param {object} connection - The database connection (optional)
 * @param {string} rackCode - Code of the rack to check
 */
export const processRackOccupancyCheck = async (connection, rackCode) => {
  const conn = connection || db;
  try {
    // 1. Fetch rack quantity and max capacity
    const [racks] = await conn.query(
      'SELECT r.rack_code, r.material_name, r.quantity, r.max_capacity, ri.occupancy_percentage FROM racks r LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code WHERE r.rack_code = ?',
      [rackCode]
    );

    if (racks.length === 0) {
      console.warn(`[alertService] Rack not found for code ${rackCode}`);
      return null;
    }

    const rack = racks[0];
    const qty = parseFloat(rack.quantity) || 0;
    const maxCap = parseFloat(rack.max_capacity) || 100;
    const occupancy = rack.occupancy_percentage !== undefined && rack.occupancy_percentage !== null
      ? parseFloat(rack.occupancy_percentage)
      : (maxCap > 0 ? (qty / maxCap) * 100 : 0);

    // Get material_id of the material on the rack (if any)
    let materialId = null;
    if (rack.material_name) {
      const [materials] = await conn.query(
        'SELECT id FROM materials WHERE material_name = ? LIMIT 1',
        [rack.material_name]
      );
      if (materials.length > 0) {
        materialId = materials[0].id;
      }
    }

    // 2. If occupancy is strictly greater than 90%
    if (occupancy > 90) {
      // Check if there is already an active occupancy alert for this rack
      const [existingAlerts] = await conn.query(
        "SELECT id FROM alerts WHERE message LIKE ? AND alert_status = 'active'",
        [`%Rack Almost Full: Rack ${rackCode}%`]
      );

      if (existingAlerts.length === 0) {
        const message = `Rack Almost Full: Rack ${rackCode} occupancy is ${occupancy.toFixed(2)}% (${rack.material_name || 'No Material'})`;
        
        await conn.query(
          "INSERT INTO alerts (material_id, message, alert_status) VALUES (?, ?, 'active')",
          [materialId, message]
        );
        console.log(`[alertService] Created active occupancy alert for rack: ${rackCode}`);

        // Log threshold alert
        await logAudit({
          action_type: 'Threshold Alert',
          rack_code: rackCode,
          material_name: rack.material_name || null,
          user_name: 'System',
          action_details: message
        });

        // Send email notification
        const recipient = process.env.EMAIL_USER || 'manager@gmail.com';
        const subject = `RACK ALERT - Rack ${rackCode} Almost Full`;
        sendEmail(recipient, subject, message).then(result => {
          if (!result.success) {
            console.error('[alertService] Rack alert email notification failed:', result.error);
          } else {
            console.log('[alertService] Rack alert email notification sent:', result.messageId);
            logAudit({
              action_type: 'Email Alert',
              rack_code: rackCode,
              material_name: rack.material_name || null,
              user_name: 'System',
              action_details: `Email sent to ${recipient} (Subject: ${subject})`
            });
          }
        }).catch(emailErr => {
          console.error('[alertService] Rack alert email notification uncaught failure:', emailErr.message);
        });

        return { alertGenerated: true, message };
      }
    } else {
      // Occupancy is <= 90%, resolve any active alerts
      const [activeAlerts] = await conn.query(
        "SELECT id FROM alerts WHERE message LIKE ? AND alert_status = 'active'",
        [`%Rack Almost Full: Rack ${rackCode}%`]
      );

      if (activeAlerts.length > 0) {
        await conn.query(
          "UPDATE alerts SET alert_status = 'resolved' WHERE message LIKE ? AND alert_status = 'active'",
          [`%Rack Almost Full: Rack ${rackCode}%`]
        );
        console.log(`[alertService] Resolved active occupancy alerts for rack: ${rackCode}`);
        return { alertResolved: true };
      }
    }
    return null;
  } catch (error) {
    console.error('[alertService] Error in processRackOccupancyCheck:', error.message);
    throw error;
  }
};
