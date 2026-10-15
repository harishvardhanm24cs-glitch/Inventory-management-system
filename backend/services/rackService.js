

import db from '../config/db.js';

/**
 * Fetch all materials assigned to a specific rack.
 *
 * Primary strategy:
 *   rack_inventory ri  → proves the rack exists + gives occupancy stats
 *   qr_codes q         → gives the actual material entries stored in the rack
 *
 * This avoids the `racks r` alias and the Cartesian product caused by
 * joining materials on material_name across multiple rows.
 *
 * @param {string} rackCode  - e.g. "A1", "B2", "C3"
 * @returns {{ exists: boolean, rack: object|null, materials: array }}
 */
export const getRackMaterials = async (rackCode) => {

  
  
  
  
  
  
  
  
  let rackRow = null;
  try {
    const [rackRows] = await db.query(
      `SELECT
         ri.rack_code,
         ri.max_capacity,
         ri.current_capacity,
         ri.occupancy_percentage,
         ri.created_at            AS inventory_created_at,
         ri.updated_at            AS last_updated,
         rk.material_name,
         rk.status,
         rk.status_color
       FROM rack_inventory ri
       LEFT JOIN racks rk
         ON rk.rack_code = ri.rack_code
       WHERE ri.rack_code = ?`,
      [rackCode]
    );

    if (rackRows.length === 0) {
      return { exists: false, rack: null, materials: [] };
    }

    rackRow = rackRows[0];
  } catch (err) {
    console.error(`[rackService] Query 1 failed for rack=${rackCode}:`, err.message);
    throw err;
  }

  
  
  
  
  
  
  
  
  
  
  
  
  let materials = [];
  try {
    const [rows] = await db.query(
      `SELECT
         ri.rack_code,
         ri.updated_at            AS last_updated,
         q.barcode_id             AS qr_code,
         q.material_name,
         q.quantity,
         q.units,
         q.status,
         q.scanned_at             AS last_scan_time,
         q.created_at,
         NULL                     AS weight
       FROM rack_inventory ri
       LEFT JOIN qr_codes q
         ON q.rack_code = ri.rack_code
       WHERE ri.rack_code = ?
       ORDER BY q.material_name ASC, q.created_at DESC`,
      [rackCode]
    );

    
    
    materials = rows.filter(row => row.material_name !== null);
  } catch (err) {
    console.error(`[rackService] Query 2 failed for rack=${rackCode}:`, err.message);
    throw err;
  }

  return {
    exists: true,
    rack: rackRow,
    materials
  };
};
