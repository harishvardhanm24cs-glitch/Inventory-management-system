import express from 'express';
import { locateMaterials } from '../controllers/materialLocatorController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/material-locator - Search and locate materials across racks
router.get('/', protect, anyRole, locateMaterials);

export default router;
