import db from '../config/db.js';

/**
 * rackOptimizationIntelligence.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 6 – Rack Optimization Intelligence Engine
 *
 * Reuses existing Rack View, Inventory, and Transaction tables without
 * modifying backend rack assignment logic or mutating allocations.
 */

class RackOptimizationIntelligenceEngine {
  async analyzeAll() {
    const nowISO = new Date().toISOString();

    // 1. Query Rack State & Inventory Occupancy
    const [racks] = await db.query(`
      SELECT 
        r.id,
        r.rack_code, 
        r.material_name, 
        r.quantity AS current_capacity, 
        COALESCE(ri.max_capacity, r.max_capacity, 100.00) AS max_capacity, 
        COALESCE(ri.occupancy_percentage, 0.00) AS occupancy_percentage
      FROM racks r
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
      ORDER BY r.rack_code ASC
    `);

    // 2. Query Material details
    const [materials] = await db.query(`
      SELECT id, material_name, barcode, quantity, threshold_limit 
      FROM materials
    `);

    const matCategoryMap = {};
    (materials || []).forEach((m) => {
      matCategoryMap[(m.material_name || '').toLowerCase()] = m.category || 'General';
    });

    // 3. Query 30-Day Movement Frequency per Rack & Material
    const [history] = await db.query(`
      SELECT rack_code, material_name, COUNT(*) AS scan_count
      FROM qr_history
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY rack_code, material_name
    `);

    const rackFrequencyMap = {};
    const matFrequencyMap = {};

    (history || []).forEach((h) => {
      if (h.rack_code) {
        rackFrequencyMap[h.rack_code.toUpperCase()] = (rackFrequencyMap[h.rack_code.toUpperCase()] || 0) + parseInt(h.scan_count || 0);
      }
      if (h.material_name) {
        matFrequencyMap[h.material_name.toLowerCase()] = (matFrequencyMap[h.material_name.toLowerCase()] || 0) + parseInt(h.scan_count || 0);
      }
    });

    const optimizations = [];

    const highOccupancy = (racks || []).filter((r) => (parseFloat(r.occupancy_percentage) || 0) > 85);
    const lowOccupancy = (racks || []).filter((r) => {
      const occ = parseFloat(r.occupancy_percentage) || 0;
      return occ > 0 && occ < 20;
    });
    const emptyRacks = (racks || []).filter((r) => (parseFloat(r.occupancy_percentage) || 0) === 0);

    let nearFullCount = 0;
    let underutilizedCount = 0;
    let placementCount = 0;
    let flowCount = 0;

    // --- 1. RACK NEARING FULL CAPACITY (>85%) ---
    highOccupancy.forEach((hr, idx) => {
      const occ = Math.round(parseFloat(hr.occupancy_percentage) || 0);
      const curCap = parseFloat(hr.current_capacity) || 0;
      const maxCap = parseFloat(hr.max_capacity) || 100;
      const availCap = Math.max(0, maxCap - curCap);
      const moves = rackFrequencyMap[hr.rack_code.toUpperCase()] || 0;
      const matName = hr.material_name || 'Material';
      const category = matCategoryMap[matName.toLowerCase()] || 'General';

      // Pick an empty or low-occupancy rack for rebalancing
      const candidateTarget = (emptyRacks[idx % Math.max(1, emptyRacks.length)] || lowOccupancy[idx % Math.max(1, lowOccupancy.length)])?.rack_code || 'A3';

      const priority = occ > 95 ? 'CRITICAL' : 'HIGH';

      optimizations.push({
        id: `opt-near-full-${hr.rack_code}-${idx}-${Date.now()}`,
        optimization_type: 'NEAR_FULL_CAPACITY',
        priority,
        current_rack: hr.rack_code,
        suggested_rack: candidateTarget,
        material_name: matName,
        category,
        suggestion: `Rack ${hr.rack_code} is nearing full capacity (${occ}% occupied). Rebalance ${matName} to Rack ${candidateTarget}.`,
        expected_improvement: `Reduces ${hr.rack_code} occupancy to ~70% and restores +${Math.round(maxCap * 0.2)} KG safety headroom.`,
        metrics: {
          occupancy_percentage: occ,
          available_capacity: availCap,
          scan_frequency_30d: moves,
        },
        created_at: nowISO,
      });
      nearFullCount++;
    });

    // --- 2. RACK UNDERUTILIZED (<20%) ---
    lowOccupancy.forEach((lr, idx) => {
      const occ = Math.round(parseFloat(lr.occupancy_percentage) || 0);
      const curCap = parseFloat(lr.current_capacity) || 0;
      const maxCap = parseFloat(lr.max_capacity) || 100;
      const availCap = Math.max(0, maxCap - curCap);
      const moves = rackFrequencyMap[lr.rack_code.toUpperCase()] || 0;
      const matName = lr.material_name || 'Material';
      const category = matCategoryMap[matName.toLowerCase()] || 'General';

      optimizations.push({
        id: `opt-underutilized-${lr.rack_code}-${idx}-${Date.now()}`,
        optimization_type: 'RACK_UNDERUTILIZED',
        priority: 'LOW',
        current_rack: lr.rack_code,
        suggested_rack: null,
        material_name: matName,
        category,
        suggestion: `Rack ${lr.rack_code} is underutilized (${occ}% occupied with ${curCap} KG stored).`,
        expected_improvement: `Consolidates small batch lots to free up entire shelf slot in ${lr.rack_code}.`,
        metrics: {
          occupancy_percentage: occ,
          available_capacity: availCap,
          scan_frequency_30d: moves,
        },
        created_at: nowISO,
      });
      underutilizedCount++;
    });

    // --- 3. BETTER RACK PLACEMENT (HIGH MOVEMENT FREQUENCY IN FAR STORAGE ZONES) ---
    (racks || []).forEach((rack) => {
      const code = rack.rack_code.toUpperCase();
      const matName = rack.material_name;
      if (matName && code.startsWith('B')) { // B-Zone is deep storage
        const moves = matFrequencyMap[matName.toLowerCase()] || 0;
        if (moves > 8) { // High activity material stored in deep storage zone
          const curCap = parseFloat(rack.current_capacity) || 0;
          const maxCap = parseFloat(rack.max_capacity) || 100;
          const availCap = Math.max(0, maxCap - curCap);
          const category = matCategoryMap[matName.toLowerCase()] || 'General';

          optimizations.push({
            id: `opt-better-placement-${code}-${Date.now()}`,
            optimization_type: 'BETTER_PLACEMENT',
            priority: 'HIGH',
            current_rack: code,
            suggested_rack: 'A1', // Receiving/Ingress zone A
            material_name: matName,
            category,
            suggestion: `High-frequency item ${matName} (${moves} scans/30d) is stored in deep Storage Rack ${code}. Relocate to Inbound Rack A1 for faster forklift retrieval.`,
            expected_improvement: `Reduces scan-to-dispatch travel time by ~35% for ${matName}.`,
            metrics: {
              occupancy_percentage: parseFloat(rack.occupancy_percentage) || 0,
              available_capacity: availCap,
              scan_frequency_30d: moves,
            },
            created_at: nowISO,
          });
          placementCount++;
        }
      }
    });

    // --- 4. IMPROVE WAREHOUSE FLOW (ZONE IMBALANCE) ---
    const zoneStats = { A: [], B: [], C: [] };
    (racks || []).forEach((r) => {
      const code = r.rack_code.toUpperCase();
      const occ = parseFloat(r.occupancy_percentage) || 0;
      if (code.startsWith('A')) zoneStats.A.push(occ);
      else if (code.startsWith('B')) zoneStats.B.push(occ);
      else if (code.startsWith('C')) zoneStats.C.push(occ);
    });

    const avgA = zoneStats.A.length > 0 ? zoneStats.A.reduce((a, b) => a + b, 0) / zoneStats.A.length : 0;
    const avgC = zoneStats.C.length > 0 ? zoneStats.C.reduce((a, b) => a + b, 0) / zoneStats.C.length : 0;

    if (Math.abs(avgA - avgC) > 35) {
      optimizations.push({
        id: `opt-flow-imbalance-${Date.now()}`,
        optimization_type: 'IMPROVE_WAREHOUSE_FLOW',
        priority: 'MEDIUM',
        current_rack: avgA > avgC ? 'Zone A (Receiving)' : 'Zone C (Dispatch)',
        suggested_rack: avgA > avgC ? 'Zone C (Dispatch)' : 'Zone A (Receiving)',
        material_name: null,
        category: 'Inter-Zone Flow',
        suggestion: `Warehouse flow imbalance detected: Inbound Zone A avg occupancy is ${Math.round(avgA)}% vs Outbound Zone C avg occupancy ${Math.round(avgC)}%.`,
        expected_improvement: `Balances forklift transit workload evenly across receiving and dispatch corridors.`,
        metrics: {
          occupancy_percentage: Math.round(Math.max(avgA, avgC)),
          available_capacity: 0,
          scan_frequency_30d: 0,
        },
        created_at: nowISO,
      });
      flowCount++;
    }

    return {
      optimizations,
      summary: {
        total_recommendations: optimizations.length,
        near_full_racks_count: nearFullCount,
        underutilized_racks_count: underutilizedCount,
        placement_suggestions_count: placementCount,
        flow_suggestions_count: flowCount,
      }
    };
  }
}

export const rackOptimizationIntelligence = new RackOptimizationIntelligenceEngine();
export default rackOptimizationIntelligence;
