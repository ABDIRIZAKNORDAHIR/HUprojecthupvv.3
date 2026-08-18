import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { sendOtpEmail, isMailConfigured } from './mail.js';

const MAX_ATTEMPTS = 5;
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  // Database setup owns dialect-specific DDL; this verifies it ran successfully.
  await query('SELECT TOP 1 OtpId FROM EmailOtps');
  tableReady = true;
}

function ttlMinutes() {
  return Math.max(1, Number(process.env.OTP_TTL_MINUTES || 10));
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

/** Outside production the code can be shown on screen when no mailbox is wired. */
function allowDevOtpReveal() {
  return process.env.NODE_ENV !== 'production';
}

/** Development-only console delivery so signup is testable before SMTP exists. */
function devEchoCode(target, code, minutes) {
  if (!allowDevOtpReveal()) return false;
  console.log(
    `\n[OTP][development] No email transport configured.\n` +
    `        code for ${target}: ${code} (valid ${minutes} minutes)\n`
  );
  return true;
}

/**
 * Email a one-time code and store its hash. The email address is the lookup key
 * for verification.
 *
 * Old codes are only invalidated after a successful send (avoids killing a good code on retry races).
 */
export async function issueOtp({ identity, email, purpose, payload = null }) {
  await ensureTable();
  const target = String(identity ?? email ?? '').trim();
  if (!target) {
    const err = new Error('Enter your email address');
    err.status = 400;
    throw err;
  }

  const key = target.toLowerCase();
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const minutes = ttlMinutes();
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  const label =
    purpose === 'admin_login' ? 'admin login'
    : purpose === 'password_reset' ? 'password reset'
    : 'registration';

  let notice = null;
  /** Only ever set outside production when SMTP is not configured. */
  let devCode = null;

  if (isMailConfigured()) {
    const mail = await sendOtpEmail(key, code, label);
    if (!mail.sent) {
      const err = new Error(mail.reason || 'Failed to send verification email');
      err.code = 'smtp_send_failed';
      throw err;
    }
  } else if (devEchoCode(key, code, minutes)) {
    devCode = code;
    notice = 'Email sending is not configured yet — use the development code shown below.';
  } else {
    const err = new Error(
      'Email sending is not configured. Set SMTP_PASS in .env (Gmail App Password) and restart the server.'
    );
    err.code = 'smtp_not_configured';
    throw err;
  }

  // Invalidate previous codes only after the new code was accepted by the provider
  await query(
    `UPDATE EmailOtps SET ConsumedAt = CURRENT_TIMESTAMP
     WHERE Email = @email AND Purpose = @purpose AND ConsumedAt IS NULL`,
    { email: key, purpose }
  );

  await query(
    `INSERT INTO EmailOtps (Email, Purpose, CodeHash, PayloadJson, ExpiresAt, Attempts)
     VALUES (@email, @purpose, @codeHash, @payload, @expiresAt, 0)`,
    {
      email: key,
      purpose,
      codeHash,
      payload: payload ? JSON.stringify(payload) : null,
      expiresAt,
    }
  );

  return {
    ok: true,
    identity: key,
    email: key,
    expiresInMinutes: minutes,
    emailed: true,
    deliveredTo: key,
    notice,
    ...(devCode ? { devCode } : {}),
  };
}

export async function verifyOtp({ identity, email, purpose, code }) {
  await ensureTable();
  const normalized = String(identity ?? email ?? '').trim().toLowerCase();
  const otpCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(otpCode)) {
    return { ok: false, error: 'Enter the 6-digit code we sent you' };
  }

  // Hard cut-off: once ExpiresAt passes, the code is dead with no grace period.
  const threshold = new Date();
  const rows = await query(
    `SELECT TOP 1 OtpId, CodeHash, PayloadJson, ExpiresAt, Attempts
     FROM EmailOtps
     WHERE Email = @email AND Purpose = @purpose AND ConsumedAt IS NULL
       AND ExpiresAt > @threshold
     ORDER BY OtpId DESC`,
    { email: normalized, purpose, threshold }
  );

  if (!rows.recordset.length) {
    const any = await query(
      `SELECT TOP 1 OtpId FROM EmailOtps WHERE Email = @email AND Purpose = @purpose ORDER BY OtpId DESC`,
      { email: normalized, purpose }
    );
    if (!any.recordset.length) {
      return { ok: false, error: 'No code found. Click Send OTP again.' };
    }
    return { ok: false, error: 'Code expired or already used. Click Resend code.' };
  }

  const row = rows.recordset[0];
  if (Number(row.Attempts) >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Too many attempts. Click Resend code.' };
  }

  const match = await bcrypt.compare(otpCode, row.CodeHash);
  if (!match) {
    await query(
      `UPDATE EmailOtps SET Attempts = Attempts + 1 WHERE OtpId = @id`,
      { id: row.OtpId }
    );
    return { ok: false, error: 'Wrong code. Check the newest message (older codes stop working).' };
  }

  await query(
    `UPDATE EmailOtps SET ConsumedAt = CURRENT_TIMESTAMP WHERE OtpId = @id`,
    { id: row.OtpId }
  );

  let payload = null;
  if (row.PayloadJson) {
    try {
      payload = typeof row.PayloadJson === 'string' ? JSON.parse(row.PayloadJson) : row.PayloadJson;
    } catch {
      payload = null;
    }
  }

  return { ok: true, identity: normalized, email: normalized, payload };
}
