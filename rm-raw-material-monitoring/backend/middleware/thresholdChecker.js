const { checkAndGenerateAlert } = require('../services/alertService');

const thresholdChecker = (req, res, next) => {
  // Capture the original res.json function
  const originalJson = res.json;

  res.json = function (data) {
    // Check if the response contains updated material data
    // We expect { success: true, data: { material object... } }
    if (data && data.success && data.data && data.data.threshold_limit !== undefined) {
       // It's a material object! Run the alert service asynchronously
       checkAndGenerateAlert(data.data).catch(err => console.error(err));
    }
    // Call the original res.json
    originalJson.call(this, data);
  };
  
  next();
};

module.exports = thresholdChecker;
