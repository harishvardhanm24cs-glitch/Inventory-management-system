import express from 'express';
import { getRecentMovements, createMovement } from '../controllers/movementController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/recent', getRecentMovements);

router.post('/', protect, anyRole, createMovement);

export default router;
