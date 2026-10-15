const express = require('express');
const router = express.Router();
const { getRackMaterials } = require('../controllers/rackMaterialsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:rackCode/materials', getRackMaterials);

module.exports = router;
