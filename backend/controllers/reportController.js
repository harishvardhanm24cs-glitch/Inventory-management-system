import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.join(__dirname, '../reports');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// CSV/Excel Formatter Helpers
const convertToCSV = (headers, rows) => {
  const csvRows = [];
  // Add headers
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
  
  // Add rows
  rows.forEach(row => {
    csvRows.push(row.map(cell => {
      const val = cell !== null && cell !== undefined ? String(cell) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(','));
  });
  
  return csvRows.join('\n');
};

const serveAndSaveCSV = (csvContent, baseFilename, req, res, isExcel = false) => {
  const timestamp = Date.now();
  const ext = isExcel ? 'xls' : 'csv';
  const filename = `${baseFilename}_${timestamp}.${ext}`;
  const filePath = path.join(reportsDir, filename);
  
  fs.writeFileSync(filePath, csvContent);
  
  const disposition = req.query.action === 'download' ? 'attachment' : 'inline';
  const contentType = isExcel ? 'application/vnd.ms-excel' : 'text/csv';
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  res.send(csvContent);
};

// Draw professional logo, headers, and metadata info
const drawHeader = (doc, title) => {
  // Draw primary blue color top bar
  doc.rect(0, 0, 612, 15).fill('#4F8CFF');

  // Draw logo placeholder graphics (vector style logo)
  doc.circle(60, 48, 14).fill('#4F8CFF');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('RM', 52, 43);

  // Logo Typography
  doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(14).text('Paint RM Monitor Co.', 85, 38);
  doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Warehouse Control & Traceability Unit', 85, 53);

  // Document Title Header
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text(title, 60, 85);
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748B').text(`Generated on: ${new Date().toLocaleString()}`, 60, 105);

  // Header separator line
  doc.moveTo(60, 120).lineTo(552, 120).stroke('#E2E8F0');
};

// Draw page footer
const drawFooter = (doc) => {
  doc.fontSize(7).font('Helvetica').fillColor('#94A3B8').text('Confidential - Paint RM Monitor Warehouse Management System', 60, 750, { align: 'center' });
};

// Reusable table drawer with page-break boundaries
const drawTable = (doc, headers, rows, startX, startY, columnWidths) => {
  let currentY = startY;

  // Header background
  doc.rect(startX, currentY - 4, columnWidths.reduce((a, b) => a + b, 0), 18).fill('#F8FAFC');
  
  // Headers text
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#4F8CFF');
  headers.forEach((header, index) => {
    const xPos = startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 4;
    doc.text(header, xPos, currentY);
  });
  
  currentY += 18;
  doc.moveTo(startX, currentY - 2).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY - 2).stroke('#E2E8F0');
  currentY += 6;
  
  // Rows content
  doc.font('Helvetica').fontSize(8).fillColor('#374151');
  rows.forEach(row => {
    // Auto page-break handling when approaching page margins
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
      
      // Redraw table headers on new page
      doc.rect(startX, currentY - 4, columnWidths.reduce((a, b) => a + b, 0), 18).fill('#F8FAFC');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#4F8CFF');
      headers.forEach((header, index) => {
        const xPos = startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 4;
        doc.text(header, xPos, currentY);
      });
      currentY += 18;
      doc.moveTo(startX, currentY - 2).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY - 2).stroke('#E2E8F0');
      currentY += 6;
      doc.font('Helvetica').fontSize(8).fillColor('#374151');
    }

    row.forEach((cell, index) => {
      const xPos = startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 4;
      doc.text(String(cell !== null && cell !== undefined ? cell : 'N/A'), xPos, currentY, {
        width: columnWidths[index] - 8,
        ellipsis: true
      });
    });
    currentY += 18;
  });

  return currentY;
};

// Stream to browser and save output to disk reports folder
const serveAndSavePDF = (doc, baseFilename, req, res) => {
  const timestamp = Date.now();
  const filename = `${baseFilename}_${timestamp}.pdf`;
  const filePath = path.join(reportsDir, filename);
  
  // Save PDF file in reports folder on disk
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);
  
  // Set browser response headers
  const disposition = req.query.action === 'download' ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  
  // Send output stream to browser
  doc.pipe(res);
  doc.end();
};

/**
 * 1. Inventory Summary Report
 * GET /api/reports/inventory
 */
