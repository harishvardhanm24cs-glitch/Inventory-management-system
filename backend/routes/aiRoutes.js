import express from 'express';
import { 
  getAiPredictions, 
  getAiRecommendations, 
  getRackOptimizations, 
  getAiAlertPrioritization,
  getReorderRecommendations,
  getRiskAnalysis
} from '../controllers/aiController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get AI stock prediction insights
// GET /api/ai/predictions
router.get('/predictions', protect, anyRole, getAiPredictions);

// Get AI reorder recommendations
// GET /api/ai/reorder-recommendations
router.get('/reorder-recommendations', protect, anyRole, getReorderRecommendations);

// Get AI risk analysis
// GET /api/ai/risk-analysis
router.get('/risk-analysis', protect, anyRole, getRiskAnalysis);

// Get AI recommendations
// GET /api/ai/recommendations
router.get('/recommendations', protect, anyRole, getAiRecommendations);

// Get AI rack capacity optimizations
// GET /api/ai/rack-optimization
router.get('/rack-optimization', getRackOptimizations);

// Get AI alert prioritization
// GET /api/ai/alert-prioritization
router.get('/alert-prioritization', protect, anyRole, getAiAlertPrioritization);

export default router;
