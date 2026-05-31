const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter configured for Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // MUST be a 16-digit Google App Password
    },
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.EMAIL_USER}>`,
    to: options.email, // Can be a single email or a comma-separated list
    subject: options.subject,
    html: options.html, // Supports HTML templates
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
