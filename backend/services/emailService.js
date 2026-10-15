import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('[Email Service] SMTP Connection Verification Failed:', error);
  } else {
    console.log('[Email Service] SMTP Connection Verified Successfully.');
  }
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
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER or EMAIL_PASS environment variables are missing');
    }

    
    const mailOptions = {
      from: `"RM Alert System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    
    const info = await transporter.sendMail(mailOptions);
    
    
    console.log(`[Email Service] Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    
    console.error(`[Email Service] Email failed to send to ${to}:`, error);
    
    return {
      success: false,
      error: error.message || String(error),
    };
  }
};

