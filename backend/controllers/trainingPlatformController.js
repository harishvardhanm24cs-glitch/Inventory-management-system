import trainingPlatformService from '../services/trainingPlatformService.js';

export const getPlatformOverview = async (req, res, next) => {
  try {
    const overview = trainingPlatformService.getOverview();
    res.status(200).json({
      status: 'success',
      data: overview
    });
  } catch (error) {
    next(error);
  }
};

export const generateDataset = async (req, res, next) => {
  try {
    const datasetName = req.body?.dataset_name || 'warehouse_ml_dataset';
    const splitRatio = req.body?.split_ratio || { train: 0.8, val: 0.1, test: 0.1 };

    const dataset = await trainingPlatformService.generateTrainingDataset(datasetName, splitRatio);
    res.status(200).json({
      status: 'success',
      message: `Training dataset '${datasetName}' generated successfully with 80/10/10 split.`,
      data: dataset
    });
  } catch (error) {
    next(error);
  }
};

export const configureTraining = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const config = trainingPlatformService.saveTrainingConfig(payload);
    res.status(200).json({
      status: 'success',
      message: `Hyperparameter config '${config.name}' saved successfully.`,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

export const simulateRun = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const run = trainingPlatformService.registerTrainingRun(payload);
    res.status(201).json({
      status: 'success',
      message: `Training run '${run.run_id}' registered successfully.`,
      data: run
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const overview = trainingPlatformService.getOverview();
    res.status(200).json({
      status: 'success',
      results: overview.recent_runs.length,
      data: overview.recent_runs
    });
  } catch (error) {
    next(error);
  }
};

export const getEvaluations = async (req, res, next) => {
  try {
    const evaluations = trainingPlatformService.getModelEvaluations();
    res.status(200).json({
      status: 'success',
      results: evaluations.length,
      data: evaluations
    });
  } catch (error) {
    next(error);
  }
};

export const deployModel = async (req, res, next) => {
  try {
    const { model_id } = req.body || {};
    if (!model_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameter: model_id.'
      });
    }

    const result = trainingPlatformService.deployModel(model_id);
    res.status(200).json({
      status: 'success',
      message: `Model '${model_id}' deployed to PRODUCTION successfully.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const rollbackModel = async (req, res, next) => {
  try {
    const result = trainingPlatformService.rollbackActiveModel();
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
