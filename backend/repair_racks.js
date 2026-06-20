/**
 * repair_racks.js
 * Database script to inspect and repair overloaded racks where current capacity exceeds max capacity.
 */
import db from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRepair() {
  console.log('=== Rack Capacity Repair & Audit Utility ===\n');

  // 1. Fetch overloaded racks from racks table
  const [overloadedRacks] = await db.query(
    'SELECT id, rack_code, material_name, quantity, max_capacity, status_color FROM racks WHERE quantity > max_capacity'
  );

  // 2. Fetch overloaded racks from rack_inventory table
  const [overloadedInv] = await db.query(
    'SELECT id, rack_code, current_capacity, max_capacity, occupancy_percentage FROM rack_inventory WHERE current_capacity > max_capacity'
  );

  const totalOverloaded = Math.max(overloadedRacks.length, overloadedInv.length);

  // Generate Report Output
  let reportText = `======================================================================\n`;
  reportText += `RACK OVERLOAD AUDIT REPORT\n`;
  reportText += `Generated on: ${new Date().toLocaleString()}\n`;
  reportText += `======================================================================\n\n`;

  if (totalOverloaded === 0) {
    reportText += `SUCCESS: No overloaded racks detected. All rack capacities are within their specified limits.\n`;
    console.log('✅ No overloaded racks detected!');
  } else {
    reportText += `ALERT: Detected ${totalOverloaded} overloaded rack capacity discrepancies!\n\n`;
    reportText += `--- DETAILED INVENTORY SHELF OVERLOADS ---\n`;
    
    // Create map of inventory statuses
    const invMap = {};
    overloadedInv.forEach(item => {
      invMap[item.rack_code] = item;
    });

    overloadedRacks.forEach(rack => {
      const invRecord = invMap[rack.rack_code];
      reportText += `Rack Code          : ${rack.rack_code}\n`;
      reportText += `Material Assigned  : ${rack.material_name || 'N/A'}\n`;
      reportText += `Current Capacity   : ${rack.quantity} KG (Inventory: ${invRecord ? invRecord.current_capacity : rack.quantity} KG)\n`;
      reportText += `Max Capacity Limit : ${rack.max_capacity} KG\n`;
      reportText += `Excess Load        : ${(rack.quantity - rack.max_capacity).toFixed(2)} KG\n`;
      reportText += `Occupancy %        : ${invRecord ? invRecord.occupancy_percentage : ((rack.quantity / rack.max_capacity) * 100).toFixed(2)}%\n`;
      reportText += `--------------------------------------------------\n`;
    });

    console.log(`⚠️  Detected ${totalOverloaded} overloaded rack(s)!`);
    console.log(reportText);

    // Auto-repair execution
    const shouldRepair = process.argv.includes('--repair');
    if (shouldRepair) {
      console.log('Initiating repair protocols...');
      for (const rack of overloadedRacks) {
        console.log(`- Repairing Rack ${rack.rack_code}: updating max_capacity to ${rack.quantity}...`);
        await db.query(
          'UPDATE racks SET max_capacity = ? WHERE rack_code = ?',
          [rack.quantity, rack.rack_code]
        );
        // Recalculate occupancy percentage in update
        const occPercent = 100.00;
        await db.query(
          'UPDATE rack_inventory SET max_capacity = ?, occupancy_percentage = ? WHERE rack_code = ?',
          [rack.quantity, occPercent, rack.rack_code]
        );
      }
      console.log('\n✅ Repair complete! All overloaded capacities updated to match current loads.');
      reportText += `\nSTATUS: Repair actions executed (--repair flag provided). Racks updated successfully.\n`;
    } else {
      console.log('Tip: Run this script with the "--repair" flag to automatically resolve capacity discrepancies.');
      reportText += `\nSTATUS: Report generated only. No database modifications were performed (run with --repair to fix).\n`;
    }
  }

  // Save report to reports directory
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFileName = `overloaded_racks_report_${Date.now()}.txt`;
  const reportFilePath = path.join(reportsDir, reportFileName);
  fs.writeFileSync(reportFilePath, reportText, 'utf8');
  console.log(`\nReport saved successfully to: ${reportFilePath}`);

  // Wait for background connection setup to settle
  await new Promise(resolve => setTimeout(resolve, 1500));
  await db.end();
}

runRepair().catch(async err => {
  console.error('Repair utility encountered an error:', err);
  await new Promise(resolve => setTimeout(resolve, 1500));
  await db.end();
});
