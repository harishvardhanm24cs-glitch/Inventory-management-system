import modelManager from '../services/modelManager.js';

/**
 * modelController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller layer exposing AI Model Management endpoints.
 */

export const getModels = async (req, res, next) => {
  try {
    const models = modelManager.listAllModels();
    res.status(200).json({
      status: 'success',
      active_model_id: modelManager.activeModelId,
      results: models.length,
      data: models
    });
  } catch (error) {
    next(error);
  }
};

export const registerModel = async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.framework) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: name and framework.'
      });
    }

    const registered = modelManager.registerNewModel(payload);
    res.status(201).json({
      status: 'success',
      message: `Model '${registered.name}' registered successfully.`,
      data: registered
    });
  } catch (error) {
    next(error);
  }
};

export const switchModel = async (req, res, next) => {
  try {
    const { model_id } = req.body || {};
    if (!model_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameter: model_id.'
      });
    }

    const result = modelManager.switchActiveModel(model_id);
    const activeMetadata = modelManager.getModelMetadata(result.activeModelId);

    res.status(200).json({
      status: 'success',
      message: result.fallback ? `Model '${model_id}' not found. Falling back to default.` : `Switched active AI Model to '${model_id}'.`,
      data: activeMetadata
    });
  } catch (error) {
    next(error);
  }
};

export const loadModel = async (req, res, next) => {
  try {
    const { model_id } = req.body || {};
    const targetId = model_id || modelManager.activeModelId;
    const adapter = modelManager.registry.get(targetId);

    if (!adapter) {
      return res.status(404).json({
        status: 'error',
        message: `Model '${targetId}' not found in registry.`
      });
    }

    await adapter.loadModel();
    const meta = modelManager.getModelMetadata(targetId);

    res.status(200).json({
      status: 'success',
      message: `Model '${targetId}' loaded into memory successfully.`,
      data: meta
    });
  } catch (error) {
    next(error);
  }
};

export const getModelPerformance = async (req, res, next) => {
  try {
    const perfData = modelManager.getPerformanceAnalytics();
    res.status(200).json({
      status: 'success',
      data: perfData
    });
  } catch (error) {
    next(error);
  }
};
