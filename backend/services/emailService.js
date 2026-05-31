import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Transporter Configuration:
 * Configures the Nodemailer SMTP transporter pointing to Gmail SMTP server.
 * Uses port 587 (with TLS) and loads credentials from .env.
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Set to true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Reusable async function to send alerts.
 * Sends email, manages connection exceptions, handles logging, and returns sending status.
 * 
 * @param {string} to - The recipient's email address
 * @param {string} subject - The subject line of the email
 * @param {string} text - The body text of the email
 * @returns {Promise<object>} Returns an object representing delivery status { success: boolean, messageId?: string, error?: string }
 */
export const sendEmail = async (to, subject, text) => {
  try {
    // Authentication check to ensure variables are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER or EMAIL_PASS environment variables are missing');
    }

    // Configure email options
    const mailOptions = {
      from: `"RM Alert System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    // Sending process
    const info = await transporter.sendMail(mailOptions);
    
    // Log success details securely (does not expose credentials)
    console.log(`[Email Service] Alert email sent successfully to ${to}. Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    // Log failure details
    console.error(`[Email Service] Failed to send email to ${to}:`, error.message);
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/*
// Example test function usage:
// (Run this to verify SMTP configurations)
const runTest = async () => {
  console.log('[Email Service] Running test alert email delivery...');
  const result = await sendEmail(
    "manager@gmail.com",
    "LOW STOCK ALERT",
    "Titanium Dioxide below threshold limit"
  );
  console.log('[Email Service] Test Alert Delivery Result:', result);
};

// Uncomment the line below to execute the test:
// runTest();
*/
