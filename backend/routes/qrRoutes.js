import express from 'express';
import { generateQR } from '../controllers/qrController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate QR Code and register material
router.post('/', protect, anyRole, generateQR);

export default router;
