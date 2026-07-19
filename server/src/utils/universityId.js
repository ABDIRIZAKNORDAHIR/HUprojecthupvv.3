/** HU000 + phone digits in groups of 4. Example: HU000-1234 or HU000-1234-5678 */

const HU_PREFIX = 'HU000';

export function normalizeUniversityId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.toUpperCase().replace(/[\s-]/g, '');
  if (cleaned.startsWith(HU_PREFIX)) return cleaned;
  if (cleaned.startsWith('HU')) {
    const digits = cleaned.slice(2).replace(/\D/g, '');
    return `${HU_PREFIX}${digits}`;
  }
  const digits = cleaned.replace(/\D/g, '');
  return digits ? `${HU_PREFIX}${digits}` : '';
}

export function formatUniversityId(raw) {
  const id = normalizeUniversityId(raw);
  if (!id.startsWith(HU_PREFIX)) return id;
  const phone = id.slice(HU_PREFIX.length);
  if (!phone) return HU_PREFIX;
  const groups = phone.match(/.{1,4}/g) || [];
  return `${HU_PREFIX}-${groups.join('-')}`;
}

export function validateUniversityId(raw) {
  const id = normalizeUniversityId(raw);
  if (!id) return { ok: false, error: 'University ID is required' };
  if (!id.startsWith(HU_PREFIX)) {
    return { ok: false, error: 'University ID must start with HU000 followed by phone numbers' };
  }
  const digits = id.slice(HU_PREFIX.length);
  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: 'After HU000 use numbers only (phone digits in groups of 4)' };
  }
  if (digits.length < 4) {
    return { ok: false, error: 'Add at least 4 digits after HU000 (e.g. HU000-1234)' };
  }
  if (digits.length > 16) {
    return { ok: false, error: 'Maximum 16 digits after HU000 (four groups of 4)' };
  }
  if (digits.length % 4 !== 0) {
    return { ok: false, error: 'Phone digits must be in groups of 4 (4, 8, 12, or 16 digits after HU000)' };
  }
  return { ok: true, id };
}

export function universityIdHint() {
  return 'Format: HU000 then phone numbers in groups of 4. Example: HU000-1234 or HU000-1234-5678';
}
