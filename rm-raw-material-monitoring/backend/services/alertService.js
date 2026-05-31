const Alert = require('../models/alertModel');
const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');

const checkAndGenerateAlert = async (material) => {
  if (parseFloat(material.quantity) <= parseFloat(material.threshold_limit)) {
    const message = `Raw material stock is below minimum threshold.`;
    
    // Save to database
    const alertId = await Alert.createAlert(material.id, message);
    
    // If a new alert was created, send an email
    if (alertId) {
      try {
        // Fetch all managers, engineers, and workers to notify
        const [users] = await db.query('SELECT email FROM users WHERE role IN ("manager", "engineer", "worker")');
        const recipients = users.map(u => u.email).join(', ');

        // HTML Email Template
        const htmlTemplate = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; max-width: 600px;">
            <h2 style="color: #d9534f;">⚠️ Low Stock Alert</h2>
            <p><strong>${message}</strong></p>
            <hr>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px;"><strong>Material Name:</strong> ${material.material_name}</li>
              <li style="margin-bottom: 10px;"><strong>Current Quantity:</strong> <span style="color: #d9534f; font-weight: bold; font-size: 16px;">${material.quantity} ${material.unit}</span></li>
              <li style="margin-bottom: 10px;"><strong>Threshold Limit:</strong> ${material.threshold_limit} ${material.unit}</li>
              <li style="margin-bottom: 10px;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <br>
            <p style="font-size: 12px; color: #777;">This is an automated message from your RM Monitoring System. Please restock immediately to avoid production delays.</p>
          </div>
        `;

        await sendEmail({
          email: recipients, // Sends to all matching roles dynamically
          subject: `⚠️ URGENT: Low Stock Alert - ${material.material_name}`,
          html: htmlTemplate
        });
        
        console.log(`[ALERT] Generated and emailed for ${material.material_name} to ${users.length} staff members.`);
      } catch (err) {
        console.error('Failed to send alert email', err);
      }
    }
  } else {
    // If stock is above threshold, auto-resolve any active alerts
    await db.query(
      'UPDATE alerts SET is_resolved = TRUE WHERE material_id = ? AND is_resolved = FALSE',
      [material.id]
    );
  }
};

module.exports = {
  checkAndGenerateAlert
};
