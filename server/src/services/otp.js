import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { sendOtpEmail, isMailConfigured } from './mail.js';

const MAX_ATTEMPTS = 5;
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS EmailOtps (
      OtpId INT AUTO_INCREMENT PRIMARY KEY,
      Email VARCHAR(255) NOT NULL,
      Purpose VARCHAR(40) NOT NULL,
      CodeHash VARCHAR(255) NOT NULL,
      PayloadJson TEXT NULL,
      ExpiresAt DATETIME NOT NULL,
      Attempts INT NOT NULL DEFAULT 0,
      ConsumedAt DATETIME NULL,
      CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX IX_EmailOtps_EmailPurpose (Email, Purpose)
    )
  `);
  tableReady = true;
}

function ttlMinutes() {
  return Math.max(1, Number(process.env.OTP_TTL_MINUTES || 10));
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Send OTP by email, then store it.
 * Old codes are only invalidated after a successful send (avoids killing a good code on retry races).
 */
export async function issueOtp({ email, purpose, payload = null }) {
  await ensureTable();
  const normalized = String(email).toLowerCase().trim();
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const minutes = ttlMinutes();
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  if (!isMailConfigured()) {
    const err = new Error(
      'Email sending is not configured. Set SMTP_PASS in .env (Gmail App Password) and restart the server.'
    );
    err.code = 'smtp_not_configured';
    throw err;
  }

  const label =
    purpose === 'admin_login' ? 'admin login'
    : purpose === 'password_reset' ? 'password reset'
    : 'registration';
  const mail = await sendOtpEmail(normalized, code, label);
  if (!mail.sent) {
    const err = new Error(mail.reason || 'Failed to send verification email');
    err.code = 'smtp_send_failed';
    throw err;
  }

  // Invalidate previous codes only after the new email was accepted by Gmail
  await query(
    `UPDATE EmailOtps SET ConsumedAt = CURRENT_TIMESTAMP
     WHERE Email = @email AND Purpose = @purpose AND ConsumedAt IS NULL`,
    { email: normalized, purpose }
  );

  await query(
    `INSERT INTO EmailOtps (Email, Purpose, CodeHash, PayloadJson, ExpiresAt, Attempts)
     VALUES (@email, @purpose, @codeHash, @payload, @expiresAt, 0)`,
    {
      email: normalized,
      purpose,
      codeHash,
      payload: payload ? JSON.stringify(payload) : null,
      expiresAt,
    }
  );

  return {
    ok: true,
    email: normalized,
    expiresInMinutes: minutes,
    emailed: true,
  };
}

export async function verifyOtp({ email, purpose, code }) {
  await ensureTable();
  const normalized = String(email).toLowerCase().trim();
  const otpCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(otpCode)) {
    return { ok: false, error: 'Enter the 6-digit code from your email' };
  }

  // Prefer non-expired rows; allow 2 minutes clock skew via DATE_ADD
  const rows = await query(
    `SELECT OtpId, CodeHash, PayloadJson, ExpiresAt, Attempts
     FROM EmailOtps
     WHERE Email = @email AND Purpose = @purpose AND ConsumedAt IS NULL
       AND ExpiresAt > DATE_SUB(NOW(), INTERVAL 2 MINUTE)
     ORDER BY OtpId DESC
     LIMIT 1`,
    { email: normalized, purpose }
  );

  if (!rows.recordset.length) {
    const any = await query(
      `SELECT OtpId FROM EmailOtps WHERE Email = @email AND Purpose = @purpose ORDER BY OtpId DESC LIMIT 1`,
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
    return { ok: false, error: 'Wrong code. Check the newest email (older codes stop working).' };
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

  return { ok: true, email: normalized, payload };
}
