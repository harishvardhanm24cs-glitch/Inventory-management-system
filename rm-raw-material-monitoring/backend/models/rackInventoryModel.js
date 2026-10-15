const db = require('../config/db');

const RackInventory = {
  
  async getAll() {
    
    const [racks] = await db.query(`
      SELECT 
        id,
        rack_code,
        zone_name,
        current_capacity,
        max_capacity,
        occupancy_percentage,
        updated_at
      FROM rack_inventory
      ORDER BY zone_name, rack_code ASC
    `);

    
    const [materials] = await db.query(`
      SELECT
        id,
        rack_code,
        material_name,
        bucket_count,
        weight_kg,
        last_scan
      FROM rack_materials
      ORDER BY rack_code, id ASC
    `);

    
    const materialsMap = {};
    for (const m of materials) {
      if (!materialsMap[m.rack_code]) materialsMap[m.rack_code] = [];
      materialsMap[m.rack_code].push(m);
    }

    
    return racks.map(rack => {
      const rackMats = materialsMap[rack.rack_code] || [];
      
      let lastScan = null;
      for (const m of rackMats) {
        if (m.last_scan && (!lastScan || new Date(m.last_scan) > new Date(lastScan))) {
          lastScan = m.last_scan;
        }
      }
      return {
        ...rack,
        last_scan: lastScan,
        materials: rackMats
      };
    });
  },

  
  async getByCode(rackCode) {
    const [rows] = await db.query(
      `SELECT id, rack_code, zone_name, current_capacity, max_capacity, occupancy_percentage, updated_at
       FROM rack_inventory WHERE rack_code = ?`,
      [rackCode]
    );
    const rack = rows[0];
    if (!rack) return null;

    const [materials] = await db.query(
      `SELECT id, rack_code, material_name, bucket_count, weight_kg, last_scan
       FROM rack_materials WHERE rack_code = ? ORDER BY id ASC`,
      [rackCode]
    );

    let lastScan = null;
    for (const m of materials) {
      if (m.last_scan && (!lastScan || new Date(m.last_scan) > new Date(lastScan))) {
        lastScan = m.last_scan;
      }
    }

    return { ...rack, last_scan: lastScan, materials };
  },

  
  async upsert(rackCode, zoneName, currentCapacity, maxCapacity) {
    const occ = maxCapacity > 0
      ? parseFloat(((currentCapacity / maxCapacity) * 100).toFixed(2))
      : 0;

    const [result] = await db.query(
      `INSERT INTO rack_inventory (rack_code, zone_name, current_capacity, max_capacity, occupancy_percentage)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         zone_name            = VALUES(zone_name),
         current_capacity     = VALUES(current_capacity),
         max_capacity         = VALUES(max_capacity),
         occupancy_percentage = VALUES(occupancy_percentage)`,
      [rackCode, zoneName, currentCapacity, maxCapacity, occ]
    );
    return result;
  },

  
  async ensureDefaultRacks() {
    const defaultRacks = [
      { rack_code: 'A1', zone_name: 'RECEIVING ZONE', current_capacity: 0, max_capacity: 100 },
      { rack_code: 'A2', zone_name: 'RECEIVING ZONE', current_capacity: 0, max_capacity: 100 },
      { rack_code: 'A3', zone_name: 'RECEIVING ZONE', current_capacity: 0, max_capacity: 100 },
      { rack_code: 'A4', zone_name: 'RECEIVING ZONE', current_capacity: 0, max_capacity: 100 },
      { rack_code: 'B1', zone_name: 'STORAGE ZONE',   current_capacity: 0, max_capacity: 100 },
      { rack_code: 'B2', zone_name: 'STORAGE ZONE',   current_capacity: 0, max_capacity: 100 },
      { rack_code: 'B3', zone_name: 'STORAGE ZONE',   current_capacity: 0, max_capacity: 100 },
      { rack_code: 'B4', zone_name: 'STORAGE ZONE',   current_capacity: 0, max_capacity: 100 },
      { rack_code: 'C1', zone_name: 'DISPATCH ZONE',  current_capacity: 0, max_capacity: 100 },
      { rack_code: 'C2', zone_name: 'DISPATCH ZONE',  current_capacity: 0, max_capacity: 100 },
      { rack_code: 'C3', zone_name: 'DISPATCH ZONE',  current_capacity: 0, max_capacity: 100 },
      { rack_code: 'C4', zone_name: 'DISPATCH ZONE',  current_capacity: 0, max_capacity: 100 },
    ];

    for (const rack of defaultRacks) {
      await db.query(
        `INSERT IGNORE INTO rack_inventory (rack_code, zone_name, current_capacity, max_capacity, occupancy_percentage)
         VALUES (?, ?, ?, ?, 0)`,
        [rack.rack_code, rack.zone_name, rack.current_capacity, rack.max_capacity]
      );
    }
  }
};

module.exports = RackInventory;
