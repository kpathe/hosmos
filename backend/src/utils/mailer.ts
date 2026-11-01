import nodemailer, { type Transporter } from "nodemailer";
import { env, isDevelopment } from "../config/env.js";

// ─────────────────────────────────────────────────────────────────────────────
// Mailer Service (Nodemailer)
//
// Automatically adapts:
//   - In Production / Staging: uses configured SMTP credentials.
//   - In Development (or if SMTP unconfigured): prints branded console output
//     and attempts JSON/stream delivery so local development works without errors.
// ─────────────────────────────────────────────────────────────────────────────

interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.SMTP_USER && env.SMTP_PASS) {
    const isGmail =
      env.SMTP_HOST?.toLowerCase().includes("gmail") ||
      env.SMTP_USER.toLowerCase().includes("@gmail.com");

    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST || "smtp.gmail.com",
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  } else {
    // Development fallback: stream transport
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }

  return transporter;
}

/**
 * Sends an email using the configured Nodemailer transport.
 */
export async function sendEmail(options: SendMailOptions): Promise<boolean> {
  const mailer = getTransporter();
  const hasRealSmtp = Boolean(env.SMTP_USER && env.SMTP_PASS);

  // When using Gmail SMTP, align sender with the authenticated mailbox to ensure high deliverability
  const fromAddress =
    env.SMTP_USER && (env.SMTP_USER.includes("@gmail.com") || env.EMAIL_FROM.includes("noreply@hosmos.com"))
      ? `Hosmos <${env.SMTP_USER}>`
      : env.EMAIL_FROM;

  try {
    const info = await mailer.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (!hasRealSmtp) {
      console.log(`[MAILER] Fallback transport simulated delivery to ${options.to}`);
    } else {
      console.log(`[MAILER] Email successfully sent to ${options.to}: ${info.messageId}`);
    }

    return true;
  } catch (error) {
    console.error(`[MAILER] Failed to send email to ${options.to}:`, error);
    // Don't crash auth flows if SMTP fails in dev
    if (isDevelopment) {
      return false;
    }
    throw error;
  }
}

/**
 * Sends a responsive, branded OTP verification email for student portal registration.
 */
export async function sendOtpEmail(
  email: string,
  recipientName: string,
  otpCode: string,
  expiryMinutes: number = 10
): Promise<boolean> {
  const subject = `Your Hosmos Verification Code: ${otpCode}`;

  const text = `Hello ${recipientName},\n\nYour one-time verification code for activating your Hosmos Resident Portal account is:\n\n${otpCode}\n\nThis code will expire in ${expiryMinutes} minutes. If you did not request this, please disregard this email.\n\n— Team Hosmos`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 32px 16px;
      color: #0f172a;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1e293b;
    }
    .desc {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .otp-box {
      background-color: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #0284c7;
      margin: 0;
    }
    .expiry {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 8px;
      text-align: center;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding: 20px 28px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      background-color: #fafafa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hosmos</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${recipientName || "Resident"},</div>
      <div class="desc">
        Welcome to your hostel resident portal. Please use the verification code below to verify your email address and activate your account:
      </div>
      <div class="otp-box">
        <p class="otp-code">${otpCode}</p>
      </div>
      <p class="expiry">⏱️ This code expires in <strong>${expiryMinutes} minutes</strong>. Do not share this code with anyone.</p>
    </div>
    <div class="footer">
      If you did not request this verification code, please ignore this email.<br>
      © ${new Date().getFullYear()} Hosmos Hostel Management System.
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Sends a branded password reset OTP email.
 */
export async function sendPasswordResetOtpEmail(
  email: string,
  recipientName: string,
  otpCode: string,
  expiryMinutes: number = 10
): Promise<boolean> {
  const subject = `Hosmos Password Reset Code: ${otpCode}`;

  const text = `Hello ${recipientName},\n\nWe received a request to reset your Hosmos account password. Your one-time verification code is:\n\n${otpCode}\n\nThis code will expire in ${expiryMinutes} minutes. If you did not request a password reset, please secure your account immediately.\n\n— Team Hosmos`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 32px 16px;
      color: #0f172a;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1e293b;
    }
    .desc {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .otp-box {
      background-color: #fff1f2;
      border: 2px dashed #fecdd3;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #e11d48;
      margin: 0;
    }
    .expiry {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 8px;
      text-align: center;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding: 20px 28px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      background-color: #fafafa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hosmos Account Security</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${recipientName || "User"},</div>
      <div class="desc">
        We received a request to reset your password. Use the verification code below to authorize the password reset:
      </div>
      <div class="otp-box">
        <p class="otp-code">${otpCode}</p>
      </div>
      <p class="expiry">⏱️ This code expires in <strong>${expiryMinutes} minutes</strong>. If you did not make this request, someone may be trying to access your account.</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Hosmos Hostel Management System.
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, text, html });
}
