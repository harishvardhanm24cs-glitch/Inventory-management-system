import aiMonitoringService from '../services/aiMonitoringService.js';

/**
 * aiMonitoringController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 7: AI Monitoring System Controller Layer
 */

export const getAiHealth = async (req, res, next) => {
  try {
    const healthSummary = await aiMonitoringService.getAiHealthSummary();
    res.status(200).json({
      status: 'success',
      data: healthSummary
    });
  } catch (error) {
    next(error);
  }
};

export const getAiMetrics = async (req, res, next) => {
  try {
    const healthSummary = await aiMonitoringService.getAiHealthSummary();
    res.status(200).json({
      status: 'success',
      data: healthSummary.metrics
    });
  } catch (error) {
    next(error);
  }
};

export const resetAiMetrics = async (req, res, next) => {
  try {
    const result = aiMonitoringService.resetMetrics();
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};
