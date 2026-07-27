import featureEngineeringService from '../services/featureEngineeringService.js';

/**
 * featureController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 3: Feature Engineering Controller
 * Exposes feature extraction endpoints for prediction engine, dashboard, reports, digital twin.
 */

export const getFeatures = async (req, res, next) => {
  try {
    const data = await featureEngineeringService.generateAllFeatures();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterialFeatures = async (req, res, next) => {
  try {
    const data = await featureEngineeringService.generateAllFeatures();
    res.status(200).json({
      status: 'success',
      metadata: data.metadata,
      results: data.material_features.length,
      data: data.material_features
    });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseFeatures = async (req, res, next) => {
  try {
    const data = await featureEngineeringService.generateAllFeatures();
    res.status(200).json({
      status: 'success',
      metadata: data.metadata,
      data: {
        rack_features: data.rack_features,
        warehouse_features: data.warehouse_features
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFeatureCatalog = async (req, res, next) => {
  try {
    const catalog = [
      { id: 'daily_consumption', name: 'Daily Consumption', unit: 'Material Unit', version: 'v1.0.0', formula: 'SUM(outward_qty 24h)', consumed_by: ['Prediction Engine', 'Dashboard', 'Reports'] },
      { id: 'weekly_consumption', name: 'Weekly Consumption', unit: 'Material Unit', version: 'v1.0.0', formula: 'SUM(outward_qty 7d)', consumed_by: ['Prediction Engine', 'Dashboard', 'Reports'] },
      { id: 'monthly_consumption', name: 'Monthly Consumption', unit: 'Material Unit', version: 'v1.0.0', formula: 'SUM(outward_qty 30d)', consumed_by: ['Prediction Engine', 'Dashboard', 'Reports'] },
      { id: 'inventory_turnover', name: 'Inventory Turnover', unit: 'Ratio', version: 'v1.0.0', formula: 'Monthly Outward Volume / Current Stock Level', consumed_by: ['Reports', 'Dashboard', 'Prediction Engine'] },
      { id: 'rack_occupancy', name: 'Rack Occupancy', unit: '%', version: 'v1.0.0', formula: '(Current Capacity / Max Capacity) * 100', consumed_by: ['Digital Twin', 'Dashboard', 'Prediction Engine'] },
      { id: 'movement_frequency', name: 'Movement Frequency', unit: 'Event Count', version: 'v1.0.0', formula: 'COUNT(Transactions + Scans in 24h/7d/30d)', consumed_by: ['Prediction Engine', 'Dashboard', 'Digital Twin'] },
      { id: 'average_scan_time', name: 'Average Scan Time', unit: 'Seconds', version: 'v1.0.0', formula: 'AVG(Consecutive Scanner Timestamp Deltas)', consumed_by: ['Dashboard', 'Reports'] },
      { id: 'material_activity_score', name: 'Material Activity Score', unit: 'Score (0-100)', version: 'v1.0.0', formula: 'Weighted Composite(Freq 30d, Freq 7d, Turnover)', consumed_by: ['Prediction Engine', 'Dashboard'] },
      { id: 'warehouse_utilization', name: 'Warehouse Utilization', unit: '%', version: 'v1.0.0', formula: '(Total Occupied Space / Total Capacity) * 100', consumed_by: ['Digital Twin', 'Dashboard', 'Reports'] },
      { id: 'threshold_distance', name: 'Threshold Distance', unit: 'Material Unit / %', version: 'v1.0.0', formula: 'Current Stock - Threshold Limit', consumed_by: ['Prediction Engine', 'Dashboard', 'Reports'] }
    ];

    res.status(200).json({
      status: 'success',
      metadata: featureEngineeringService.getMetadata(),
      data: catalog
    });
  } catch (error) {
    next(error);
  }
};
