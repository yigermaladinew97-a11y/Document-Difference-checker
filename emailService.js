/**
 * ============================================================================
 * Email Delivery & OTP Dispatch Service
 * ============================================================================
 * Dispatches 6-digit verification codes for 2FA and password recovery.
 *
 * Operational Modes:
 *  - Production Mode : Authenticated SMTP (Gmail, SendGrid, Mailgun, Amazon SES)
 *  - Simulation Mode : In-terminal visual card dispatch (100% operational offline)
 * ============================================================================
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let cachedTransporter = null;

/**
 * Returns a configured Nodemailer transporter or null if SMTP is not configured
 */
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  // Gmail-specific simplified transport
  if (user && pass && (host?.toLowerCase().includes('gmail') || process.env.SMTP_SERVICE === 'gmail')) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
    return cachedTransporter;
  }

  // Standard generic SMTP transport
  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
    return cachedTransporter;
  }

  return null;
}

/**
 * Build clean, modern, text-first HTML email template for 2FA verification code
 * Designed to look like Stripe, GitHub, or Vercel with crisp typography and zero image artifacts.
 */
function build2FAEmailHtml({ name = 'there', code }) {
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
  const firstName = (name || 'there').trim().split(/\s+/)[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${code} — your ydiff verification code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 440px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 3px solid #FF5E1E; border-radius: 14px; overflow: hidden; padding: 32px 28px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">

          <!-- Brand Header (Zero Images) -->
          <tr>
            <td style="padding-bottom: 20px;">
              <span style="font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em;">
                y<span style="color: #FF5E1E;">diff</span>
              </span>
            </td>
          </tr>

          <!-- Greeting & Body -->
          <tr>
            <td style="padding-bottom: 10px;">
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">
                Hey ${firstName},
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 22px;">
              <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Someone just tried to sign in to your <strong>ydiff</strong> workspace. To keep your documents and comparisons safe, enter this 6-digit number code to confirm it’s really you:
              </p>
            </td>
          </tr>

          <!-- Clean Highlighted Code Box -->
          <tr>
            <td align="center" style="padding: 4px 0 22px 0;">
              <div style="background-color: #FFF7ED; border: 1.5px dashed #FF5E1E; border-radius: 12px; padding: 14px 28px; text-align: center; display: inline-block;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #EA580C; user-select: all;">
                  ${formattedCode}
                </span>
              </div>
            </td>
          </tr>

          <!-- 1-Minute Expiry Notice -->
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
                <strong>Active for 1 minute</strong> — if time runs out, just request a fresh code on the sign-in screen.
              </p>
            </td>
          </tr>

          <!-- Security Note & Sign-off -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding-top: 16px;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                Didn’t try to sign in? You can safely ignore this email and your account will stay protected.
              </p>
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #94A3B8;">
                — ydiff
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send 2FA Verification Code Email
 * If SMTP is configured, sends via Nodemailer.
 * If SMTP is not configured, logs cleanly to server console and operates in simulation mode.
 */
export async function send2FACodeEmail({ email, code, name = 'User' }) {
  const cleanEmail = (email || '').trim().toLowerCase();

  const firstName = (name || 'there').trim().split(/\s+/)[0];
  const plainTextBody = `Hey ${firstName},\n\nSomeone just tried to sign in to your ydiff workspace. To keep your documents and comparisons safe, enter this 6-digit number code to confirm it's really you:\n\n${code}\n\nActive for 1 minute — if time runs out, just request a fresh code on the sign-in screen.\n\nDidn't try to sign in? You can safely ignore this email and your account will stay protected.\n\n— ydiff`;

  // 1. Try Resend API if RESEND_API_KEY is configured (Easiest, 1-click cloud email service)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim()) {
    try {
      const from = process.env.EMAIL_FROM || 'ydiff <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [cleanEmail],
          subject: `${code} — your ydiff verification code`,
          text: plainTextBody,
          html: build2FAEmailHtml({ name, code, email: cleanEmail })
        })
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`[2FA Email Service] ✅ Real email delivered via Resend to ${cleanEmail} (ID: ${resData.id})`);
        return { success: true, simulated: false, messageId: resData.id };
      } else {
        console.warn(`[2FA Email Service] Resend API responded with error:`, resData);
      }
    } catch (err) {
      console.warn(`[2FA Email Service] Resend API call failed (${err.message}). Trying SMTP fallback...`);
    }
  }

  // 2. Try SMTP via Nodemailer if configured
  const transporter = getTransporter();
  if (transporter) {
    try {
      const from = process.env.EMAIL_FROM || '"ydiff" <security@ydiff.io>';
      const info = await transporter.sendMail({
        from,
        to: cleanEmail,
        subject: `${code} — your ydiff verification code`,
        text: plainTextBody,
        html: build2FAEmailHtml({ name, code, email: cleanEmail })
      });

      console.log(`[2FA Email Service] ✅ Real email delivered to ${cleanEmail} (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, messageId: info.messageId };
    } catch (err) {
      console.warn(`[2FA Email Service] ⚠️ Failed to send via SMTP (${err.message}). Falling back to simulation mode.`);
    }
  }

  // Simulation mode (Local dev or when SMTP is not configured)
  console.log(`\n======================================================`);
  console.log(`✉️ [2FA Email Service - SIMULATION MODE]`);
  console.log(`   To: ${cleanEmail}`);
  console.log(`   Code: [ ${code} ]`);
  console.log(`   Valid for: 1 minute`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true, code };
}

/**
 * Build clean, modern HTML email template for password reset code
 */
function buildPasswordResetEmailHtml({ name = 'User', code, email }) {
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${code} is your Ydiff password reset code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 460px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding-bottom: 24px;">
              <span style="font-size: 19px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">
                Y<span style="color: #FF5E1E;">diff</span> Studio
              </span>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.02em;">
                Reset Your Password
              </h1>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
                We received a request to reset the password for your Ydiff account (<strong>${email}</strong>). Enter this 6-digit verification code to choose a new password:
              </p>
            </td>
          </tr>

          <!-- Clean Modern OTP Code Display -->
          <tr>
            <td align="center" style="padding: 12px 0 24px 0;">
              <div style="background-color: #FFF7ED; border: 1.5px solid #FFEDD5; border-radius: 12px; padding: 16px 28px; text-align: center; display: inline-block;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #EA580C; user-select: all;">
                  ${formattedCode}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.5;">
                This code will expire in <strong>10 minutes</strong>. If you did not make this request, you can safely ignore this email. Your current password remains unchanged.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; line-height: 1.5;">
                Ydiff &bull; Intelligent Document Comparison &amp; Revision Tracking
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send Password Reset Code Email
 */
export async function sendPasswordResetEmail({ email, code, name = 'User' }) {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Try Resend API if configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim()) {
    try {
      const from = process.env.EMAIL_FROM || 'Ydiff Security <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [cleanEmail],
          subject: `${code} is your Ydiff password reset code`,
          text: `Your Ydiff password reset code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not make this request, you can safely ignore this email.\n\n— Ydiff Studio`,
          html: buildPasswordResetEmailHtml({ name, code, email: cleanEmail })
        })
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`[Password Reset Email] ✅ Real email delivered via Resend to ${cleanEmail} (ID: ${resData.id})`);
        return { success: true, simulated: false, messageId: resData.id };
      } else {
        console.warn(`[Password Reset Email] Resend API responded with error:`, resData);
      }
    } catch (err) {
      console.warn(`[Password Reset Email] Resend API call failed (${err.message}). Trying SMTP fallback...`);
    }
  }

  // 2. Try SMTP via Nodemailer if configured
  const transporter = getTransporter();
  if (transporter) {
    try {
      const from = process.env.EMAIL_FROM || '"Ydiff Security" <security@ydiff.io>';
      const info = await transporter.sendMail({
        from,
        to: cleanEmail,
        subject: `${code} is your Ydiff password reset code`,
        text: `Your Ydiff password reset code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not make this request, you can safely ignore this email.\n\n— Ydiff Studio`,
        html: buildPasswordResetEmailHtml({ name, code, email: cleanEmail })
      });

      console.log(`[Password Reset Email] ✅ Real email delivered to ${cleanEmail} (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, messageId: info.messageId };
    } catch (err) {
      console.warn(`[Password Reset Email] ⚠️ Failed to send via SMTP (${err.message}). Falling back to simulation mode.`);
    }
  }

  // Simulation mode
  console.log(`\n======================================================`);
  console.log(`🔑 [Password Reset Service - SIMULATION MODE]`);
  console.log(`   To: ${cleanEmail}`);
  console.log(`   Code: [ ${code} ]`);
  console.log(`   Valid for: 10 minutes`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true, code };
}
