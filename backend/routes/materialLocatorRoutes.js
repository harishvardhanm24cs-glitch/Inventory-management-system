import express from 'express';
import { locateMaterials } from '../controllers/materialLocatorController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, anyRole, locateMaterials);

export default router;
