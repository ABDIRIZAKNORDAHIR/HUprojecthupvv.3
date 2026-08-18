/**
 * Accounts are identified by a university email address. Phone numbers are a
 * profile detail only — they are never used to sign in or to receive codes.
 */

const PLACEHOLDER_DOMAIN = 'phone.local';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizes and validates the email a user typed. */
export function normalizeIdentity(input) {
  const raw = String(input || '').trim();
  if (!raw) return { ok: false, error: 'Enter your email address' };

  const email = raw.toLowerCase();
  if (!EMAIL_PATTERN.test(email) || isPlaceholderEmail(email)) {
    return { ok: false, error: 'Enter a valid email address' };
  }

  return { ok: true, kind: 'email', value: email };
}

/**
 * Legacy rows created before email-only sign-in carry a reserved address that
 * was never a real mailbox. Those accounts cannot sign in or receive codes.
 */
export function isPlaceholderEmail(email) {
  return String(email || '').toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`);
}
