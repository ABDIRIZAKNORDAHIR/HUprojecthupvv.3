import webpush from 'web-push';
import { query } from '../db.js';
import { isStrictProduction } from '../config/security.js';

let configured = false;

function ensureVapid() {
  if (configured) return true;
  let publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  let privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@projecthub.local';

  if (!publicKey || !privateKey) {
    if (isStrictProduction()) {
      throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required in production');
    }
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    process.env.VAPID_PUBLIC_KEY = publicKey;
    process.env.VAPID_PRIVATE_KEY = privateKey;
    console.log('[Push] Generated ephemeral VAPID keys (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env to persist)');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey() {
  ensureVapid();
  return process.env.VAPID_PUBLIC_KEY;
}

export async function ensurePushTable() {
  // Database setup owns dialect-specific DDL; fail fast if it is incomplete.
  await query('SELECT TOP 1 SubscriptionId FROM PushSubscriptions');
}

export async function savePushSubscription(userId, subscription, userAgent = null) {
  ensureVapid();
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('Invalid push subscription');

  await query(
    `DELETE FROM PushSubscriptions WHERE Endpoint = @endpoint OR UserId = @userId`,
    { endpoint, userId },
  ).catch(() => {});

  await query(
    `INSERT INTO PushSubscriptions (UserId, Endpoint, P256dh, Auth, UserAgent)
     VALUES (@userId, @endpoint, @p256dh, @auth, @userAgent)`,
    { userId, endpoint, p256dh, auth, userAgent: userAgent?.slice(0, 250) || null },
  );
}

export async function removePushSubscription(userId, endpoint) {
  if (endpoint) {
    await query(`DELETE FROM PushSubscriptions WHERE UserId = @userId AND Endpoint = @endpoint`, {
      userId,
      endpoint,
    });
  } else {
    await query(`DELETE FROM PushSubscriptions WHERE UserId = @userId`, { userId });
  }
}

export async function sendPushToUser(userId, payload) {
  try {
    ensureVapid();
    const rows = await query(
      `SELECT SubscriptionId, Endpoint, P256dh, Auth FROM PushSubscriptions WHERE UserId = @userId`,
      { userId },
    );
    if (!rows.recordset?.length) return { sent: 0 };

    const body = JSON.stringify({
      title: payload.title || 'ProjectHub',
      body: payload.message || payload.body || '',
      url: payload.url || '/messages',
      type: payload.type || 'info',
    });

    let sent = 0;
    for (const sub of rows.recordset) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.Endpoint,
            keys: { p256dh: sub.P256dh, auth: sub.Auth },
          },
          body,
        );
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query(`DELETE FROM PushSubscriptions WHERE SubscriptionId = @id`, {
            id: sub.SubscriptionId,
          }).catch(() => {});
        }
      }
    }
    return { sent };
  } catch (err) {
    console.warn('[Push] send failed:', err.message);
    return { sent: 0, error: err.message };
  }
}
