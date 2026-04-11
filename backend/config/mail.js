const nodemailer = require("nodemailer");

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendPasswordResetOtp(email, otp) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error("Email service is not configured");
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({
    from,
    to: email,
    subject: "Esuchi — OTP code",
    text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
    html: `<p>Your password reset code is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
  });
}

module.exports = { getTransporter, sendPasswordResetOtp };
