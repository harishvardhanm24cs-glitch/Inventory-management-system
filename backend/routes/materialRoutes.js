import express from 'express';
import {
  getAllMaterials,
  getMaterialByBarcode,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  adjustStock
} from '../controllers/materialController.js';
import { protect, managerOnly, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all materials
// GET /api/materials
router.get('/', protect, anyRole, getAllMaterials);

// Get single material by barcode
// GET /api/materials/:barcode
router.get('/:barcode', protect, anyRole, getMaterialByBarcode);

// Create new material
// POST /api/materials
router.post('/', protect, managerOnly, createMaterial);

// Update material details (except quantity)
// PUT /api/materials/:id
router.put('/:id', protect, managerOnly, updateMaterial);

// Delete material
// DELETE /api/materials/:id
router.delete('/:id', protect, managerOnly, deleteMaterial);

// Adjust stock quantity (Inward/Outward transaction log)
// POST /api/materials/:id/stock
router.post('/:id/stock', protect, anyRole, adjustStock);

export default router;
