export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RecommendationCategory = 
  | 'Inventory Level' 
  | 'Warehouse Utilization' 
  | 'Consumption Trend' 
  | 'Material Movement' 
  | 'Threshold Warning';

export interface OperationalRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  reason: string;
  suggestedAction: string;
  targetEntity: string;
  timestamp: string;
}

/**
 * Automatically generates operational suggestions based on live warehouse state:
 * - Inventory Levels & Thresholds
 * - Rack Utilization & Storage Distribution
 * - Consumption Velocity & Material Movements
 */
export const generateOperationalRecommendations = (
  materials: any[] = [],
  racks: any[] = [],
  consumptionData?: any
): OperationalRecommendation[] => {
  const recommendations: OperationalRecommendation[] = [];
  const now = new Date();
  const formattedNow = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 1. ANALYZE INVENTORY LEVELS & THRESHOLDS
  materials.forEach((mat) => {
    const qty = typeof mat.stock === 'number' ? mat.stock : parseFloat(mat.stock) || 0;
    const minLimit = typeof mat.minLimit === 'number' 
      ? mat.minLimit 
      : (parseFloat(mat.min_limit || mat.threshold_limit) || 10);
    const maxLimit = typeof mat.maxLimit === 'number'
      ? mat.maxLimit
      : (parseFloat(mat.max_capacity) || minLimit * 4);

    const name = mat.name || mat.material_name || 'Material';

    // A. Critical / Low Stock Approaching Threshold
    if (qty <= minLimit * 0.5) {
      const reorderNeeded = Math.ceil(minLimit * 2 - qty);
      recommendations.push({
        id: `rec-crit-stock-${mat.id || mat.barcode}`,
        category: 'Threshold Warning',
        priority: 'CRITICAL',
        title: `Critical Deficit: ${name}`,
        reason: `Current inventory (${qty} ${mat.unit || 'KG'}) is at or below 50% of the safety threshold limit (${minLimit} ${mat.unit || 'KG'}).`,
        suggestedAction: `Generate an emergency Purchase Order for +${reorderNeeded} ${mat.unit || 'KG'} immediately to prevent production downtime.`,
        targetEntity: name,
        timestamp: formattedNow
      });
    } else if (qty <= minLimit) {
      const reorderNeeded = Math.ceil(minLimit * 1.5 - qty);
      recommendations.push({
        id: `rec-low-stock-${mat.id || mat.barcode}`,
        category: 'Inventory Level',
        priority: 'HIGH',
        title: `Low Stock Warning: ${name}`,
        reason: `Current stock level (${qty} ${mat.unit || 'KG'}) has reached the minimum safety threshold limit (${minLimit} ${mat.unit || 'KG'}).`,
        suggestedAction: `Schedule a routine replenishment reorder batch (+${reorderNeeded} ${mat.unit || 'KG'}).`,
        targetEntity: name,
        timestamp: formattedNow
      });
    }

    // B. Overstocked Materials
    if (maxLimit > 0 && maxLimit < 99999999 && qty > maxLimit) {
      const excess = Math.ceil(qty - maxLimit);
      recommendations.push({
        id: `rec-overstock-${mat.id || mat.barcode}`,
        category: 'Inventory Level',
        priority: 'MEDIUM',
        title: `Overstock Alert: ${name}`,
        reason: `Current inventory (${qty} ${mat.unit || 'KG'}) exceeds target maximum storage limit (${maxLimit} ${mat.unit || 'KG'}) by +${excess} ${mat.unit || 'KG'}.`,
        suggestedAction: `Pause inward procurement orders for this SKU and prioritize allocation in upcoming production batches.`,
        targetEntity: name,
        timestamp: formattedNow
      });
    }
  });

  // 2. ANALYZE WAREHOUSE RACK UTILIZATION
  racks.forEach((rack) => {
    const q = parseFloat(String(rack.quantity)) || 0;
    const c = parseFloat(String(rack.max_capacity)) || 100;
    const pct = c > 0 ? (q / c) * 100 : 0;
    const code = rack.rack_code;

    // A. Underutilized Racks
    if (pct === 0) {
      recommendations.push({
        id: `rec-under-rack-${rack.id || code}`,
        category: 'Warehouse Utilization',
        priority: 'LOW',
        title: `Empty Storage Slot: Rack ${code}`,
        reason: `Rack ${code} is currently 0% occupied with 0 KG stored out of ${c} KG total capacity.`,
        suggestedAction: `Assign new incoming raw material arrivals to Rack ${code} to optimize spatial warehouse distribution.`,
        targetEntity: `Rack ${code}`,
        timestamp: formattedNow
      });
    } else if (pct < 25) {
      recommendations.push({
        id: `rec-low-util-rack-${rack.id || code}`,
        category: 'Warehouse Utilization',
        priority: 'LOW',
        title: `Underutilized Slot: Rack ${code}`,
        reason: `Rack ${code} is operating at only ${pct.toFixed(1)}% capacity (${q} KG / ${c} KG).`,
        suggestedAction: `Consolidate partial batch materials into Rack ${code} to free up high-demand bay space.`,
        targetEntity: `Rack ${code}`,
        timestamp: formattedNow
      });
    }

    // B. Overcrowded Near-Capacity Racks
    if (pct >= 90) {
      recommendations.push({
        id: `rec-full-rack-${rack.id || code}`,
        category: 'Warehouse Utilization',
        priority: 'HIGH',
        title: `High Rack Occupancy: Rack ${code}`,
        reason: `Rack ${code} is operating near maximum capacity at ${pct.toFixed(1)}% load (${q} KG / ${c} KG).`,
        suggestedAction: `Offload excess stock to an adjacent empty storage rack to avoid physical overflow.`,
        targetEntity: `Rack ${code}`,
        timestamp: formattedNow
      });
    }
  });

  // 3. ANALYZE MATERIAL MOVEMENT & CONSUMPTION TRENDS
  if (consumptionData && Array.isArray(consumptionData.fastMoving)) {
    consumptionData.fastMoving.forEach((fastMat: any) => {
      recommendations.push({
        id: `rec-fast-move-${fastMat.id || fastMat.barcode}`,
        category: 'Material Movement',
        priority: 'MEDIUM',
        title: `High Velocity Staging: ${fastMat.name}`,
        reason: `${fastMat.name} has a high daily turnover velocity (${fastMat.dailyVelocity} KG/Day) across ${fastMat.transactionCount} transactions.`,
        suggestedAction: `Relocate ${fastMat.name} to front-row bays (e.g. Zone A racks) near the outward loading dock for faster forklift retrieval.`,
        targetEntity: fastMat.name,
        timestamp: formattedNow
      });
    });
  }

  if (consumptionData && Array.isArray(consumptionData.slowMoving)) {
    consumptionData.slowMoving.slice(0, 3).forEach((slowMat: any) => {
      recommendations.push({
        id: `rec-slow-move-${slowMat.id || slowMat.barcode}`,
        category: 'Consumption Trend',
        priority: 'MEDIUM',
        title: `Stagnant Stock Audit: ${slowMat.name}`,
        reason: `${slowMat.name} has zero or minimal outward movement in recent periods while holding ${slowMat.currentStock} ${slowMat.unit} in stock.`,
        suggestedAction: `Conduct a quality assurance shelf-life inspection or check for chemical formula substitution compatibility.`,
        targetEntity: slowMat.name,
        timestamp: formattedNow
      });
    });
  }

  // Sort by Priority Rank: CRITICAL (1) -> HIGH (2) -> MEDIUM (3) -> LOW (4)
  const priorityRank: Record<RecommendationPriority, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4
  };

  return recommendations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
};
