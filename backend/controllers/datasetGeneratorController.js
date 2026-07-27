import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import datasetGeneratorService from '../services/datasetGeneratorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlDatasetsDir = path.join(__dirname, '..', 'ml_datasets');

export const generateDataset = async (req, res, next) => {
  try {
    const options = {
      dataset_name: req.body?.dataset_name || 'warehouse_historical_ml_dataset',
      format: req.body?.format || 'CSV',
      version: req.body?.version
    };

    const result = await datasetGeneratorService.generateDataset(options);
    res.status(201).json({
      status: 'success',
      message: `Machine learning dataset '${result.filename}' generated successfully (${result.row_count} rows, ${result.export_format} format).`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getVersions = async (req, res, next) => {
  try {
    const versions = await datasetGeneratorService.listDatasetVersions();
    res.status(200).json({
      status: 'success',
      results: versions.length,
      data: versions
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDataset = async (req, res, next) => {
  try {
    const filename = req.params.filename;
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ status: 'error', message: 'Invalid filename' });
    }

    const filePath = path.join(mlDatasetsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: `Dataset file '${filename}' not found.` });
    }

    res.download(filePath, filename);
  } catch (error) {
    next(error);
  }
};
