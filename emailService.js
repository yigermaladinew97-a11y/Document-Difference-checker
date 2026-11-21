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
function build2FAEmailHtml({ name = 'User', code, email }) {
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${code} is your DocDiff verification code</title>
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
                Doc<span style="color: #FF5E1E;">Diff</span> Studio
              </span>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.02em;">
                Verification code
              </h1>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Please enter the following 6-digit verification code to sign in to your DocDiff account (<strong>${email}</strong>):
              </p>
            </td>
          </tr>

          <!-- Clean Modern 2FA Code Display -->
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
                This code will expire in <strong>10 minutes</strong>. If you did not make this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; line-height: 1.5;">
                DocDiff &bull; Intelligent Document Comparison &amp; Revision Tracking
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

  // 1. Try Resend API if RESEND_API_KEY is configured (Easiest, 1-click cloud email service)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim()) {
    try {
      const from = process.env.EMAIL_FROM || 'DocDiff Security <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [cleanEmail],
          subject: `${code} is your DocDiff verification code`,
          text: `Your DocDiff verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not make this request, you can safely ignore this email.\n\n— DocDiff Studio`,
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
      const from = process.env.EMAIL_FROM || '"DocDiff Security" <security@docdiff.io>';
      const info = await transporter.sendMail({
        from,
        to: cleanEmail,
        subject: `${code} is your DocDiff verification code`,
        text: `Your DocDiff verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not make this request, you can safely ignore this email.\n\n— DocDiff Studio`,
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
  console.log(`   Valid for: 10 minutes`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true, code };
}
