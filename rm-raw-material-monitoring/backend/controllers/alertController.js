const asyncHandler = require('express-async-handler');
const Alert = require('../models/alertModel');

// @desc    Get all active unresolved alerts
// @route   GET /api/alerts
// @access  Private (Manager & Engineer)
const getAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.getActiveAlerts();
  
  res.status(200).json({
    success: true,
    count: alerts.length,
    data: alerts
  });
});

// @desc    Manually mark an alert as resolved
// @route   PUT /api/alerts/:id/resolve
// @access  Private (Manager)
const resolveAlert = asyncHandler(async (req, res) => {
  const affected = await Alert.resolveAlert(req.params.id);

  if (affected === 0) {
    res.status(404);
    throw new Error('Alert not found or already resolved');
  }

  res.status(200).json({
    success: true,
    message: 'Alert resolved successfully'
  });
});

module.exports = {
  getAlerts,
  resolveAlert
};
