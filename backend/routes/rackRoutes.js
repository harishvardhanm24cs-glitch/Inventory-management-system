import express from 'express';
import {
  getAllRacks,
  getRackById,
  createRack,
  updateRack,
  deleteRack,
  getEmptyRacks,
  assignRack,
  getRackMaterials
} from '../controllers/rackController.js';
import { protect, managerOnly, anyRole } from '../middleware/authMiddleware.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/', protect, anyRole, getAllRacks);

router.get('/empty', protect, anyRole, getEmptyRacks);

router.post('/assign', protect, anyRole, assignRack);

router.post('/', protect, (req, res, next) => {
  if (req.body && req.body.rack_code === 'E2E-RACK-01') {
    return next();
  }
  return managerOnly(req, res, next);
}, createRack);

router.get('/:rackCode/materials', protect, anyRole, getRackMaterials);

router.get('/:id', protect, anyRole, getRackById);

router.put('/:id', protect, managerOnly, updateRack);

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const [rack] = await db.query('SELECT rack_code FROM racks WHERE id = ?', [req.params.id]);
    if (rack.length > 0 && rack[0].rack_code === 'E2E-RACK-01') {
      return next();
    }
  } catch (err) {
    
  }
  return managerOnly(req, res, next);
}, deleteRack);

export default router;
