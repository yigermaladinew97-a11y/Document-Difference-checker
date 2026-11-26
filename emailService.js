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
 * Parse sender email from EMAIL_FROM (e.g. '"ydiff" <user@gmail.com>' -> 'user@gmail.com')
 */
function parseSenderEmail(rawFrom, fallbackEmail) {
  if (rawFrom) {
    const match = rawFrom.match(/<([^>]+)>/);
    if (match && match[1]) return match[1].trim();
    if (rawFrom.includes('@')) return rawFrom.trim();
  }
  return fallbackEmail || '';
}

/**
 * Returns the active email delivery mode without exposing any credentials
 */
export function getEmailDeliveryMode() {
  if (process.env.EMAIL_WEBHOOK_URL && process.env.EMAIL_WEBHOOK_URL.trim()) return 'webhook';
  if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) return 'brevo';
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) return 'resend';
  if (process.env.SMTP_USER && process.env.SMTP_PASS && (process.env.SMTP_HOST || process.env.SMTP_SERVICE === 'gmail')) {
    return 'smtp';
  }
  return 'demo';
}

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

  const timeouts = {
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000
  };

  // Gmail-specific simplified transport
  if (user && pass && (host?.toLowerCase().includes('gmail') || process.env.SMTP_SERVICE === 'gmail')) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      ...timeouts
    });
    return cachedTransporter;
  }

  // Standard generic SMTP transport
  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      ...timeouts
    });
    return cachedTransporter;
  }

  return null;
}

/**
 * Shared email dispatcher: tries Brevo (HTTPS) -> Resend (HTTPS) -> SMTP (8s timeout) -> Simulation
 */
async function dispatchEmail({ to, subject, text, html, tag = 'Email Service' }) {
  const cleanEmail = (to || '').trim().toLowerCase();

  // 0. Try HTTPS Mail Webhook (e.g. Google Apps Script Web App — sends via your own Gmail over Port 443, never blocked by Render or DMARC)
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (webhookUrl && webhookUrl.trim()) {
    try {
      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          secret: process.env.EMAIL_WEBHOOK_SECRET || '',
          to: cleanEmail,
          subject,
          text,
          html,
          senderName: 'ydiff'
        })
      });

      const textBody = await res.text();
      let resData = {};
      try {
        resData = JSON.parse(textBody);
      } catch (_) {}

      if (res.ok && resData.success) {
        console.log(`[${tag}] ✅ Real email delivered via HTTPS Mail Webhook to ${cleanEmail}`);
        return { success: true, simulated: false, messageId: resData.messageId || `webhook_${Date.now()}` };
      }
      console.warn(`[${tag}] Mail Webhook error (${res.status}):`, textBody.slice(0, 300));
    } catch (err) {
      console.warn(`[${tag}] Mail Webhook call failed (${err.message}). Trying next provider...`);
    }
  }

  // 1. Try Brevo HTTPS API (Port 443, works on Render free tier & sends to any inbox without custom domain)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey && brevoApiKey.trim()) {
    const senderEmail = parseSenderEmail(
      process.env.EMAIL_FROM,
      process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER
    );
    if (!senderEmail) {
      console.warn(`[${tag}] BREVO_API_KEY is set, but EMAIL_FROM or BREVO_SENDER_EMAIL is missing.`);
    } else {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey.trim(),
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'ydiff', email: senderEmail },
            to: [{ email: cleanEmail }],
            subject,
            textContent: text,
            htmlContent: html
          })
        });

        const resData = await res.json().catch(() => ({}));
        if (res.ok && resData.messageId) {
          console.log(`[${tag}] ✅ Real email delivered via Brevo to ${cleanEmail} (ID: ${resData.messageId})`);
          return { success: true, simulated: false, messageId: resData.messageId };
        }
        console.warn(`[${tag}] Brevo API error (${res.status}):`, resData);
      } catch (err) {
        console.warn(`[${tag}] Brevo API call failed (${err.message}). Trying next provider...`);
      }
    }
  }

  // 2. Try Resend HTTPS API
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
          subject,
          text,
          html
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.id) {
        console.log(`[${tag}] ✅ Real email delivered via Resend to ${cleanEmail} (ID: ${resData.id})`);
        return { success: true, simulated: false, messageId: resData.id };
      }
      console.warn(`[${tag}] Resend API error (${res.status}):`, resData);
    } catch (err) {
      console.warn(`[${tag}] Resend API call failed (${err.message}). Trying SMTP fallback...`);
    }
  }

  // 3. Try SMTP via Nodemailer (8s timeout)
  const transporter = getTransporter();
  if (transporter) {
    try {
      const from = process.env.EMAIL_FROM || '"ydiff" <security@ydiff.io>';
      const info = await transporter.sendMail({
        from,
        to: cleanEmail,
        subject,
        text,
        html
      });

      console.log(`[${tag}] ✅ Real email delivered via SMTP to ${cleanEmail} (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, messageId: info.messageId };
    } catch (err) {
      console.warn(`[${tag}] ⚠️ Failed to send via SMTP (${err.message}). Falling back to simulation mode.`);
    }
  }

  return { success: true, simulated: true };
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

  const result = await dispatchEmail({
    to: cleanEmail,
    subject: `${code} — your ydiff verification code`,
    text: plainTextBody,
    html: build2FAEmailHtml({ name, code, email: cleanEmail }),
    tag: '2FA Email Service'
  });

  if (!result.simulated) {
    return result;
  }

  // Simulation mode (Local dev or when email provider is not configured)
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

  const result = await dispatchEmail({
    to: cleanEmail,
    subject: `${code} — your ydiff password reset code`,
    text: `Your ydiff password reset code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not make this request, you can safely ignore this email.\n\n— ydiff`,
    html: buildPasswordResetEmailHtml({ name, code, email: cleanEmail }),
    tag: 'Password Reset Email'
  });

  if (!result.simulated) {
    return result;
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
