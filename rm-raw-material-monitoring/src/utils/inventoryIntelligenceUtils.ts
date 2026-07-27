export type StockHealthCategory = 'critical' | 'low' | 'healthy' | 'overstock';

export interface ClassifiedMaterialItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  location: string;
  stock: number;
  unit: string;
  minThreshold: number;
  maxThreshold: number;
  healthCategory: StockHealthCategory;
  recommendedStatus: string;
  actionRequired: string;
  urgencyRank: number; // 1 (Highest/Critical) to 4 (Lowest/Healthy)
  batchNumber?: string;
}

export interface HealthCategoryCounts {
  critical: number;
  low: number;
  healthy: number;
  overstock: number;
  total: number;
}

/**
 * Dynamically classifies a material record based on its current stock vs min/max thresholds.
 */
export const classifyMaterialItem = (rawMaterial: any): ClassifiedMaterialItem => {
  const stock = typeof rawMaterial.stock === 'number' ? rawMaterial.stock : parseFloat(rawMaterial.stock) || 0;
  const minThreshold = typeof rawMaterial.minLimit === 'number' 
    ? rawMaterial.minLimit 
    : (parseFloat(rawMaterial.min_limit || rawMaterial.threshold_limit) || 10);
  
  // Calculate dynamic max threshold if not explicitly set
  let maxThreshold = typeof rawMaterial.maxLimit === 'number'
    ? rawMaterial.maxLimit
    : (parseFloat(rawMaterial.max_capacity || rawMaterial.maxLimit) || 0);

  if (!maxThreshold || maxThreshold >= 99999999) {
    // Dynamic rule: max threshold defaults to 4x min threshold for standard inventory buffers
    maxThreshold = Math.max(100, minThreshold * 4);
  }

  let healthCategory: StockHealthCategory = 'healthy';
  let recommendedStatus = 'Optimal Level';
  let actionRequired = 'No Action Needed';
  let urgencyRank = 4;

  const criticalLimit = minThreshold * 0.5;

  if (stock <= criticalLimit) {
    healthCategory = 'critical';
    const needed = Math.ceil(minThreshold * 2 - stock);
    recommendedStatus = `CRITICAL DEFICIT: Urgent Reorder (+${needed} ${rawMaterial.unit || 'Units'})`;
    actionRequired = 'Immediate Purchase Order';
    urgencyRank = 1;
  } else if (stock <= minThreshold) {
    healthCategory = 'low';
    const needed = Math.ceil(minThreshold * 1.5 - stock);
    recommendedStatus = `LOW STOCK WARNING: Reorder Soon (+${needed} ${rawMaterial.unit || 'Units'})`;
    actionRequired = 'Schedule Reorder Batch';
    urgencyRank = 2;
  } else if (stock > maxThreshold) {
    healthCategory = 'overstock';
    const excess = Math.ceil(stock - maxThreshold);
    recommendedStatus = `OVERSTOCK DETECTED: Exceeds Max Target by +${excess} ${rawMaterial.unit || 'Units'}`;
    actionRequired = 'Hold Inward Intake / Reallocate';
    urgencyRank = 3;
  } else {
    healthCategory = 'healthy';
    recommendedStatus = 'Optimal Operating Level';
    actionRequired = 'Maintain Routine Rotations';
    urgencyRank = 4;
  }

  return {
    id: String(rawMaterial.id || rawMaterial.barcode),
    barcode: rawMaterial.barcode || rawMaterial.registrationId || 'N/A',
    name: rawMaterial.name || rawMaterial.material_name || 'Unnamed Material',
    category: rawMaterial.category || 'Paint Raw Material',
    location: rawMaterial.location || 'UNASSIGNED',
    stock,
    unit: rawMaterial.unit || 'KG',
    minThreshold,
    maxThreshold,
    healthCategory,
    recommendedStatus,
    actionRequired,
    urgencyRank,
    batchNumber: rawMaterial.batchNumber || rawMaterial.batch_number || ''
  };
};

/**
 * Calculates aggregate category counts from classified items.
 */
export const calculateHealthCategoryCounts = (items: ClassifiedMaterialItem[]): HealthCategoryCounts => {
  const counts: HealthCategoryCounts = {
    critical: 0,
    low: 0,
    healthy: 0,
    overstock: 0,
    total: items.length
  };

  items.forEach((item) => {
    if (item.healthCategory === 'critical') counts.critical++;
    else if (item.healthCategory === 'low') counts.low++;
    else if (item.healthCategory === 'overstock') counts.overstock++;
    else counts.healthy++;
  });

  return counts;
};
