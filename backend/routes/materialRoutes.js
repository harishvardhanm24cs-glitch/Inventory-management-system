import express from 'express';
import {
  getAllMaterials,
  getMaterialByBarcode,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  adjustStock,
  searchMaterials,
  getMaterialPredictions,
  getConsumptionAnalytics
} from '../controllers/materialController.js';
import { protect, managerOnly, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllMaterials);

router.get('/consumption-analytics', protect, anyRole, getConsumptionAnalytics);

router.get('/predictions', protect, anyRole, getMaterialPredictions);

router.get('/search', protect, anyRole, searchMaterials);

router.get('/:barcode', protect, anyRole, getMaterialByBarcode);

router.post('/', protect, managerOnly, createMaterial);

router.put('/:id', protect, managerOnly, updateMaterial);

router.delete('/:id', protect, managerOnly, async (req, res, next) => {
  console.log("DELETE USER:", req.user);
  console.log("DELETE ROLE:", req.user.role);
  
  return deleteMaterial(req, res, next);
});

router.post('/:id/stock', protect, anyRole, adjustStock);

export default router;
