import express from 'express';
import { getDigitalTwinData } from '../controllers/digitalTwinController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, anyRole, getDigitalTwinData);

export default router;
