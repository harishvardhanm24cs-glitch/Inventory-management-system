import express from 'express';
import { getWarehouseStats } from '../controllers/warehouseController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', getWarehouseStats);

export default router;
