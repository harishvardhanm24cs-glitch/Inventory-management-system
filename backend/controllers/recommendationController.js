import recommendationEngineService, { recommendationRegistry } from '../services/recommendationEngineService.js';

/**
 * recommendationController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Module 5: AI Recommendation Engine Controller
 */

export const getRecommendationsEngine = async (req, res, next) => {
  try {
    const data = await recommendationEngineService.generateRecommendations();
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendationsByCategory = async (req, res, next) => {
  try {
    const categoryParam = String(req.params.category || '').toUpperCase();
    const data = await recommendationEngineService.generateRecommendations();

    const filtered = (data.recommendations || []).filter(
      r => String(r.category || '').toUpperCase() === categoryParam
    );

    res.status(200).json({
      status: 'success',
      category: categoryParam,
      results: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
};

export const switchRecommendationStrategy = async (req, res, next) => {
  try {
    const { strategy_name } = req.body || {};
    if (!strategy_name) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameter: strategy_name.'
      });
    }

    const success = recommendationRegistry.setActiveStrategy(strategy_name);
    const activeStrategy = recommendationRegistry.getActiveStrategy();

    res.status(200).json({
      status: 'success',
      message: success ? `Switched active recommendation strategy to '${strategy_name}'.` : `Strategy '${strategy_name}' not found. Default strategy active.`,
      active_strategy: activeStrategy.name
    });
  } catch (error) {
    next(error);
  }
};
