import express from 'express';
import { getRackInventory, updateRackInventory } from '../controllers/rackInventoryController.js';
import { protect, anyRole, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/rack-inventory - Fetch real-time rack inventory
router.get('/', protect, anyRole, getRackInventory);

// PUT /api/rack-inventory/:rackCode - Update rack capacity (for testing/admin usage)
router.put('/:rackCode', protect, managerOnly, updateRackInventory);

export default router;
