import express from 'express';
import {
  getAllRacks,
  getRackById,
  createRack,
  updateRack,
  deleteRack
} from '../controllers/rackController.js';
import { protect, managerOnly, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all racks
router.get('/', protect, anyRole, getAllRacks);

// Get a single rack by ID
router.get('/:id', protect, anyRole, getRackById);

// Create new rack
router.post('/', protect, managerOnly, createRack);

// Update rack
router.put('/:id', protect, managerOnly, updateRack);

// Delete rack
router.delete('/:id', protect, managerOnly, deleteRack);

export default router;
