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

async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log("✅ Email server ready");
  } catch (error) {
    console.error("❌ Email server error:", error.message);
  }
}

verifyTransporter();

/* =============================
   SEND EMAIL CORE FUNCTION
============================= */

export const sendEmail = async (to, subject, text = "", html = "") => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
};

/* =============================
   GLOBAL EMAIL TEMPLATE
============================= */

function emailLayout(title, content) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:40px 0;">
    
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;padding:35px;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      
      <h1 style="color:#2563eb;text-align:center;margin-bottom:20px;">
        Backend Ledger
      </h1>

      <h2 style="color:#333;margin-bottom:20px;">${title}</h2>

      ${content}

      <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">

      <p style="font-size:13px;color:#888;text-align:center;">
        © ${new Date().getFullYear()} Backend Ledger
      </p>

    </div>
  </div>
  `;
}

/* =============================
   WELCOME EMAIL
============================= */

export async function sendWelcomeEmail(email, name) {
  const subject = "Welcome to Backend Ledger 🎉";

  const html = emailLayout(
    "Welcome to Backend Ledger 🎉",
    `
    <p>Hello <strong>${name}</strong>,</p>

    <p>
      Thank you for joining <strong>Backend Ledger</strong>.
      We're excited to have you on board.
    </p>

    <div style="text-align:center;margin:30px 0;">
      <a href="#"
      style="background:#2563eb;color:#fff;padding:12px 24px;
      text-decoration:none;border-radius:6px;font-weight:bold;">
      Get Started
      </a>
    </div>

    <p>If you have any questions, feel free to reply to this email.</p>
    `
  );

  await sendEmail(email, subject, "", html);
}

/**
 * Sends a DEBIT notification to the sender and a CREDIT notification to the receiver.
 *
 * @param {object} sender   - { email, name }
 * @param {object} receiver - { email, name }
 * @param {number} amount
 * @param {string} currency - e.g. "NPR"
 */
export async function sendTransactionEmail(sender, receiver, amount, currency = "NPR") {
  if (!receiver?.email || !receiver?.name) {
    console.error("❌ sendTransactionEmail: receiver email/name missing — receiver email skipped.", receiver);
  }

  const formatted = `${currency} ${Number(amount).toFixed(2)}`;

  function transactionRow(label, value, valueColor = "#333") {
    return `
      <tr>
        <td style="padding:10px 14px;border:1px solid #eee;color:#555;width:40%;">${label}</td>
        <td style="padding:10px 14px;border:1px solid #eee;color:${valueColor};font-weight:600;">${value}</td>
      </tr>`;
  }

  function buildHtml({ name, type, counterpartyLabel, counterpartyName }) {
    const isDebit = type === "DEBIT";
    const badgeColor = isDebit ? "#dc2626" : "#16a34a";
    const badgeBg   = isDebit ? "#fef2f2" : "#f0fdf4";
    const typeLabel = isDebit ? "💸 Debited (Sent)"  : "💰 Credited (Received)";
    const title     = isDebit ? "Money Sent"         : "Money Received";
    const subtitle  = isDebit
      ? "Your transfer has been processed successfully."
      : "You have received a transfer.";

    return emailLayout(
      title,
      `
      <p>Hello <strong>${name}</strong>,</p>
      <p>${subtitle}</p>

      <div style="text-align:center;margin:20px 0;">
        <span style="
          display:inline-block;
          padding:6px 18px;
          border-radius:20px;
          background:${badgeBg};
          color:${badgeColor};
          font-weight:700;
          font-size:14px;
          letter-spacing:0.5px;
        ">${typeLabel}</span>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:10px;">
        ${transactionRow("Transaction Type", isDebit ? "DEBIT" : "CREDIT", badgeColor)}
        ${transactionRow(isDebit ? "Sent To" : "Received From", counterpartyName)}
        ${transactionRow("Amount", formatted, badgeColor)}
        ${transactionRow("Status", "✅ Completed", "#16a34a")}
      </table>

      <p style="margin-top:20px;font-size:13px;color:#888;">
        If you did not authorise this transaction, please contact support immediately.
      </p>
      `
    );
  }

  // Fire both emails concurrently
  await Promise.all([
    sendEmail(
      sender.email,
      `💸 You sent ${formatted} — Transaction Successful`,
      "",
      buildHtml({
        name: sender.name,
        type: "DEBIT",
        counterpartyLabel: "Sent To",
        counterpartyName: receiver.name,
      })
    ),
    sendEmail(
      receiver.email,
      `💰 You received ${formatted} — Transaction Successful`,
      "",
      buildHtml({
        name: receiver.name,
        type: "CREDIT",
        counterpartyLabel: "Received From",
        counterpartyName: sender.name,
      })
    ),
  ]);
}


/* =============================
   TRANSACTION FAILED
============================= */

export async function sendTransactionFailedEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Failed ❌";

  const html = emailLayout(
    "Transaction Failed",
    `
    <p>Hello <strong>${name}</strong>,</p>

    <p>Unfortunately your transaction could not be processed.</p>

    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <tr>
        <td style="padding:10px;border:1px solid #eee;"><strong>To</strong></td>
        <td style="padding:10px;border:1px solid #eee;">${toAccount}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #eee;"><strong>Amount</strong></td>
        <td style="padding:10px;border:1px solid #eee;">NPR ${Number(amount).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #eee;"><strong>Status</strong></td>
        <td style="padding:10px;border:1px solid #eee;color:red;">Failed</td>
      </tr>
    </table>

    <p style="margin-top:20px;">
      If the issue persists, please contact our support team.
    </p>
  `
  );

  await sendEmail(userEmail, subject, "", html);
}