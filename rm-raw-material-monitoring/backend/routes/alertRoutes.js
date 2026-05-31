const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/alerts - Fetch all active low-stock alerts
router.route('/')
  .get(authorize('manager', 'engineer'), getAlerts);

// PUT /api/alerts/:id/resolve - Manually resolve an alert
router.route('/:id/resolve')
  .put(authorize('manager'), resolveAlert);

module.exports = router;
