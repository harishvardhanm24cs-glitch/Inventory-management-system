import express from 'express';
import { getRecentMovements, createMovement } from '../controllers/movementController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/movements/recent - Fetch latest 20 movements
router.get('/recent', getRecentMovements);

// POST /api/movements - Record new warehouse movement
router.post('/', protect, anyRole, createMovement);

export default router;
