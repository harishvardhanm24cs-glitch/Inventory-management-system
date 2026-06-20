import db from '../config/db.js';

/**
 * Retrieve Digital Twin warehouse layout with rack occupancies and physical material inventory.
 * GET /api/digital-twin
 */
export const getDigitalTwinData = async (req, res, next) => {
  try {
    // 1. Fetch all racks left-joining rack_inventory for occupancy
    const [racks] = await db.query(`
      SELECT 
        r.rack_code, 
        r.rack_code AS rack_name, 
        r.quantity AS current_capacity, 
        COALESCE(ri.max_capacity, r.max_capacity) AS max_capacity, 
        COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage, 
        r.status_color,
        ri.updated_at AS last_scan_time
      FROM racks r
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
      ORDER BY r.rack_code ASC
    `);

    // 2. Fetch all scanned materials that are placed in racks
    const [materialsInRacks] = await db.query(`
      SELECT 
        m.id,
        m.barcode,
        m.material_name,
        m.quantity,
        m.unit,
        m.batch_number,
        m.threshold_limit,
        q.rack_code
      FROM materials m
      JOIN qr_codes q ON m.barcode = q.barcode_id
      WHERE q.status = 'used'
    `);

    // Group materials by rack_code
    const materialsByRack = {};
    materialsInRacks.forEach(m => {
      if (!materialsByRack[m.rack_code]) {
        materialsByRack[m.rack_code] = [];
      }
      materialsByRack[m.rack_code].push({
        id: m.id,
        barcode: m.barcode,
        material_name: m.material_name,
        quantity: parseFloat(m.quantity) || 0,
        unit: m.unit,
        batch_number: m.batch_number,
        threshold_limit: parseFloat(m.threshold_limit) || 0
      });
    });

    // 3. Construct mapped racks list with nested materials and calculated status color
    const mappedRacks = racks.map(rack => {
      const qty = parseFloat(rack.current_capacity) || 0;
      const maxCap = parseFloat(rack.max_capacity);
      
      // Calculate occupancy percentage
      const occPercent = rack.occupancy_percentage !== undefined && rack.occupancy_percentage !== null
        ? parseFloat(rack.occupancy_percentage)
        : (maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00);

      // Determine color code:
      // 0% occupancy -> GRAY (empty rack)
      // 0-40% -> GREEN
      // 41-80% -> YELLOW
      // 81-100% -> RED
      let statusColor = 'GREEN';
      if (occPercent === 0) {
        statusColor = 'GRAY';
      } else if (occPercent > 80) {
        statusColor = 'RED';
      } else if (occPercent > 40) {
        statusColor = 'YELLOW';
      } else {
        statusColor = 'GREEN';
      }

      const rackMaterials = materialsByRack[rack.rack_code] || [];

      return {
        rack_code: rack.rack_code,
        rack_name: rack.rack_name,
        current_capacity: qty,
        max_capacity: maxCap,
        occupancy_percentage: occPercent,
        status_color: statusColor,
        material_count: rackMaterials.length,
        materials: rackMaterials,
        last_scan_time: rack.last_scan_time
      };
    });

    // 4. Fetch highest traffic rack today based on qr_history movements count
    let highTrafficZone = null;
    try {
      const [trafficResult] = await db.query(`
        SELECT rack_code, COUNT(*) AS count
        FROM qr_history
        WHERE DATE(created_at) = CURDATE()
          AND rack_code IS NOT NULL
          AND rack_code != ''
          AND rack_code != 'Not Assigned'
          AND rack_code != 'Unassigned'
        GROUP BY rack_code
        ORDER BY count DESC
        LIMIT 1
      `);
      if (trafficResult.length > 0) {
        highTrafficZone = {
          rack_code: trafficResult[0].rack_code,
          count: parseInt(trafficResult[0].count, 10)
        };
      } else {
        // Fallback: get the overall highest active rack across all time to ensure visual demo works
        const [fallbackResult] = await db.query(`
          SELECT rack_code, COUNT(*) AS count
          FROM qr_history
          WHERE rack_code IS NOT NULL
            AND rack_code != ''
            AND rack_code != 'Not Assigned'
            AND rack_code != 'Unassigned'
          GROUP BY rack_code
          ORDER BY count DESC
          LIMIT 1
        `);
        if (fallbackResult.length > 0) {
          highTrafficZone = {
            rack_code: fallbackResult[0].rack_code,
            count: parseInt(fallbackResult[0].count, 10)
          };
        }
      }
    } catch (err) {
      console.error('Error fetching high traffic zone:', err.message);
    }

    res.status(200).json({
      status: 'success',
      results: mappedRacks.length,
      data: mappedRacks,
      highTrafficZone
    });
  } catch (error) {
    next(error);
  }
};
