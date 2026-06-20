import db from '../backend/config/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

async function testPdf() {
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
    
    // Draw header
    doc.rect(0, 0, 612, 15).fill('#4F8CFF');
    doc.circle(60, 48, 14).fill('#4F8CFF');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('RM', 52, 43);
    doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(14).text('Paint RM Monitor Co.', 85, 38);
    doc.fontSize(8).font('Helvetica').fillColor('#64748B').text('Warehouse Control & Traceability Unit', 85, 53);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text('Material Transactions Audit Log', 60, 85);
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748B').text(`Generated on: ${new Date().toLocaleString()}`, 60, 105);
    doc.moveTo(60, 120).lineTo(552, 120).stroke('#E2E8F0');

    // Stats
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Report Highlights:', 60, 140);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Total Transactions Logged: ${transactions.length}`, 60, 160);
    doc.text(`Inward Operations Count: ${inwardCount} | Outward Operations Count: ${outwardCount}`, 60, 175);

    doc.moveTo(60, 200).lineTo(552, 200).stroke('#E2E8F0');

    // Headers
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

    const columnWidths = [40, 120, 60, 50, 50, 80, 92];
    const startX = 60;
    let currentY = 215;

    // Header background
    doc.rect(startX, currentY - 4, columnWidths.reduce((a, b) => a + b, 0), 18).fill('#F8FAFC');
    
    // Headers text
    doc.fillColor('#4F8CFF').font('Helvetica-Bold').fontSize(8);
    headers.forEach((header, index) => {
      const xPos = startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 4;
      doc.text(header, xPos, currentY);
    });
    
    currentY += 18;
    doc.moveTo(startX, currentY - 2).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY - 2).stroke('#E2E8F0');
    currentY += 6;
    
    // Rows
    doc.font('Helvetica').fontSize(8).fillColor('#374151');
    rows.forEach(row => {
      row.forEach((cell, index) => {
        const xPos = startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0) + 4;
        doc.text(String(cell !== null && cell !== undefined ? cell : 'N/A'), xPos, currentY, {
          width: columnWidths[index] - 8,
          ellipsis: true
        });
      });
      currentY += 18;
    });

    // Footer
    doc.fontSize(7).font('Helvetica').fillColor('#94A3B8').text('Confidential - Paint RM Monitor Warehouse Management System', 60, 750, { align: 'center' });

    // Output file
    const filePath = path.join(process.cwd(), 'scratch/test_transactions_report.pdf');
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.end();

    writeStream.on('finish', () => {
      console.log('PDF generated successfully at:', filePath);
      db.end();
    });

  } catch (err) {
    console.error(err);
    db.end();
  }
}

testPdf();
