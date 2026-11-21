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
 * Build rich HTML email template for 2FA verification code
 */
function build2FAEmailHtml({ name = 'User', code, email }) {
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your DocDiff Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F1F5F9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B0F19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #111726; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="display: inline-block; width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #1E293B, #0F172A); border: 1px solid rgba(255, 94, 30, 0.4); text-align: center; line-height: 48px; margin-bottom: 12px;">
                <span style="font-size: 24px; color: #FF5E1E;">🔒</span>
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">
                Doc<span style="color: #FF5E1E;">Diff</span> Studio
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94A3B8;">Two-Factor Authentication</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #E2E8F0; line-height: 1.5;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                Use the following 6-digit security code to complete your login for <strong>${email}</strong>. This code is valid for <strong>10 minutes</strong>.
              </p>

              <!-- Code Box -->
              <div style="background: rgba(255, 94, 30, 0.08); border: 1.5px dashed rgba(255, 94, 30, 0.4); border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'JetBrains Mono', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #FF5E1E;">
                  ${formattedCode}
                </span>
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">
                  Expires in 10 minutes &bull; Do not share this code
                </p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                If you did not request this login code, please ignore this email or change your account password immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0D131F; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${new Date().getFullYear()} DocDiff Studio. Automated Security Notification.
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
          subject: `Your DocDiff Verification Code: ${code}`,
          text: `Your DocDiff 2FA verification code is: ${code}. It expires in 10 minutes.`,
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
        subject: `Your DocDiff Verification Code: ${code}`,
        text: `Your DocDiff 2FA verification code is: ${code}. It expires in 10 minutes.`,
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
