import mlDataHarvester from '../services/mlDataHarvester.js';
import mlDataPreprocessor from '../services/mlDataPreprocessor.js';
import mlDatasetStorage from '../services/mlDatasetStorage.js';
import mlDatasetExporter from '../services/mlDatasetExporter.js';

/**
 * mlPipelineController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller layer exposing ML Data Pipeline management and export endpoints.
 */

export const runPipeline = async (req, res, next) => {
  try {
    const datasetName = req.body?.dataset_name || 'warehouse_ml_dataset';
    
    // 1. Harvest raw data
    const harvested = await mlDataHarvester.harvestAllWarehouseData();

    // 2. Preprocess & engineer features
    const preprocessed = mlDataPreprocessor.processHarvestedData(harvested);

    // 3. Persist dataset into isolated ML storage
    const savedInfo = await mlDatasetStorage.saveDataset(datasetName, preprocessed);

    res.status(200).json({
      status: 'success',
      message: 'ML Data Pipeline execution completed successfully.',
      data: {
        dataset_info: savedInfo,
        harvest_counts: harvested.raw_counts,
        cleaning_stats: preprocessed.cleaning_stats
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPipelineStatus = async (req, res, next) => {
  try {
    const harvested = await mlDataHarvester.harvestAllWarehouseData();
    const datasets = await mlDatasetStorage.listDatasets();

    res.status(200).json({
      status: 'success',
      data: {
        pipeline_status: 'HEALTHY',
        operational_sources: {
          inventory_records: harvested.raw_counts.inventory,
          transaction_records: harvested.raw_counts.transactions,
          scan_events: harvested.raw_counts.scan_events,
          rack_records: harvested.raw_counts.racks,
          alert_records: harvested.raw_counts.alerts
        },
        ml_dataset_layer: {
          stored_datasets_count: datasets.length,
          datasets
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDatasets = async (req, res, next) => {
  try {
    const datasets = await mlDatasetStorage.listDatasets();
    res.status(200).json({
      status: 'success',
      results: datasets.length,
      data: datasets
    });
  } catch (error) {
    next(error);
  }
};

export const exportDataset = async (req, res, next) => {
  try {
    const framework = req.params.framework || 'scikit-learn';
    
    // Fetch latest dataset or harvest & preprocess live
    let dataset = await mlDatasetStorage.getLatestDataset();
    if (!dataset) {
      const harvested = await mlDataHarvester.harvestAllWarehouseData();
      const preprocessed = mlDataPreprocessor.processHarvestedData(harvested);
      dataset = { data: preprocessed.preprocessed_features };
    }

    const exported = mlDatasetExporter.exportForFramework(framework, dataset.data ? { preprocessed_features: dataset.data } : dataset);

    res.status(200).json({
      status: 'success',
      framework,
      data: exported
    });
  } catch (error) {
    next(error);
  }
};
