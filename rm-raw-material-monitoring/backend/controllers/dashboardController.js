const asyncHandler = require('express-async-handler');
const Dashboard = require('../models/dashboardModel');
const Alert = require('../models/alertModel'); 

// @desc    Get top-level KPIs and Stats
// @route   GET /api/dashboard/stats
// @access  Private (Manager & Engineer)
const getStats = asyncHandler(async (req, res) => {
  const stats = await Dashboard.getOverviewStats();
  res.status(200).json({ success: true, data: stats });
});

// @desc    Get chart data (Trends & Top consumed)
// @route   GET /api/dashboard/charts
// @access  Private (Manager & Engineer)
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

// @desc    Get recent alerts for dashboard widget
// @route   GET /api/dashboard/alerts
// @access  Private (Manager & Engineer)
const getDashboardAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.getActiveAlerts();
  // Return only top 5 recent alerts for the dashboard widget view
  res.status(200).json({ success: true, data: alerts.slice(0, 5) });
});

module.exports = {
  getStats,
  getCharts,
  getDashboardAlerts
};
