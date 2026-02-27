import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify transporter
async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log("✅ Email server is ready to send messages");
  } catch (error) {
    console.error("❌ Error connecting to email server:", error.message);
  }
}

verifyTransporter();

export const sendEmail = async (to, subject, text = "", html = "") => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent:", info.messageId);

    return info;

  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
};

export async function sendWelcomeEmail(userEmail, name) {
  const subject = "Welcome to Backend Ledger 🎉";

  const text = `Hello ${name},

Welcome to Backend Ledger!

We're excited to have you on board. You can now start managing your backend projects easily.

Best regards,
Backend Ledger Team
`;

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px 0;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; padding:30px; box-shadow:0 2px 6px rgba(0,0,0,0.05);">
      
      <h2 style="color:#333; margin-top:0;">Welcome to Backend Ledger 🎉</h2>

      <p style="font-size:16px; color:#555;">
        Hello <strong>${name}</strong>,
      </p>

      <p style="font-size:16px; color:#555;">
        Thank you for signing up for <strong>Backend Ledger</strong>. 
        We're excited to have you join our platform.
      </p>

      <p style="font-size:16px; color:#555;">
        You can now start managing and tracking your backend projects efficiently.
      </p>

      <div style="text-align:center; margin:30px 0;">
        <a href="#"
           style="background:#2563eb; color:#ffffff; padding:12px 22px; text-decoration:none; border-radius:6px; font-size:15px; display:inline-block;">
           Get Started
        </a>
      </div>

      <p style="font-size:14px; color:#777;">
        If you have any questions, feel free to reply to this email.
      </p>

      <hr style="border:none; border-top:1px solid #eee; margin:25px 0;">

      <p style="font-size:13px; color:#999; text-align:center;">
        © ${new Date().getFullYear()} Backend Ledger. All rights reserved.
      </p>

    </div>
  </div>
  `;

  await sendEmail(userEmail, subject, text, html);
}