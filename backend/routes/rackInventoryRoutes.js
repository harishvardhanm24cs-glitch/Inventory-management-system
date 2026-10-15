import express from 'express';
import { getRackInventory, updateRackInventory } from '../controllers/rackInventoryController.js';
import { protect, anyRole, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, anyRole, getRackInventory);

router.put('/:rackCode', protect, managerOnly, updateRackInventory);

export default router;
