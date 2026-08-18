const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MAX_PROFILE_IMAGE_BYTES = 400 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const BLOCKED_EXTENSIONS = new Set([
  'html', 'htm', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'php', 'phtml',
  'asp', 'aspx', 'jsp', 'cgi', 'exe', 'bat', 'cmd', 'sh', 'ps1', 'svg',
  'svgz', 'wasm', 'jar', 'dll', 'so',
]);

function matchesSignature(mime, bytes) {
  const hex = bytes.subarray(0, 12).toString('hex');
  if (mime === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mime === 'image/png') return hex.startsWith('89504e470d0a1a0a');
  if (mime === 'image/gif') return bytes.subarray(0, 4).toString('ascii') === 'GIF8';
  if (mime === 'image/webp') {
    return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mime === 'application/pdf') return bytes.subarray(0, 4).toString('ascii') === '%PDF';
  if (mime.includes('wordprocessingml') || mime.includes('spreadsheetml')) return hex.startsWith('504b0304');
  if (mime === 'video/webm') return hex.startsWith('1a45dfa3');
  if (mime === 'video/mp4') return bytes.subarray(4, 8).toString('ascii') === 'ftyp';
  if (mime === 'text/plain') return !bytes.includes(0);
  return false;
}

function sanitizeFileName(name) {
  const safeName = String(name || 'attachment')
    .split(/[\\/]/)
    .pop()
    .replace(/[^\w.\- ()]/g, '_')
    .slice(0, 255) || 'attachment';
  const ext = safeName.includes('.') ? safeName.split('.').pop().toLowerCase() : '';
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw Object.assign(new Error('This file type is not allowed'), { status: 400 });
  }
  return safeName;
}

export function validateDataUrlAttachment({
  data,
  name,
  required = false,
  maxBytes = MAX_ATTACHMENT_BYTES,
  allowedMimes = ALLOWED_MIME_TYPES,
}) {
  if (!data) {
    if (required) throw Object.assign(new Error('Attachment is required'), { status: 400 });
    return null;
  }
  if (typeof data !== 'string') {
    throw Object.assign(new Error('Attachment must be an encoded file'), { status: 400 });
  }

  const match = data.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) {
    throw Object.assign(new Error('Attachment encoding is invalid'), { status: 400 });
  }

  const mime = match[1].toLowerCase();
  if (!allowedMimes.has(mime)) {
    throw Object.assign(new Error('This attachment type is not allowed'), { status: 400 });
  }
  if (match[2].length > Math.ceil(maxBytes * 4 / 3) + 4) {
    throw Object.assign(new Error(`Attachment is too large (maximum ${Math.round(maxBytes / 1024)} KB)`), { status: 413 });
  }

  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > maxBytes) {
    throw Object.assign(new Error('Attachment is empty or too large'), { status: 413 });
  }
  if (!matchesSignature(mime, bytes)) {
    throw Object.assign(new Error('Attachment content does not match its declared file type'), { status: 400 });
  }

  return {
    data,
    name: sanitizeFileName(name),
    mime,
    size: bytes.length,
  };
}

export function validateProfileImageDataUrl(data) {
  return validateDataUrlAttachment({
    data,
    name: 'profile.jpg',
    required: true,
    maxBytes: MAX_PROFILE_IMAGE_BYTES,
    allowedMimes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  });
}
