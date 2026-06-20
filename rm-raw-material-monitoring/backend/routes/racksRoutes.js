const express = require('express');
const router = express.Router();
const { getRackMaterials } = require('../controllers/rackMaterialsController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// GET /api/racks/:rackCode/materials
router.get('/:rackCode/materials', getRackMaterials);

module.exports = router;
