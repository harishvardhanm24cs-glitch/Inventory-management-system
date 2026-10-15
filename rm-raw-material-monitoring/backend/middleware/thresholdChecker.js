const { checkAndGenerateAlert } = require('../services/alertService');

const thresholdChecker = (req, res, next) => {
  
  const originalJson = res.json;

  res.json = function (data) {
    
    
    if (data && data.success && data.data && data.data.threshold_limit !== undefined) {
       
       checkAndGenerateAlert(data.data).catch(err => console.error(err));
    }
    
    originalJson.call(this, data);
  };
  
  next();
};

module.exports = thresholdChecker;