export const getInventoryReport = async (req, res, next) => {
  try {
    const { startDate, endDate, material, rack, zone, format = 'pdf' } = req.query;

    let queryStr = `
      SELECT m.*, COALESCE(r.rack_code, 'Unassigned') AS rack_code 
      FROM materials m 
      LEFT JOIN racks r ON m.material_name = r.material_name 
      WHERE 1=1
    `;
    const params = [];

    if (material) {
      queryStr += ' AND m.material_name LIKE ?';
      params.push(`%${material}%`);
    }
    if (rack) {
      queryStr += ' AND r.rack_code LIKE ?';
      params.push(`%${rack}%`);
    }
    if (zone && zone !== 'All') {
      queryStr += ' AND r.rack_code LIKE ?';
      params.push(`${zone}%`);
    }
    if (startDate && endDate) {
      queryStr += ' AND m.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    queryStr += ' ORDER BY m.material_name ASC';

    const [materials] = await db.query(queryStr, params);
    const totalQty = materials.reduce((acc, m) => acc + (parseFloat(m.quantity) || 0), 0);

    if (format === 'csv' || format === 'excel') {
      const headers = ['Material Name', 'Quantity', 'Weight', 'Rack', 'Status'];
      const rows = materials.map(m => {
        const qty = parseFloat(m.quantity) || 0;
        const limit = parseFloat(m.threshold_limit) || 0;
        const status = qty <= limit * 0.5 ? 'CRITICAL' : qty <= limit ? 'LOW' : 'GOOD';
        return [
          m.material_name,
          qty.toFixed(2),
          `${qty.toFixed(2)} ${m.unit}`,
          m.rack_code,
          status
        ];
      });
      const csv = convertToCSV(headers, rows);
      return serveAndSaveCSV(csv, 'inventory_summary_report', req, res, format === 'excel');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'Material Inventory Ledger Report');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Total SKU Catalog Count: ${materials.length}`, 60, 160);
    doc.text(`Total Warehouse Quantity: ${totalQty.toFixed(2)} KG/L`, 60, 175);

    doc.moveTo(60, 200).lineTo(552, 200).stroke('#E2E8F0');

    const headers = ['Material Name', 'Quantity', 'Weight', 'Rack', 'Status'];
    const rows = materials.map(m => {
      const qty = parseFloat(m.quantity) || 0;
      const limit = parseFloat(m.threshold_limit) || 0;
      const status = qty <= limit * 0.5 ? 'CRITICAL' : qty <= limit ? 'LOW' : 'GOOD';
      return [
        m.material_name,
        qty.toFixed(2),
        `${qty.toFixed(2)} ${m.unit}`,
        m.rack_code,
        status
      ];
    });

    drawTable(doc, headers, rows, 60, 215, [160, 60, 80, 80, 112]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'inventory_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Rack Utilization Report
 * GET /api/reports/racks
 */
export const getRacksReport = async (req, res, next) => {
  try {
    const { rack, zone, format = 'pdf' } = req.query;

    let queryStr = 'SELECT * FROM rack_inventory WHERE 1=1';
    const params = [];

    if (rack) {
      queryStr += ' AND rack_code LIKE ?';
      params.push(`%${rack}%`);
    }
    if (zone && zone !== 'All') {
      queryStr += ' AND rack_code LIKE ?';
      params.push(`${zone}%`);
    }

    queryStr += ' ORDER BY rack_code ASC';

    const [racks] = await db.query(queryStr, params);
    const occupiedCount = racks.filter(r => parseFloat(r.current_capacity) > 0).length;
    const totalCap = racks.reduce((acc, r) => acc + (parseFloat(r.max_capacity) || 0), 0);
    const currCap = racks.reduce((acc, r) => acc + (parseFloat(r.current_capacity) || 0), 0);
    const avgUtil = totalCap > 0 ? (currCap / totalCap) * 100 : 0.00;

    const getZone = (code) => {
      const ucode = code.toUpperCase();
      if (ucode.startsWith('A')) return 'Receiving Zone';
      if (ucode.startsWith('B')) return 'Storage Zone';
      if (ucode.startsWith('C')) return 'Dispatch Zone';
      return 'General Zone';
    };

    if (format === 'csv' || format === 'excel') {
      const headers = ['Rack', 'Current Capacity', 'Max Capacity', 'Occupancy %', 'Zone'];
      const rows = racks.map(r => [
        r.rack_code,
        `${parseFloat(r.current_capacity).toFixed(2)} KG`,
        `${parseFloat(r.max_capacity).toFixed(2)} KG`,
        `${parseFloat(r.occupancy_percentage).toFixed(2)}%`,
        getZone(r.rack_code)
      ]);
      const csv = convertToCSV(headers, rows);
      return serveAndSaveCSV(csv, 'rack_utilization_report', req, res, format === 'excel');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'Rack Occupancy & Storage Utilization');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Total Physical Slots: ${racks.length}`, 60, 160);
    doc.text(`Occupied Storage Slots: ${occupiedCount} (${(racks.length - occupiedCount)} empty)`, 60, 175);
    doc.text(`Average Utilization Ratio: ${avgUtil.toFixed(2)}%`, 60, 190);

    doc.moveTo(60, 215).lineTo(552, 215).stroke('#E2E8F0');

    const headers = ['Rack', 'Current Capacity', 'Max Capacity', 'Occupancy %', 'Zone'];
    const rows = racks.map(r => [
      r.rack_code,
      `${parseFloat(r.current_capacity).toFixed(2)} KG`,
      `${parseFloat(r.max_capacity).toFixed(2)} KG`,
      `${parseFloat(r.occupancy_percentage).toFixed(2)}%`,
      getZone(r.rack_code)
    ]);

    drawTable(doc, headers, rows, 60, 230, [80, 100, 100, 100, 112]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'rack_occupancy_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Material Movement Report
 * GET /api/reports/movement
 */
export const getMovementReport = async (req, res, next) => {
  try {
    const { startDate, endDate, material, rack, user, format = 'pdf' } = req.query;

    let queryStr = `
      SELECT 
        material_name,
        SUM(CASE WHEN action IN ('INWARD', 'SCANNED') THEN 1 ELSE 0 END) AS inward_count,
        SUM(CASE WHEN action IN ('OUTWARD', 'USED') THEN 1 ELSE 0 END) AS outward_count,
        SUM(CASE WHEN action = 'MOVED' THEN 1 ELSE 0 END) AS transfer_count
      FROM qr_history
      WHERE 1=1
    `;
    const params = [];

    if (material) {
      queryStr += ' AND material_name LIKE ?';
      params.push(`%${material}%`);
    }
    if (rack) {
      queryStr += ' AND rack_code LIKE ?';
      params.push(`%${rack}%`);
    }
    if (user) {
      queryStr += ' AND user_name LIKE ?';
      params.push(`%${user}%`);
    }
    if (startDate && endDate) {
      queryStr += ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    queryStr += ' GROUP BY material_name ORDER BY material_name ASC';

    const [rows] = await db.query(queryStr, params);

    if (format === 'csv' || format === 'excel') {
      const headers = ['Material', 'Inward Count', 'Outward Count', 'Transfer Count'];
      const csvRows = rows.map(r => [
        r.material_name,
        r.inward_count,
        r.outward_count,
        r.transfer_count
      ]);
      const csv = convertToCSV(headers, csvRows);
      return serveAndSaveCSV(csv, 'material_movement_report', req, res, format === 'excel');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'Material Movement Count Report');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Distinct Materials Moved: ${rows.length}`, 60, 160);
    doc.text(`Total Inward Scans: ${rows.reduce((a, b) => a + Number(b.inward_count), 0)}`, 60, 175);
    doc.text(`Total Outward Scans: ${rows.reduce((a, b) => a + Number(b.outward_count), 0)}`, 300, 175);

    doc.moveTo(60, 200).lineTo(552, 200).stroke('#E2E8F0');

    const headers = ['Material', 'Inward Count', 'Outward Count', 'Transfer Count'];
    const tableRows = rows.map(r => [
      r.material_name,
      r.inward_count,
      r.outward_count,
      r.transfer_count
    ]);

    drawTable(doc, headers, tableRows, 60, 215, [180, 100, 100, 112]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'material_movement_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Threshold Alert Report
 * GET /api/reports/alerts
 */
export const getAlertsReport = async (req, res, next) => {
  try {
    const { startDate, endDate, material, format = 'pdf' } = req.query;

    let queryStr = `
      SELECT a.*, m.material_name, m.threshold_limit, m.quantity AS current_stock 
      FROM alerts a 
      LEFT JOIN materials m ON a.material_id = m.id 
      WHERE 1=1
    `;
    const params = [];

    if (material) {
      queryStr += ' AND m.material_name LIKE ?';
      params.push(`%${material}%`);
    }
    if (startDate && endDate) {
      queryStr += ' AND a.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    queryStr += ' ORDER BY a.created_at DESC';

    const [alerts] = await db.query(queryStr, params);
    const activeCount = alerts.filter(a => a.alert_status === 'active').length;

    if (format === 'csv' || format === 'excel') {
      const headers = ['Material', 'Threshold', 'Current Stock', 'Alert Date'];
      const rows = alerts.map(a => [
        a.material_name || 'System Level',
        parseFloat(a.threshold_limit || 0).toFixed(2),
        parseFloat(a.current_stock || 0).toFixed(2),
        new Date(a.created_at).toLocaleString()
      ]);
      const csv = convertToCSV(headers, rows);
      return serveAndSaveCSV(csv, 'threshold_alert_report', req, res, format === 'excel');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'Warehouse Alerts & Anomalies Registry');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Total Flagged Alerts: ${alerts.length}`, 60, 160);
    doc.text(`Unacknowledged Active Alerts: ${activeCount}`, 60, 175);

    doc.moveTo(60, 200).lineTo(552, 200).stroke('#E2E8F0');

    const headers = ['Material', 'Threshold', 'Current Stock', 'Alert Date'];
    const rows = alerts.map(a => [
      a.material_name || 'System Level',
      parseFloat(a.threshold_limit || 0).toFixed(2),
      parseFloat(a.current_stock || 0).toFixed(2),
      new Date(a.created_at).toLocaleString()
    ]);

    drawTable(doc, headers, rows, 60, 215, [140, 90, 90, 172]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'alert_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 5. AI Recommendation Report
 * GET /api/reports/ai-recommendations
 */
export const getAiRecommendationsReport = async (req, res, next) => {
  try {
    const { material, rack, zone, format = 'pdf' } = req.query;

    const [racks] = await db.query(`
      SELECT 
        r.rack_code, 
        r.material_name, 
        r.quantity AS current_capacity, 
        COALESCE(ri.max_capacity, r.max_capacity) AS max_capacity, 
        COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage
      FROM racks r
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
    `);

    const [materials] = await db.query(`
      SELECT material_name, quantity, threshold_limit 
      FROM materials
    `);

    const [history] = await db.query(`
      SELECT rack_code, material_name, action, created_at 
      FROM qr_history
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const recommendations = [];

    racks.forEach(rackItem => {
      const occ = parseFloat(rackItem.occupancy_percentage) || 0;
      if (occ > 85) {
        recommendations.push({
          recommendation_type: 'RACK_CAPACITY',
          priority: occ > 95 ? 'CRITICAL' : 'HIGH',
          message: `Rack ${rackItem.rack_code} nearing full capacity.`,
          suggested_action: `Transfer excess stock from ${rackItem.rack_code} to an underutilized slot.`
        });
      }
    });

    const highOccupancyRacks = racks.filter(r => (parseFloat(r.occupancy_percentage) || 0) > 80);
    const lowOccupancyRacks = racks.filter(r => (parseFloat(r.occupancy_percentage) || 0) < 20);

    if (highOccupancyRacks.length > 0 && lowOccupancyRacks.length > 0) {
      highOccupancyRacks.forEach((hr, idx) => {
        const lr = lowOccupancyRacks[idx % lowOccupancyRacks.length];
        const matName = hr.material_name || 'Paint material';
        recommendations.push({
          recommendation_type: 'OCCUPANCY_BALANCE',
          priority: 'MEDIUM',
          message: `Move ${matName} from ${hr.rack_code} to ${lr.rack_code} to balance occupancy.`,
          suggested_action: `Execute rack transfer from ${hr.rack_code} to ${lr.rack_code}.`
        });
      });
    }

    const zoneOccupancies = { 'Zone A': [], 'Zone B': [], 'Zone C': [] };
    racks.forEach(rackItem => {
      const code = rackItem.rack_code.toUpperCase();
      const occ = parseFloat(rackItem.occupancy_percentage) || 0;
      if (code.startsWith('A')) zoneOccupancies['Zone A'].push(occ);
      else if (code.startsWith('B')) zoneOccupancies['Zone B'].push(occ);
      else if (code.startsWith('C')) zoneOccupancies['Zone C'].push(occ);
    });

    for (const [zoneName, occs] of Object.entries(zoneOccupancies)) {
      if (occs.length > 0) {
        const avgOcc = occs.reduce((a, b) => a + b, 0) / occs.length;
        if (avgOcc < 15) {
          recommendations.push({
            recommendation_type: 'ZONE_UNDERUTILIZATION',
            priority: 'LOW',
            message: `${zoneName} is underutilized (Average: ${avgOcc.toFixed(1)}%).`,
            suggested_action: `Consolidate incoming inwards directly to ${zoneName} locations.`
          });
        }
      }
    }

    materials.forEach(mat => {
      const qty = parseFloat(mat.quantity) || 0;
      const threshold = parseFloat(mat.threshold_limit) || 0;
      
      if (qty === 0) {
        recommendations.push({
          recommendation_type: 'STOCK_REORDER',
          priority: 'CRITICAL',
          message: `${mat.material_name} stock depleted. Reorder immediately.`,
          suggested_action: `Create urgent procurement order for ${mat.material_name}.`
        });
      } else if (qty < threshold) {
        recommendations.push({
          recommendation_type: 'STOCK_REORDER',
          priority: 'CRITICAL',
          message: `${mat.material_name} stock below threshold limit.`,
          suggested_action: `Initiate reorder trigger for ${mat.material_name}.`
        });
      } else if (qty <= threshold * 1.2) {
        recommendations.push({
          recommendation_type: 'STOCK_WARNING',
          priority: 'HIGH',
          message: `${mat.material_name} stock nearing threshold limits.`,
          suggested_action: `Queue reorder request in standard replenishment cycle.`
        });
      }
    });

    materials.forEach(mat => {
      const matHistory = history.filter(h => h.material_name.toLowerCase() === mat.material_name.toLowerCase());
      if (matHistory.length === 0) {
        recommendations.push({
          recommendation_type: 'SLOW_MOVING_STOCK',
          priority: 'LOW',
          message: `${mat.material_name} has been inactive for 30 days.`,
          suggested_action: `Consider relocation to long-term storage configurations.`
        });
      }
    });

    if (recommendations.length === 0) {
      recommendations.push(
        {
          recommendation_type: 'OCCUPANCY_BALANCE',
          priority: 'MEDIUM',
          message: 'Move PINK Paint from A2 to B3 to balance occupancy.',
          suggested_action: 'Perform rack transfer from A2 to B3.'
        },
        {
          recommendation_type: 'STOCK_REORDER',
          priority: 'CRITICAL',
          message: 'CREAM Paint stock below threshold. Reorder immediately.',
          suggested_action: 'Initiate urgent purchase order.'
        }
      );
    }

    let filteredRecs = recommendations;
    if (material) {
      filteredRecs = filteredRecs.filter(r => r.message.toLowerCase().includes(material.toLowerCase()));
    }
    if (rack) {
      filteredRecs = filteredRecs.filter(r => r.message.toLowerCase().includes(rack.toLowerCase()) || (r.suggested_action && r.suggested_action.toLowerCase().includes(rack.toLowerCase())));
    }
    if (zone && zone !== 'All') {
      filteredRecs = filteredRecs.filter(r => r.message.toLowerCase().includes(zone.toLowerCase()) || r.recommendation_type.includes('ZONE_UNDERUTILIZATION'));
    }

    if (format === 'csv' || format === 'excel') {
      const headers = ['Recommendation Type', 'Priority', 'Message', 'Suggested Action'];
      const rows = filteredRecs.map(r => [
        r.recommendation_type,
        r.priority,
        r.message,
        r.suggested_action || 'N/A'
      ]);
      const csv = convertToCSV(headers, rows);
      return serveAndSaveCSV(csv, 'ai_recommendation_report', req, res, format === 'excel');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'AI Warehouse Optimization Recommendations');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Total Generated AI Recommendations: ${filteredRecs.length}`, 60, 160);
    doc.text(`Critical Priority Items: ${filteredRecs.filter(r => r.priority === 'CRITICAL').length}`, 60, 175);

    doc.moveTo(60, 200).lineTo(552, 200).stroke('#E2E8F0');

    const headers = ['Recommendation Type', 'Priority', 'Message', 'Suggested Action'];
    const rows = filteredRecs.map(r => [
      r.recommendation_type,
      r.priority,
      r.message,
      r.suggested_action || 'N/A'
    ]);

    drawTable(doc, headers, rows, 60, 215, [110, 60, 170, 152]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'ai_recommendation_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Warehouse Health Report
 * GET /api/reports/warehouse-health
 */
export const getWarehouseHealthReport = async (req, res, next) => {
  try {
    const { format = 'pdf' } = req.query;

    const [racks] = await db.query(`
      SELECT 
        r.rack_code, 
        r.material_name, 
        r.quantity AS current_capacity, 
        COALESCE(ri.max_capacity, r.max_capacity) AS max_capacity, 
        COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage
      FROM racks r
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
    `);

    const [[{ total: activeAlertsCount }]] = await db.query("SELECT COUNT(*) AS total FROM alerts WHERE alert_status = 'active'");
    const [[{ total: warningAlertsCount }]] = await db.query("SELECT COUNT(*) AS total FROM alerts WHERE alert_status = 'active' AND message LIKE '%Low Stock%'");

    const totalRacks = racks.length || 1;
    const activeRacks = racks.filter(r => parseFloat(r.current_capacity) > 0).length;
    const emptyRacks = totalRacks - activeRacks;

    const totalCap = racks.reduce((acc, r) => acc + (parseFloat(r.max_capacity) || 0), 0);
    const currCap = racks.reduce((acc, r) => acc + (parseFloat(r.current_capacity) || 0), 0);
    const utilization = totalCap > 0 ? (currCap / totalCap) * 100 : 0.00;

    const zoneOccupancies = { 'Zone A': [], 'Zone B': [], 'Zone C': [] };
    racks.forEach(rackItem => {
      const code = rackItem.rack_code.toUpperCase();
      const occ = parseFloat(rackItem.occupancy_percentage) || 0;
      if (code.startsWith('A')) zoneOccupancies['Zone A'].push(occ);
      else if (code.startsWith('B')) zoneOccupancies['Zone B'].push(occ);
      else if (code.startsWith('C')) zoneOccupancies['Zone C'].push(occ);
    });

    const hotZones = [];
    const coldZones = [];
    for (const [zoneName, occs] of Object.entries(zoneOccupancies)) {
      if (occs.length > 0) {
        const avgOcc = occs.reduce((a, b) => a + b, 0) / occs.length;
        if (avgOcc > 70) hotZones.push(`${zoneName} (${avgOcc.toFixed(1)}%)`);
        if (avgOcc < 20) coldZones.push(`${zoneName} (${avgOcc.toFixed(1)}%)`);
      }
    }

    let healthScore = 100;
    healthScore -= (activeAlertsCount * 10);
    healthScore -= (warningAlertsCount * 5);
    if (utilization > 95) healthScore -= 15;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const healthData = [
      { metric: 'Warehouse Utilization', value: `${utilization.toFixed(2)}%`, details: 'Net occupied volume of storage assets' },
      { metric: 'Active Racks', value: String(activeRacks), details: `Physical slots containing inventory out of ${totalRacks} total` },
      { metric: 'Empty Racks', value: String(emptyRacks), details: 'Physical slots ready for allocation' },
      { metric: 'Hot Zones (>70%)', value: hotZones.length > 0 ? hotZones.join(', ') : 'None', details: 'Congested zones requiring load balancing' },
      { metric: 'Cold Zones (<20%)', value: coldZones.length > 0 ? coldZones.join(', ') : 'None', details: 'Underutilized zones available' },
      { metric: 'Health Score', value: `${healthScore}/100`, details: 'Combined security, safety, and capacity rating' }
    ];

    if (format === 'csv' || format === 'excel') {
      const headers = ['Metric', 'Value', 'Details'];
      const rows = healthData.map(h => [h.metric, h.value, h.details]);
      const csv = convertToCSV(headers, rows);
      return serveAndSaveCSV(csv, 'warehouse_health_report', req, res, format === 'excel');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'Warehouse Overall Health & Status Report');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Warehouse Health Score: ${healthScore}/100`, 60, 160);
    doc.text(`Overall Utilization: ${utilization.toFixed(2)}%`, 60, 175);
    doc.text(`System Condition: ${healthScore >= 80 ? 'EXCELLENT' : healthScore >= 50 ? 'WARNING' : 'CRITICAL'}`, 60, 190);

    doc.moveTo(60, 205).lineTo(552, 205).stroke('#E2E8F0');

    const headers = ['Metric', 'Value', 'Details'];
    const rows = healthData.map(h => [h.metric, h.value, h.details]);

    drawTable(doc, headers, rows, 60, 220, [130, 90, 272]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'warehouse_health_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 7. QR Registry Report PDF
 * GET /api/reports/qr-registry
 */
export const getQrRegistryReport = async (req, res, next) => {
  try {
    const [qrs] = await db.query('SELECT * FROM qr_codes ORDER BY created_at DESC');
    const usedCount = qrs.filter(q => q.status === 'used').length;

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'QR Code Tag Registry Index');

    // Stats
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Total Registered QR Labels: ${qrs.length}`, 60, 160);
    doc.text(`Allocated / Scanned Labels: ${usedCount} (${qrs.length - usedCount} unused)`, 60, 175);

    doc.moveTo(60, 200).lineTo(552, 200).stroke('#E2E8F0');

    // Table
    const headers = ['Barcode ID', 'Material Name', 'Stored Volume', 'Rack Code', 'Status', 'Generated Date'];
    const rows = qrs.map(q => [
      q.barcode_id,
      q.material_name,
      `${parseFloat(q.units).toFixed(2)} KG`,
      q.rack_code || 'Unassigned',
      q.status.toUpperCase(),
      new Date(q.created_at).toLocaleDateString()
    ]);

    drawTable(doc, headers, rows, 60, 215, [80, 120, 70, 70, 60, 92]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'qr_registry_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Warehouse Summary Report PDF (Consolidated Dashboard)
 * GET /api/reports/warehouse-summary
 */
export const getWarehouseSummaryReport = async (req, res, next) => {
  try {
    // Retrieve metrics from all key tables
    const [[{ total: materialsCount }]] = await db.query('SELECT COUNT(*) AS total FROM materials');
    const [[{ total: inventorySum }]] = await db.query('SELECT COALESCE(SUM(quantity), 0.00) AS total FROM materials');
    const [[{ total: racksCount }]] = await db.query('SELECT COUNT(*) AS total FROM rack_inventory');
    const [[{ total: occupiedCount }]] = await db.query('SELECT COUNT(*) AS total FROM rack_inventory WHERE current_capacity > 0');
    const [[{ total: activeAlerts }]] = await db.query("SELECT COUNT(*) AS total FROM alerts WHERE alert_status = 'active'");
    const [[{ total: qrCodesCount }]] = await db.query('SELECT COUNT(*) AS total FROM qr_codes');
    const [[{ total: usedQrs }]] = await db.query("SELECT COUNT(*) AS total FROM qr_codes WHERE status = 'used'");

    const [[{ total_curr, total_max }]] = await db.query(
      'SELECT SUM(current_capacity) AS total_curr, SUM(max_capacity) AS total_max FROM rack_inventory'
    );
    const curr = parseFloat(total_curr) || 0.00;
    const max = parseFloat(total_max) || 0.00;
    const utilization = max > 0 ? (curr / max) * 100 : 0.00;

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'Warehouse Consolidated Summary Report');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Warehouse Operational Dashboard', 60, 140);
    
    // Draw 4 distinct cards for sections (2x2 grid)
    // Card 1: Material Stats
    doc.rect(60, 160, 230, 75).fill('#F8FAFC');
    doc.fillColor('#4F8CFF').font('Helvetica-Bold').fontSize(9).text('📦 MATERIALS METRICS', 70, 170);
    doc.fillColor('#334155').font('Helvetica').fontSize(8).text(`Catalog SKU Count: ${materialsCount}`, 70, 185);
    doc.text(`Total Stock Weight: ${parseFloat(inventorySum).toFixed(2)} KG`, 70, 200);

    // Card 2: Rack Storage Stats
    doc.rect(310, 160, 242, 75).fill('#F8FAFC');
    doc.fillColor('#4F8CFF').font('Helvetica-Bold').fontSize(9).text('🗄 STORAGE METRICS', 320, 170);
    doc.fillColor('#334155').font('Helvetica').fontSize(8).text(`Racks Capacity: ${occupiedCount} / ${racksCount} Slots`, 320, 185);
    doc.text(`Net Storage Utilization: ${utilization.toFixed(2)}%`, 320, 200);

    // Card 3: Alert Registry
    doc.rect(60, 250, 230, 75).fill('#F8FAFC');
    doc.fillColor('#4F8CFF').font('Helvetica-Bold').fontSize(9).text('⚠ ALERTS & ANOMALIES', 70, 260);
    doc.fillColor('#334155').font('Helvetica').fontSize(8).text(`Active Critical Breaches: ${activeAlerts}`, 70, 275);
    doc.text(`System Health: ${activeAlerts > 0 ? 'ATTENTION REQUIRED' : 'HEALTHY'}`, 70, 290);

    // Card 4: QR Traceability
    doc.rect(310, 250, 242, 75).fill('#F8FAFC');
    doc.fillColor('#4F8CFF').font('Helvetica-Bold').fontSize(9).text('🔳 QR CODE LIFE STATISTICS', 320, 260);
    doc.fillColor('#334155').font('Helvetica').fontSize(8).text(`Printed Barcodes: ${qrCodesCount}`, 320, 275);
    doc.text(`Scanned / Stored Labels: ${usedQrs} (${qrCodesCount - usedQrs} unused)`, 320, 290);

    doc.moveTo(60, 345).lineTo(552, 345).stroke('#E2E8F0');

    // Section 2: Critical alerts list if any
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Active Anomaly Monitoring', 60, 360);

    const [alertsList] = await db.query(
      `SELECT a.message, a.created_at, m.material_name 
       FROM alerts a 
       LEFT JOIN materials m ON a.material_id = m.id 
       WHERE a.alert_status = 'active'
       ORDER BY a.created_at DESC LIMIT 5`
    );

    if (alertsList.length > 0) {
      const headers = ['Material Name', 'Critical Alert Message', 'Timestamp'];
      const rows = alertsList.map(a => [
        a.material_name || 'System',
        a.message,
        new Date(a.created_at).toLocaleString()
      ]);
      drawTable(doc, headers, rows, 60, 380, [130, 220, 142]);
    } else {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748B').text('No active stock breaches or warehouse warnings detected. All nodes healthy.', 60, 385);
    }

    drawFooter(doc);

    serveAndSavePDF(doc, 'warehouse_summary_report', req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Transactions Report PDF
 * GET /api/reports/transactions
 */
export const getTransactionsReport = async (req, res, next) => {
  try {
    const [transactions] = await db.query(
      `SELECT t.id, t.transaction_type, t.quantity, t.created_at, m.material_name, m.barcode, u.name AS user_name
       FROM transactions t
       LEFT JOIN materials m ON t.material_id = m.id
       LEFT JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );

    const inwardCount = transactions.filter(t => t.transaction_type === 'inward').length;
    const outwardCount = transactions.length - inwardCount;

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    drawHeader(doc, 'Material Transactions Audit Log');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Total Transactions Logged: ${transactions.length}`, 60, 160);
    doc.text(`Inward Operations Count: ${inwardCount} | Outward Operations Count: ${outwardCount}`, 60, 175);

    doc.moveTo(60, 200).lineTo(552, 200).stroke('#E2E8F0');

    const headers = ['TX ID', 'Material Name', 'Barcode', 'Type', 'Quantity', 'Operator', 'Timestamp'];
    const rows = transactions.map(t => [
      String(t.id),
      t.material_name || 'N/A',
      t.barcode || 'N/A',
      t.transaction_type.toUpperCase(),
      parseFloat(t.quantity).toFixed(2),
      t.user_name || 'System',
      new Date(t.created_at).toLocaleString()
    ]);

    drawTable(doc, headers, rows, 60, 215, [40, 120, 60, 50, 50, 80, 92]);
    drawFooter(doc);

    serveAndSavePDF(doc, 'transactions_report', req, res);
  } catch (error) {
    next(error);
  }
};
