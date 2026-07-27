import { getWarehouseAnalytics, getConsumptionAnalytics } from './api';

export interface AnalyticsFilterParams {
  dateRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  material?: string;
  rack?: string;
  transactionType?: 'all' | 'inward' | 'outward' | 'moved';
}

export interface InventoryByMaterialItem {
  name: string;
  barcode: string;
  stock: number;
  threshold: number;
  unit: string;
}

export interface InventoryByRackItem {
  rack_code: string;
  material_name: string;
  occupied: number;
  capacity: number;
  utilization: number;
}

export interface WarehouseUtilizationData {
  totalCapacity: number;
  occupiedCapacity: number;
  availableCapacity: number;
  utilizationPercentage: number;
}

export interface MaterialDistributionItem {
  name: string;
  value: number;
  percentage: number;
}

export interface DailyMovementItem {
  date: string;
  inward: number;
  outward: number;
  total: number;
}

export interface WeeklyTransactionItem {
  week: string;
  inward: number;
  outward: number;
}

export interface MonthlyTransactionItem {
  month: string;
  inward: number;
  outward: number;
}

export interface WarehouseAnalyticsData {
  inventoryByMaterial: InventoryByMaterialItem[];
  inventoryByRack: InventoryByRackItem[];
  warehouseUtilization: WarehouseUtilizationData;
  materialDistribution: MaterialDistributionItem[];
  dailyMaterialMovement: DailyMovementItem[];
  weeklyTransactions: WeeklyTransactionItem[];
  monthlyTransactions: MonthlyTransactionItem[];
}

export const fetchWarehouseAnalytics = async (
  params?: AnalyticsFilterParams
): Promise<WarehouseAnalyticsData> => {
  const response: any = await getWarehouseAnalytics(params);
  // api.js returns response.data which is { status, data: {...} }
  const data = response?.data || response;
  return data as WarehouseAnalyticsData;
};

export interface MaterialConsumptionItem {
  id: string;
  name: string;
  barcode: string;
  currentStock: number;
  threshold: number;
  unit: string;
  totalConsumed: number;
  transactionCount: number;
  dailyVelocity: number;
  velocityCategory: 'Fast Moving' | 'Slow Moving' | 'Healthy Movement';
  lastOutwardDate: string;
}

export interface ConsumptionTrendItem {
  date?: string;
  week?: string;
  month?: string;
  consumed: number;
}

export interface MaterialConsumptionAnalyticsData {
  allMaterials: MaterialConsumptionItem[];
  mostConsumed: MaterialConsumptionItem[];
  leastConsumed: MaterialConsumptionItem[];
  fastMoving: MaterialConsumptionItem[];
  slowMoving: MaterialConsumptionItem[];
  dailyConsumption: ConsumptionTrendItem[];
  weeklyConsumption: ConsumptionTrendItem[];
  monthlyConsumption: ConsumptionTrendItem[];
}

export const fetchConsumptionAnalytics = async (
  dateRange: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<MaterialConsumptionAnalyticsData> => {
  const response: any = await getConsumptionAnalytics(dateRange);
  // api.js returns response.data which is { status, data: {...} }
  const data = response?.data || response;
  return data as MaterialConsumptionAnalyticsData;
};


