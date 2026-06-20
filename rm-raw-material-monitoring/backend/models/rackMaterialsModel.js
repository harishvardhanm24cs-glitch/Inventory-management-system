const db = require('../config/db');

const RackMaterials = {
  /**
   * Get materials for a specific rack, joined with rack_inventory
   * Route: GET /api/racks/:rackCode/materials
   */
  async getByRackCode(rackCode) {
    // 1. Rack header from rack_inventory
    const [rackRows] = await db.query(
      `SELECT
         ri.rack_code,
         ri.zone_name,
         ri.current_capacity,
         ri.max_capacity,
         ri.occupancy_percentage,
         ri.updated_at AS last_updated
       FROM rack_inventory ri
       WHERE ri.rack_code = ?`,
      [rackCode]
    );

    if (!rackRows.length) return null;
    const rack = rackRows[0];

    const currentCap = parseFloat(rack.current_capacity) || 0;
    const maxCap = parseFloat(rack.max_capacity) || 100;
    const occ = parseFloat(rack.occupancy_percentage) || 0;

    // 1 & 2. Validation: Occupancy capacity and Negative inventory check
    if (currentCap > maxCap) {
        console.error(`[VALIDATION ERROR] Rack ${rackCode} occupancy ${currentCap} KG exceeds max capacity ${maxCap} KG!`);
    }
    if (currentCap < 0 || maxCap < 0 || occ < 0) {
        console.error(`[VALIDATION ERROR] Rack ${rackCode} has negative capacity stats! Current: ${currentCap}, Max: ${maxCap}, Occ: ${occ}%`);
    }

    // 2. Materials for this rack from materials table
    const [matRows] = await db.query(
      `SELECT
         m.id,
         m.material_name,
         m.quantity,
         COALESCE(m.weight, m.quantity) AS weight,
         m.unit,
         m.batch_number,
         m.barcode,
         m.threshold_limit
       FROM materials m
       WHERE m.rack_code = ?
       ORDER BY m.material_name ASC`,
      [rackCode]
    );

    // 3. Validation: Merge duplicate entries & prevent negative inventory
    const mergedMap = new Map();
    for (const row of matRows) {
        const name = row.material_name;
        const quantity = parseFloat(row.quantity) || 0;
        const weight = parseFloat(row.weight) || 0;
        const threshold = parseFloat(row.threshold_limit) || 0;

        if (quantity < 0 || weight < 0) {
            console.error(`[VALIDATION ERROR] Negative inventory not allowed for material '${name}' in Rack '${rackCode}': Quantity=${quantity}, Weight=${weight}`);
            continue; // Skip negative entries
        }

        if (mergedMap.has(name)) {
            console.log(`[VALIDATION MERGE] Duplicate material entry '${name}' in Rack '${rackCode}' merged automatically.`);
            const existing = mergedMap.get(name);
            existing.quantity += quantity;
            existing.weight += weight;
            existing.threshold_limit = Math.max(existing.threshold_limit, threshold);
        } else {
            mergedMap.set(name, {
                id: row.id,
                material_name: name,
                quantity,
                weight,
                threshold_limit: threshold,
                unit: row.unit || 'KG',
                batch_number: row.batch_number || null,
                barcode: row.barcode || null
            });
        }
    }

    const finalMaterials = Array.from(mergedMap.values());
    const totalMaterials = finalMaterials.length;
    const totalQuantity  = finalMaterials.reduce((s, m) => s + m.quantity, 0);
    const totalWeight    = finalMaterials.reduce((s, m) => s + m.weight, 0);

    return {
      rack_code:            rack.rack_code,
      zone_name:            rack.zone_name,
      current_capacity:     currentCap,
      max_capacity:         maxCap,
      occupancy_percentage: occ,
      last_updated:         rack.last_updated,
      materials:            finalMaterials,
      summary: {
        total_materials: totalMaterials,
        total_quantity:  parseFloat(totalQuantity.toFixed(2)),
        total_weight:    parseFloat(totalWeight.toFixed(2)),
      }
    };
  },

  /**
   * Get materials for ALL racks at once (used by the floor map overview)
   */
  async getAllRacksSummary() {
    const [rows] = await db.query(`
      SELECT
        ri.rack_code,
        ri.zone_name,
        ri.occupancy_percentage,
        COUNT(m.id)             AS total_materials,
        COALESCE(SUM(m.quantity), 0) AS total_quantity,
        COALESCE(SUM(COALESCE(m.weight, m.quantity)), 0) AS total_weight
      FROM rack_inventory ri
      LEFT JOIN materials m ON m.rack_code = ri.rack_code
      GROUP BY ri.rack_code, ri.zone_name, ri.occupancy_percentage
      ORDER BY ri.zone_name, ri.rack_code ASC
    `);
    return rows;
  }
};

module.exports = RackMaterials;
