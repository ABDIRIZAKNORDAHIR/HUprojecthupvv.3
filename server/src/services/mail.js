import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let transporter = null;

function smtpPass() {
  return (process.env.SMTP_PASS || '').replace(/\s+/g, '');
}

function smtpUser() {
  return (process.env.SMTP_USER || '').trim();
}

/** Always show ProjectHub brand name. Gmail SMTP still authenticates with SMTP_USER. */
function mailFrom() {
  const user = smtpUser();
  return `Hormuud ProjectHub <${user}>`;
}

function findLogoPath() {
  const candidates = [
    path.resolve(__dirname, '../../../src/assets/projecthub-logo.png'),
    path.resolve(__dirname, '../../../public/projecthub-logo.png'),
    path.resolve(__dirname, '../../../public/university-logo.svg'),
    path.resolve(__dirname, '../../../dist/projecthub-logo.png'),
  ];
  return candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || null;
}

function getTransporter() {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) return null;

  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 25000,
    greetingTimeout: 25000,
    socketTimeout: 45000,
  });
  return transporter;
}

export function isMailConfigured() {
  return !!(smtpUser() && smtpPass());
}

export function resetMailTransport() {
  transporter = null;
}

/**
 * Send an email. OTP never BCCs the admin — only `to` receives it.
 */
export async function sendMail({ to, subject, text, html, attachments }) {
  const tx = getTransporter();
  if (!tx) {
    return { sent: false, reason: 'SMTP not configured — add SMTP_PASS (Gmail App Password) in .env' };
  }
  try {
    const info = await tx.sendMail({
      from: mailFrom(),
      to,
      // No BCC — recipient only
      subject,
      text,
      html,
      // Do not set replyTo to personal Gmail — keep it brand-only / omit
      replyTo: undefined,
      attachments: attachments || undefined,
    });
    console.log(`[Mail] ProjectHub → to=${to} id=${info.messageId || 'ok'}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    transporter = null;
    console.error('[Mail] send failed:', err.message);
    return {
      sent: false,
      reason: err.message.includes('Invalid login') || err.message.includes('Username and Password not accepted')
        ? 'Gmail rejected login. Create a new App Password at https://myaccount.google.com/apppasswords'
        : `Email send failed: ${err.message}`,
    };
  }
}

export async function sendOtpEmail(to, code, purposeLabel) {
  const toNorm = String(to).toLowerCase().trim();
  const minutes = process.env.OTP_TTL_MINUTES || 10;
  const subject = `ProjectHub verification code`;

  const text =
    `Hormuud ProjectHub\n\n` +
    `Your ${purposeLabel} verification code is: ${code}\n\n` +
    `This code expires in ${minutes} minutes.\n` +
    `If you did not request this, ignore this email.\n\n` +
    `— Hormuud ProjectHub\n`;

  const logoPath = findLogoPath();
  const logoImg = logoPath
    ? `<img src="cid:projecthub-logo" alt="Hormuud ProjectHub" width="160" style="display:block;margin:0 auto 20px;max-width:160px;height:auto" />`
    : `<p style="margin:0 0 16px;text-align:center;font-size:18px;font-weight:800;color:#16A34A;letter-spacing:-0.02em">Hormuud ProjectHub</p>`;

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f0fdf4;padding:28px 16px">
      <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px 24px;border:1px solid #bbf7d0;box-shadow:0 8px 24px rgba(22,163,74,0.08)">
        ${logoImg}
        <p style="margin:0 0 6px;text-align:center;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#16A34A">Hormuud University</p>
        <h1 style="margin:0 0 8px;text-align:center;color:#0F2D5C;font-size:22px;font-weight:700">Verification code</h1>
        <p style="margin:0 0 18px;text-align:center;color:#64748b;font-size:14px;line-height:1.5">
          Your ProjectHub ${purposeLabel} code is below. Enter it to continue.
        </p>
        <div style="text-align:center;background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:18px 12px;margin:0 0 18px">
          <p style="margin:0;font-size:34px;letter-spacing:10px;font-weight:800;color:#16A34A;font-family:Consolas,'Courier New',monospace">${code}</p>
        </div>
        <p style="margin:0;text-align:center;font-size:12px;color:#94a3b8">Expires in ${minutes} minutes · ProjectHub</p>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#94a3b8">Sent by Hormuud ProjectHub · Do not reply to this message</p>
    </div>
  `;

  const attachments = logoPath
    ? [{ filename: 'projecthub-logo.png', path: logoPath, cid: 'projecthub-logo' }]
    : undefined;

  // Only the person who entered their email receives this — never BCC admin
  return sendMail({ to: toNorm, subject, text, html, attachments });
}
