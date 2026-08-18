const DEV_JWT_SECRET = 'dev-secret-change-in-production';
const DEV_ADMIN_PASSWORD = 'ProjectHub123!';

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function isStrictProduction() {
  return isProduction() && (
    process.env.REQUIRE_PRODUCTION_CONFIG === 'true'
    || Boolean(process.env.RENDER)
  );
}

export function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (secret.length >= 32) return secret;
  if (isProduction()) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
  }
  return secret || DEV_JWT_SECRET;
}

export function getAdminBootstrap() {
  const email = String(process.env.ADMIN_EMAIL || (isProduction() ? '' : 'admin@hu.edu'))
    .toLowerCase()
    .trim();
  const password = String(
    process.env.ADMIN_DEFAULT_PASSWORD || (isProduction() ? '' : DEV_ADMIN_PASSWORD)
  );

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL must be configured before the first admin account is created');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_DEFAULT_PASSWORD must contain at least 12 characters');
  }

  return {
    universityId: process.env.ADMIN_UNIVERSITY_ID || 'HU0009000',
    email,
    password,
    firstName: process.env.ADMIN_FIRST_NAME || 'System',
    lastName: process.env.ADMIN_LAST_NAME || 'Administrator',
  };
}

export function validateProductionConfig() {
  getJwtSecret();
  if (!isStrictProduction()) return;

  const required = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
  ];
  const missing = required.filter(name => !String(process.env[name] || '').trim());
  if (missing.length) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  }

  const hasAI = [
    'GROQ_API_KEY',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
  ].some(name => String(process.env[name] || '').trim());
  if (!hasAI) {
    throw new Error('At least one production AI provider key is required');
  }
}
