import db from '../config/db.js';

/**
 * Locate materials by name, QR code (barcode), or batch number
 * GET /api/material-locator?search=value
 */
export const locateMaterials = async (req, res, next) => {
  try {
    const { search } = req.query;
    
    // Construct search pattern (default to '%' if empty to return all mapped materials)
    const searchPattern = search ? `%${search.trim()}%` : '%';

    console.log(`[API Call] GET /api/material-locator with search term: "${search || ''}"`);

    // Query MySQL database for matching materials placed in racks
    const [results] = await db.query(`
      SELECT 
        m.material_name,
        q.rack_code,
        q.units AS quantity,
        m.quantity AS weight,
        q.scanned_at AS last_scan_time,
        m.barcode,
        m.batch_number
      FROM materials m
      JOIN qr_codes q ON m.barcode = q.barcode_id
      WHERE q.status = 'used'
        AND (
          m.material_name LIKE ? 
          OR m.barcode LIKE ? 
          OR m.batch_number LIKE ?
        )
      ORDER BY q.rack_code ASC
    `, [searchPattern, searchPattern, searchPattern]);

    // Format fields (convert decimals to numbers, format dates, and query movement history)
    const formattedResults = [];
    for (const row of results) {
      const [history] = await db.query(`
        SELECT 
          id,
          action,
          rack_code,
          remarks,
          created_at
        FROM qr_history
        WHERE barcode_id = ? OR material_name = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [row.barcode, row.material_name]);

      formattedResults.push({
        material_name: row.material_name,
        rack_code: row.rack_code,
        quantity: parseFloat(row.quantity) || 0,
        weight: parseFloat(row.weight) || 0,
        last_scan_time: row.last_scan_time,
        barcode: row.barcode,
        batch_number: row.batch_number,
        movement_history: history.map(h => ({
          id: h.id,
          action: h.action,
          rack_code: h.rack_code,
          remarks: h.remarks,
          timestamp: h.created_at
        }))
      });
    }

    const responseBody = {
      success: true,
      results: formattedResults.length,
      data: formattedResults
    };

    // Log response before sending
    console.log(`[API Success] GET /api/material-locator returned ${formattedResults.length} matching rows.`);
    console.log('[API Response Payload]:', JSON.stringify(responseBody));

    res.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
};
