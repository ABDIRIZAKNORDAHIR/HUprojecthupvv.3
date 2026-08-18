import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedRealtimeOrigin } from '../src/realtime/socket.js';

function withEnv(env, run) {
  const previous = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('production only accepts configured realtime origins', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      CLIENT_URL: 'https://app.example.edu',
      ALLOWED_ORIGINS: 'https://atlas.example.edu/',
      RENDER_EXTERNAL_URL: undefined,
    },
    () => {
      assert.equal(isAllowedRealtimeOrigin('https://app.example.edu'), true);
      assert.equal(isAllowedRealtimeOrigin('https://atlas.example.edu'), true);
      assert.equal(isAllowedRealtimeOrigin('https://attacker.example.com'), false);
      assert.equal(isAllowedRealtimeOrigin('http://localhost:5173'), false);
    }
  );
});

test('development keeps local and tunnel origins usable', () => {
  withEnv(
    {
      NODE_ENV: 'development',
      CLIENT_URL: undefined,
      ALLOWED_ORIGINS: undefined,
      RENDER_EXTERNAL_URL: undefined,
    },
    () => {
      assert.equal(isAllowedRealtimeOrigin('http://localhost:5173'), true);
      assert.equal(isAllowedRealtimeOrigin('http://192.168.1.20:5173'), true);
      assert.equal(isAllowedRealtimeOrigin('https://calm-river-123.trycloudflare.com'), true);
      assert.equal(isAllowedRealtimeOrigin('https://attacker.example.com'), false);
    }
  );
});
