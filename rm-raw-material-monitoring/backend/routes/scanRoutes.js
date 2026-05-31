const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { scanInward, scanOutward } = require('../controllers/scanController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

const scanValidation = [
  check('barcode', 'Barcode is required').not().isEmpty(),
  check('quantity', 'Quantity must be a valid number greater than 0').isFloat({ gt: 0 })
];

// POST /api/scan/inward
router.post('/inward', authorize('manager', 'engineer', 'worker'), scanValidation, scanInward);

// POST /api/scan/outward
router.post('/outward', authorize('manager', 'engineer', 'worker'), scanValidation, scanOutward);

module.exports = router;
