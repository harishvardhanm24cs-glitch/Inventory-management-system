import express from 'express';
import { autoStore, outwardScan } from '../controllers/scannerController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/auto-store', protect, anyRole, autoStore);

router.post('/outward', protect, anyRole, outwardScan);

export default router;
