import xaiEngineService from '../services/xaiEngineService.js';

/**
 * xaiController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 6: Explainable AI (XAI) Controller Layer
 */

export const explainMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const explanation = await xaiEngineService.explainMaterial(id);
    res.status(200).json({
      status: 'success',
      data: explanation
    });
  } catch (error) {
    next(error);
  }
};

export const explainRack = async (req, res, next) => {
  try {
    const { code } = req.params;
    const explanation = await xaiEngineService.explainRack(code);
    res.status(200).json({
      status: 'success',
      data: explanation
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardExplanations = async (req, res, next) => {
  try {
    const data = await xaiEngineService.getDashboardExplanations();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getDigitalTwinExplanations = async (req, res, next) => {
  try {
    const data = await xaiEngineService.getDigitalTwinExplanations();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getReportsExplanations = async (req, res, next) => {
  try {
    const data = await xaiEngineService.getReportsExplanations();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getManagerPortalExplanations = async (req, res, next) => {
  try {
    const data = await xaiEngineService.getManagerPortalExplanations();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};
