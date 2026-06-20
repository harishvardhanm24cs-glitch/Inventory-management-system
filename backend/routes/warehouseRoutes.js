import express from 'express';
import { getWarehouseStats } from '../controllers/warehouseController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/warehouse/stats
router.get('/stats', getWarehouseStats);

export default router;
