import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', protect, anyRole, getDashboardStats);

export default router;
