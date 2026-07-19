import { Router } from 'express';
import { authMiddleware, attachUserDetails } from '../middleware/auth.js';
import {
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  ensurePushTable,
} from '../services/push.js';

const router = Router();

router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

router.post('/subscribe', authMiddleware, attachUserDetails, async (req, res) => {
  try {
    await ensurePushTable();
    await savePushSubscription(req.user.userId, req.body?.subscription, req.headers['user-agent']);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/unsubscribe', authMiddleware, attachUserDetails, async (req, res) => {
  try {
    await removePushSubscription(req.user.userId, req.body?.endpoint);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
