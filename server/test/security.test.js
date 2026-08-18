import test from 'node:test';
import assert from 'node:assert/strict';
import { getJwtSecret } from '../src/config/security.js';
import { validateDataUrlAttachment } from '../src/utils/attachments.js';

test('production rejects a missing JWT secret', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_SECRET;
  try {
    assert.throws(() => getJwtSecret(), /JWT_SECRET/);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('validates attachment signatures and sanitizes names', () => {
  const pngHeader = Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64');
  const result = validateDataUrlAttachment({
    data: `data:image/png;base64,${pngHeader}`,
    name: '../../unsafe<script>.png',
  });

  assert.equal(result.mime, 'image/png');
  assert.equal(result.name, 'unsafe_script_.png');
  assert.equal(result.size, 12);
});

test('rejects files whose content does not match the MIME type', () => {
  const fakePdf = Buffer.from('not a pdf').toString('base64');
  assert.throws(
    () => validateDataUrlAttachment({
      data: `data:application/pdf;base64,${fakePdf}`,
      name: 'fake.pdf',
    }),
    /does not match/
  );
});
