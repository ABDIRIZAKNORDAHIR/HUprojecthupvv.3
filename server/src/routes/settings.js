import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT SettingKey, SettingValue, UpdatedAt FROM Settings ORDER BY SettingKey');
    res.json({ settings: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', authMiddleware, attachUserDetails, requireRole('admin'), async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `MERGE Settings AS t USING (SELECT @key AS SettingKey, @value AS SettingValue) AS s
         ON t.SettingKey = s.SettingKey
         WHEN MATCHED THEN UPDATE SET SettingValue = @value, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @userId
         WHEN NOT MATCHED THEN INSERT (SettingKey, SettingValue, UpdatedBy) VALUES (@key, @value, @userId);`,
        { key, value: String(value), userId: req.user.userId }
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
