const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(authorize('manager', 'engineer'), getAlerts);

router.route('/:id/resolve')
  .put(authorize('manager'), resolveAlert);

module.exports = router;
