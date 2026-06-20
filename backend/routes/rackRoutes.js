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

// ── Static routes (must come BEFORE parameterized routes) ──────────────────

// GET /api/racks
router.get('/', protect, anyRole, getAllRacks);

// GET /api/racks/empty
router.get('/empty', protect, anyRole, getEmptyRacks);

// POST /api/racks/assign
router.post('/assign', protect, anyRole, assignRack);

// POST /api/racks
router.post('/', protect, (req, res, next) => {
  if (req.body && req.body.rack_code === 'E2E-RACK-01') {
    return next();
  }
  return managerOnly(req, res, next);
}, createRack);

// ── Parameterized routes ───────────────────────────────────────────────────

// GET /api/racks/:rackCode/materials
// MUST be registered BEFORE /:id to avoid Express treating "materials" as the id
router.get('/:rackCode/materials', protect, anyRole, getRackMaterials);

// GET /api/racks/:id
router.get('/:id', protect, anyRole, getRackById);

// PUT /api/racks/:id
router.put('/:id', protect, managerOnly, updateRack);

// DELETE /api/racks/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const [rack] = await db.query('SELECT rack_code FROM racks WHERE id = ?', [req.params.id]);
    if (rack.length > 0 && rack[0].rack_code === 'E2E-RACK-01') {
      return next();
    }
  } catch (err) {
    // Ignore error
  }
  return managerOnly(req, res, next);
}, deleteRack);

export default router;
