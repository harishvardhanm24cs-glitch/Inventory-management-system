import express from 'express';
import { getDigitalTwinData } from '../controllers/digitalTwinController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/digital-twin - Fetch real-time digital twin layout and inventory
router.get('/', protect, anyRole, getDigitalTwinData);

export default router;
