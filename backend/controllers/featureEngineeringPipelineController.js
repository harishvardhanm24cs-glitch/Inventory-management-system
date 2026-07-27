import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import featureEngineeringPipelineService from '../services/featureEngineeringPipelineService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlDatasetsDir = path.join(__dirname, '..', 'ml_datasets');

export const runFeaturePipeline = async (req, res, next) => {
  try {
    const result = await featureEngineeringPipelineService.runFeaturePipeline(req.body || {});
    res.status(200).json({
      status: 'success',
      message: 'Feature Engineering Pipeline executed successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getFeatureMetadata = async (req, res, next) => {
  try {
    const metaPath = path.join(mlDatasetsDir, 'feature_metadata.json');
    if (!fs.existsSync(metaPath)) {
      const result = await featureEngineeringPipelineService.runFeaturePipeline({});
      return res.status(200).json({ status: 'success', data: result.metadata });
    }

    const content = fs.readFileSync(metaPath, 'utf8');
    res.status(200).json({ status: 'success', data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
};

export const getFeatureStatistics = async (req, res, next) => {
  try {
    const statsPath = path.join(mlDatasetsDir, 'feature_statistics.json');
    if (!fs.existsSync(statsPath)) {
      const result = await featureEngineeringPipelineService.runFeaturePipeline({});
      return res.status(200).json({ status: 'success', data: result.statistics });
    }

    const content = fs.readFileSync(statsPath, 'utf8');
    res.status(200).json({ status: 'success', data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
};

export const downloadFeatureDataset = async (req, res, next) => {
  try {
    const format = (req.params.format || 'csv').toLowerCase();
    const ext = format === 'json' ? 'json' : 'csv';
    const filename = `feature_dataset.${ext}`;
    const filePath = path.join(mlDatasetsDir, filename);

    if (!fs.existsSync(filePath)) {
      await featureEngineeringPipelineService.runFeaturePipeline({});
    }

    res.download(filePath, filename);
  } catch (error) {
    next(error);
  }
};

export const getFeatureRegistry = async (req, res, next) => {
  try {
    const registryPath = path.join(mlDatasetsDir, 'feature_registry.json');
    if (!fs.existsSync(registryPath)) {
      await featureEngineeringPipelineService.runFeaturePipeline({});
    }

    const content = fs.readFileSync(registryPath, 'utf8');
    res.status(200).json({ status: 'success', data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
};

export const getFeatureImportanceTemplate = async (req, res, next) => {
  try {
    const filePath = path.join(mlDatasetsDir, 'feature_importance_template.json');
    if (!fs.existsSync(filePath)) {
      await featureEngineeringPipelineService.runFeaturePipeline({});
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).json({ status: 'success', data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
};

export const getPreprocessingConfig = async (req, res, next) => {
  try {
    const filePath = path.join(mlDatasetsDir, 'preprocessing_config.json');
    if (!fs.existsSync(filePath)) {
      await featureEngineeringPipelineService.runFeaturePipeline({});
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).json({ status: 'success', data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
};

export const getFeaturePipelineDoc = async (req, res, next) => {
  try {
    const filePath = path.join(mlDatasetsDir, 'feature_pipeline.json');
    if (!fs.existsSync(filePath)) {
      await featureEngineeringPipelineService.runFeaturePipeline({});
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).json({ status: 'success', data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
};

export const getModelRegistry = async (req, res, next) => {
  try {
    const filePath = path.join(mlDatasetsDir, 'model_registry.json');
    if (!fs.existsSync(filePath)) {
      await featureEngineeringPipelineService.runFeaturePipeline({});
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).json({ status: 'success', data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
};
