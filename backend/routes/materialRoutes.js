import express from 'express';
import {
  getAllMaterials,
  getMaterialByBarcode,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  adjustStock,
  searchMaterials,
  getMaterialPredictions
} from '../controllers/materialController.js';
import { protect, managerOnly, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all materials
// GET /api/materials
router.get('/', getAllMaterials);

// Get AI stock predictions
// GET /api/materials/predictions
router.get('/predictions', protect, anyRole, getMaterialPredictions);

// Search materials
// GET /api/materials/search
router.get('/search', protect, anyRole, searchMaterials);

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
router.delete('/:id', protect, managerOnly, async (req, res, next) => {
  console.log("DELETE USER:", req.user);
  console.log("DELETE ROLE:", req.user.role);
  // Forward to controller
  return deleteMaterial(req, res, next);
});

// Adjust stock quantity (Inward/Outward transaction log)
// POST /api/materials/:id/stock
router.post('/:id/stock', protect, anyRole, adjustStock);

export default router;
