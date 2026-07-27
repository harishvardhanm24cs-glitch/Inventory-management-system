import express from 'express';
import { getDashboardStats, getWarehouseAnalytics } from '../controllers/dashboardController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', protect, anyRole, getDashboardStats);

// GET /api/dashboard/analytics
router.get('/analytics', protect, anyRole, getWarehouseAnalytics);

export default router;

