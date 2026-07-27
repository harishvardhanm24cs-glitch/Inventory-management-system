import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dataCleaningPipelineService from '../services/dataCleaningPipelineService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlDatasetsDir = path.join(__dirname, '..', 'ml_datasets');

export const runCleaningPipeline = async (req, res, next) => {
  try {
    const result = await dataCleaningPipelineService.runCleaningPipeline(req.body || {});
    res.status(200).json({
      status: 'success',
      message: 'ML Data Cleaning Pipeline executed successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getCleaningReport = async (req, res, next) => {
  try {
    const jsonPath = path.join(mlDatasetsDir, 'clean_warehouse_dataset.json');
    if (!fs.existsSync(jsonPath)) {
      // Run pipeline if clean dataset does not exist yet
      const result = await dataCleaningPipelineService.runCleaningPipeline({});
      return res.status(200).json({
        status: 'success',
        data: result.report
      });
    }

    const content = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(content);
    res.status(200).json({
      status: 'success',
      data: parsed.cleaning_report || null
    });
  } catch (error) {
    next(error);
  }
};

export const downloadCleanDataset = async (req, res, next) => {
  try {
    const format = (req.params.format || 'csv').toLowerCase();
    const ext = format === 'json' ? 'json' : 'csv';
    const filename = `clean_warehouse_dataset.${ext}`;
    const filePath = path.join(mlDatasetsDir, filename);

    if (!fs.existsSync(filePath)) {
      // Run pipeline if clean dataset does not exist yet
      await dataCleaningPipelineService.runCleaningPipeline({});
    }

    res.download(filePath, filename);
  } catch (error) {
    next(error);
  }
};
