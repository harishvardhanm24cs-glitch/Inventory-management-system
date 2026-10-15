const asyncHandler = require('express-async-handler');
const Dashboard = require('../models/dashboardModel');
const Alert = require('../models/alertModel'); 

const getStats = asyncHandler(async (req, res) => {
  const stats = await Dashboard.getOverviewStats();
  res.status(200).json({ success: true, data: stats });
});

const getCharts = asyncHandler(async (req, res) => {
  const trends = await Dashboard.getDailyTrends();
  const topConsumed = await Dashboard.getTopConsumed();
  
  res.status(200).json({ 
    success: true, 
    data: {
      inventory_trends: trends,
      top_consumed: topConsumed
    }
  });
});

const getDashboardAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.getActiveAlerts();
  
  res.status(200).json({ success: true, data: alerts.slice(0, 5) });
});

module.exports = {
  getStats,
  getCharts,
  getDashboardAlerts
};
