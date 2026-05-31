const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  getMaterials,
  getMaterial,
  addMaterial,
  updateMaterial,
  deleteMaterial
} = require('../controllers/materialController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getMaterials)
  .post(
    authorize('manager', 'engineer'),
    [
      check('barcode', 'Barcode is required').not().isEmpty(),
      check('material_name', 'Material name is required').not().isEmpty(),
      check('quantity', 'Quantity must be a valid number').isNumeric()
    ],
    addMaterial
  );

// Specific barcode fetching
router.route('/:barcode').get(getMaterial);

// ID based operations for updates and deletes
router.route('/:id')
  .put(authorize('manager', 'engineer'), updateMaterial)
  .delete(authorize('manager'), deleteMaterial);

module.exports = router;
