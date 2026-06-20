const express = require('express');
const router = express.Router();
const {
  getAllRackInventory,
  getRackByCode,
  updateRackCapacity
} = require('../controllers/rackInventoryController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET /api/rack-inventory - get all racks for warehouse floor map
router.get('/', getAllRackInventory);

// GET /api/rack-inventory/:rackCode - get single rack detail
router.get('/:rackCode', getRackByCode);

// PUT /api/rack-inventory/:rackCode - update rack capacity
router.put('/:rackCode', updateRackCapacity);

module.exports = router;
