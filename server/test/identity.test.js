import assert from 'node:assert/strict';
import test from 'node:test';
import { isPlaceholderEmail, normalizeIdentity } from '../src/utils/identity.js';

test('normalizes the email a user typed', () => {
  const email = normalizeIdentity('  Student@HU.edu.so ');
  assert.equal(email.ok, true);
  assert.equal(email.kind, 'email');
  assert.equal(email.value, 'student@hu.edu.so');
});

test('rejects anything that is not an email address', () => {
  for (const input of ['', '   ', '0612345678', 'not-an-email@', '@hu.edu.so', 'student hu.edu.so']) {
    assert.equal(normalizeIdentity(input).ok, false, `expected ${input} to be rejected`);
  }
});

test('legacy placeholder addresses can never be used to sign in', () => {
  assert.equal(isPlaceholderEmail('252612345678@phone.local'), true);
  assert.equal(isPlaceholderEmail('student@hu.edu.so'), false);
  assert.equal(normalizeIdentity('252612345678@phone.local').ok, false);
});
