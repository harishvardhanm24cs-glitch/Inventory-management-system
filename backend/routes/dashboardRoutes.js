import express from 'express';
import { getDashboardStats, getWarehouseAnalytics } from '../controllers/dashboardController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, anyRole, getDashboardStats);

router.get('/analytics', protect, anyRole, getWarehouseAnalytics);

export default router;

