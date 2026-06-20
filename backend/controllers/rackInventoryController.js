import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * Retrieve all rack inventories directly from the rack_inventory table
 * GET /api/rack-inventory
 */
export const getRackInventory = async (req, res, next) => {
  try {
    // 1. Audit GET /api/rack-inventory and query directly from rack_inventory table
    const [racks] = await db.query(`
      SELECT 
        rack_code, 
        current_capacity, 
        max_capacity, 
        occupancy_percentage,
        zone_name,
        updated_at
      FROM rack_inventory
      ORDER BY rack_code ASC
    `);

    // 2. Fetch all scanned materials that are placed in racks to construct nested materials for frontend compatibility
    const [materialsInRacks] = await db.query(`
      SELECT 
        m.id,
        m.barcode,
        m.material_name,
        m.quantity AS weight,
        m.unit,
        m.batch_number,
        m.threshold_limit,
        q.rack_code,
        q.units AS quantity,
        q.scanned_at AS last_scan_time
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
        weight: parseFloat(m.weight) || 0,
        unit: m.unit,
        batch_number: m.batch_number,
        threshold_limit: parseFloat(m.threshold_limit) || 0,
        last_scan_time: m.last_scan_time
      });
    });

    // 3. Construct mapped racks list with nested materials and calculated status color
    const mappedRacks = racks.map(rack => {
      const qty = parseFloat(rack.current_capacity) || 0;
      const maxCap = parseFloat(rack.max_capacity); // No hardcoded fallback
      const occPercent = parseFloat(rack.occupancy_percentage) || 0;
      
      // Determine color code dynamically
      let color_status = 'GRAY';
      if (occPercent === 0) {
        color_status = 'GRAY';
      } else if (occPercent > 80) {
        color_status = 'RED';
      } else if (occPercent > 40) {
        color_status = 'YELLOW';
      } else {
        color_status = 'GREEN';
      }

      const rackMaterials = materialsByRack[rack.rack_code] || [];

      return {
        rack_code: rack.rack_code,
        zone_name: rack.zone_name,
        current_capacity: qty,
        max_capacity: maxCap,
        occupancy_percentage: occPercent,
        color_status: color_status,
        materials: rackMaterials,
        last_updated: rack.updated_at
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

    const responseBody = {
      success: true,
      data: mappedRacks,
      highTrafficZone
    };

    // 5. Log API response
    console.log('[API GET /api/rack-inventory Success] Status: 200, Rows returned:', mappedRacks.length);
    console.log('[API Response Payload]:', JSON.stringify(responseBody));

    res.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
};

/**
 * Update rack capacity
 * PUT /api/rack-inventory/:rackCode
 */
export const updateRackInventory = async (req, res, next) => {
  try {
    const { rackCode } = req.params;
    const { current_capacity, max_capacity } = req.body;

    const [existing] = await db.query(
      'SELECT * FROM rack_inventory WHERE rack_code = ?',
      [rackCode]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Rack '${rackCode}' not found in inventory`
      });
    }

    const rack = existing[0];
    const newCurrent = current_capacity !== undefined ? parseFloat(current_capacity) : parseFloat(rack.current_capacity);
    const newMax = max_capacity !== undefined ? parseFloat(max_capacity) : parseFloat(rack.max_capacity);

    if (isNaN(newCurrent) || newCurrent < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'current_capacity must be a positive number'
      });
    }

    if (isNaN(newMax) || newMax < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'max_capacity must be a positive number'
      });
    }

    const newOcc = newMax > 0 ? parseFloat(((newCurrent / newMax) * 100).toFixed(2)) : 0.00;

    await db.query(
      'UPDATE rack_inventory SET current_capacity = ?, max_capacity = ?, occupancy_percentage = ? WHERE rack_code = ?',
      [newCurrent, newMax, newOcc, rackCode]
    );

    // Also sync back to racks table if present to keep consistency
    await db.query(
      'UPDATE racks SET quantity = ?, max_capacity = ? WHERE rack_code = ?',
      [newCurrent, newMax, rackCode]
    );

    const responseBody = {
      success: true,
      message: `Rack ${rackCode} inventory updated successfully`,
      data: {
        rack_code: rackCode,
        current_capacity: newCurrent,
        max_capacity: newMax,
        occupancy_percentage: newOcc
      }
    };

    console.log('[API PUT /api/rack-inventory/:rackCode Success] Status: 200');
    console.log('[API Response Payload]:', JSON.stringify(responseBody));

    res.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
};
