const asyncHandler = require('express-async-handler');
const Alert = require('../models/alertModel');

const getAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.getActiveAlerts();
  
  res.status(200).json({
    success: true,
    count: alerts.length,
    data: alerts
  });
});

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
