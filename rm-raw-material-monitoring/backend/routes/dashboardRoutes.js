const express = require('express');
const router = express.Router();
const { getStats, getCharts, getDashboardAlerts } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.use(authorize('manager', 'engineer'));

router.get('/stats', getStats);
router.get('/charts', getCharts);
router.get('/alerts', getDashboardAlerts);

module.exports = router;
