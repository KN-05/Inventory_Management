// utils/sendEmail.js
// PHASE 26: first real email-sending utility in this project - every
// earlier flow that mentioned email (see authController.js's
// forgotPassword) only ever console.log'd a dev link instead of actually
// sending anything. This uses Gmail's SMTP via nodemailer.
//
// REQUIRES two environment variables in server/.env:
//   EMAIL_USER          - the Gmail address emails are sent FROM
//   EMAIL_APP_PASSWORD  - a 16-character Gmail "App Password" (NOT the
//                          normal Gmail login password - Gmail blocks
//                          plain-password SMTP logins). Generate one at:
//                          https://myaccount.google.com/apppasswords
//                          (requires 2-Step Verification to be turned on
//                          for that Gmail account first).
//
// If those env vars are missing, sendEmail() logs a clear warning and
// still throws, so a misconfiguration fails loudly in server logs
// instead of silently pretending an email was sent.

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error(
      'Email is not configured - set EMAIL_USER and EMAIL_APP_PASSWORD in server/.env (see utils/sendEmail.js for how to generate a Gmail App Password)'
    );
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

// @param  to       recipient email address
// @param  subject  email subject line
// @param  text     plain-text body
async function sendEmail(to, subject, text) {
  const t = getTransporter();
  await t.sendMail({
    from: `"Inventory Manager" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;
