const express = require('express');
const router = express.Router();
const {
  getAllRackInventory,
  getRackByCode,
  updateRackCapacity
} = require('../controllers/rackInventoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAllRackInventory);

router.get('/:rackCode', getRackByCode);

router.put('/:rackCode', updateRackCapacity);

module.exports = router;
