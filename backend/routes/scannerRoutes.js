import express from 'express';
import { autoStore } from '../controllers/scannerController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auto store scanned QR material data
router.post('/auto-store', protect, anyRole, autoStore);

export default router;
