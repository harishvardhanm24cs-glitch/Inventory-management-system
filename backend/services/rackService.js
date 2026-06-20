/**
 * rackService.js
 * Service layer for Rack-related database operations.
 *
 * TABLE SCHEMA REFERENCE (from db.js):
 * ─────────────────────────────────────────────────────────────────
 * rack_inventory (alias: ri)
 *   id, rack_code, max_capacity, current_capacity,
 *   occupancy_percentage, created_at, updated_at
 *
 * qr_codes (alias: q)
 *   id, barcode_id, material_name, quantity, units,
 *   rack_code, qr_data, status, scanned_at, scanned_by, created_at
 *
 * materials (alias: m)  — used only as supplementary lookup
 *   id, barcode, material_name, quantity, threshold_limit,
 *   unit, batch_number, qr_data, created_at
 *
 * racks (alias: rk)  — used only to check assignment
 *   id, rack_code, material_name, batch_number, quantity,
 *   max_capacity, threshold_limit, status, status_color, created_at
 *   ── NO updated_at on racks ──
 * ─────────────────────────────────────────────────────────────────
 */

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

  // ── Query 1: Verify rack exists via rack_inventory ──────────────────────────
  // ri = rack_inventory  (this table HAS updated_at)
  // rk = racks           (supplementary — provides status, material_name)
  //
  // Columns selected only from tables that actually have them:
  //   ri.updated_at  ✅  rack_inventory HAS updated_at
  //   rk.status      ✅  racks HAS status
  //   rk.created_at  ✅  racks HAS created_at  (no updated_at on racks)
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

  // ── Query 2: Fetch materials via qr_codes ───────────────────────────────────
  // Uses rack_inventory ri as anchor, LEFT JOINs qr_codes q on rack_code.
  // No join on materials table — avoids the Cartesian product.
  //
  // Alias map:
  //   ri = rack_inventory
  //   q  = qr_codes
  //
  // All columns verified against actual DB schema:
  //   ri: rack_code, updated_at       ✅
  //   q:  barcode_id, material_name,
  //       quantity, status, scanned_at ✅
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

    // If the only row returned has q.material_name = NULL,
    // the rack exists but has no qr_codes assigned — return empty array
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
