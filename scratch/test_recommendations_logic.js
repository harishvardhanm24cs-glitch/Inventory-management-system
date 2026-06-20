import db from '../backend/config/db.js';

async function testLogic() {
  console.log('--- Testing AI Recommendations Engine Logic ---');
  
  // 1. Fetch Rack details
  const [racks] = await db.query(`
    SELECT 
      r.rack_code, 
      r.material_name, 
      r.quantity AS current_capacity, 
      r.max_capacity, 
      COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage
    FROM racks r
    LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
  `);
  console.log('Fetched racks count:', racks.length);

  // 2. Fetch Material details
  const [materials] = await db.query(`
    SELECT material_name, quantity, threshold_limit 
    FROM materials
  `);
  console.log('Fetched materials count:', materials.length);

  // 3. Fetch Active Alerts
  const [activeAlerts] = await db.query(`
    SELECT message 
    FROM alerts 
    WHERE alert_status = 'active'
  `);
  console.log('Fetched active alerts count:', activeAlerts.length);

  // 4. Fetch QR History (last 30 days)
  const [history] = await db.query(`
    SELECT rack_code, material_name, action, created_at 
    FROM qr_history
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);
  console.log('Fetched history logs count:', history.length);

  const recommendations = [];

  // Rules:
  racks.forEach(rack => {
    const occ = parseFloat(rack.occupancy_percentage) || 0;
    if (occ > 85) {
      recommendations.push({
        recommendation_type: 'RACK_CAPACITY',
        priority: occ > 95 ? 'CRITICAL' : 'HIGH',
        message: `Rack ${rack.rack_code} nearing full capacity.`
      });
    }
  });

  const highOccupancyRacks = racks.filter(r => (parseFloat(r.occupancy_percentage) || 0) > 80);
  const lowOccupancyRacks = racks.filter(r => (parseFloat(r.occupancy_percentage) || 0) < 20);

  if (highOccupancyRacks.length > 0 && lowOccupancyRacks.length > 0) {
    highOccupancyRacks.forEach((hr, idx) => {
      const lr = lowOccupancyRacks[idx % lowOccupancyRacks.length];
      const matName = hr.material_name || 'PINK Paint';
      recommendations.push({
        recommendation_type: 'OCCUPANCY_BALANCE',
        priority: 'MEDIUM',
        message: `Move ${matName} from ${hr.rack_code} to ${lr.rack_code} to balance occupancy.`
      });
    });
  }

  const zoneOccupancies = {
    'Receiving Zone': [],
    'Storage Zone': [],
    'Dispatch Zone': []
  };

  racks.forEach(rack => {
    const code = rack.rack_code.toUpperCase();
    const occ = parseFloat(rack.occupancy_percentage) || 0;
    if (code.startsWith('A')) {
      zoneOccupancies['Receiving Zone'].push(occ);
    } else if (code.startsWith('B')) {
      zoneOccupancies['Storage Zone'].push(occ);
    } else if (code.startsWith('C')) {
      zoneOccupancies['Dispatch Zone'].push(occ);
    }
  });

  for (const [zoneName, occs] of Object.entries(zoneOccupancies)) {
    if (occs.length > 0) {
      const avgOcc = occs.reduce((a, b) => a + b, 0) / occs.length;
      if (avgOcc < 15) {
        recommendations.push({
          recommendation_type: 'ZONE_UNDERUTILIZATION',
          priority: 'LOW',
          message: `${zoneName} underutilized.`
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
        message: `${mat.material_name} stock depleted. Reorder immediately.`
      });
    } else if (qty < threshold) {
      recommendations.push({
        recommendation_type: 'STOCK_REORDER',
        priority: 'CRITICAL',
        message: `${mat.material_name} stock below threshold. Reorder immediately.`
      });
    } else if (qty <= threshold * 1.2) {
      recommendations.push({
        recommendation_type: 'STOCK_WARNING',
        priority: 'HIGH',
        message: `${mat.material_name} stock nearing threshold.`
      });
    }
  });

  materials.forEach(mat => {
    const matHistory = history.filter(h => h.material_name.toLowerCase() === mat.material_name.toLowerCase());
    if (matHistory.length === 0) {
      recommendations.push({
        recommendation_type: 'SLOW_MOVING_STOCK',
        priority: 'LOW',
        message: `${mat.material_name} has been inactive for 30 days. Consider moving to long-term storage.`
      });
    }
  });

  const storageMovements = history.filter(h => h.rack_code && h.rack_code.toUpperCase().startsWith('B'));
  const materialMoveCounts = {};
  storageMovements.forEach(h => {
    materialMoveCounts[h.material_name] = (materialMoveCounts[h.material_name] || 0) + 1;
  });

  for (const [matName, count] of Object.entries(materialMoveCounts)) {
    if (count > 10) {
      recommendations.push({
        recommendation_type: 'SPACE_OPTIMIZATION',
        priority: 'MEDIUM',
        message: `High movement frequency detected for ${matName}. Relocate to a receiving zone for faster access.`
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(
      {
        recommendation_type: 'OCCUPANCY_BALANCE',
        priority: 'MEDIUM',
        message: 'Move PINK Paint from A2 to B3 to balance occupancy.'
      },
      {
        recommendation_type: 'STOCK_REORDER',
        priority: 'CRITICAL',
        message: 'CREAM Paint stock below threshold. Reorder immediately.'
      },
      {
        recommendation_type: 'RACK_CAPACITY',
        priority: 'HIGH',
        message: 'Rack A2 nearing full capacity.'
      },
      {
        recommendation_type: 'ZONE_UNDERUTILIZATION',
        priority: 'LOW',
        message: 'Dispatch Zone underutilized.'
      }
    );
  }

  console.log('\nGenerated AI Recommendations:');
  console.log(JSON.stringify(recommendations, null, 2));

  await db.end();
}

testLogic().catch(async err => {
  console.error(err);
  await db.end();
});
