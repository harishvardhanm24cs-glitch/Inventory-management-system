const express = require('express');
const router = express.Router();
const { getTransactions } = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(authorize('manager', 'engineer'), getTransactions);

module.exports = router;
