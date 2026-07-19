/**
 * Export full ProjectHub database to JSON for backup.
 * Run: node server/src/scripts/exportDatabase.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query, getPool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const TABLES = [
  'Users',
  'Settings',
  'Projects',
  'ProjectMembers',
  'ProjectInvitations',
  'Submissions',
  'AIAnalyses',
  'Messages',
  'Notifications',
];

const SENSITIVE = ['PasswordHash'];

async function exportTable(name) {
  const result = await query(`SELECT * FROM dbo.[${name}]`);
  const rows = result.recordset.map(row => {
    const copy = { ...row };
    for (const key of SENSITIVE) {
      if (copy[key]) copy[key] = '[REDACTED — restore via seed or reset password]';
    }
    return copy;
  });
  return rows;
}

async function main() {
  const outDir = path.resolve(__dirname, '../../../.backup/database-export');
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {
    exportedAt: new Date().toISOString(),
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    tables: {},
  };

  console.log('[Export] Connecting to SQL Server...');
  await getPool();

  for (const table of TABLES) {
    try {
      const rows = await exportTable(table);
      const file = path.join(outDir, `${table}.json`);
      fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
      manifest.tables[table] = { count: rows.length, file: `${table}.json` };
      console.log(`[Export] ${table}: ${rows.length} rows`);
    } catch (err) {
      manifest.tables[table] = { error: err.message };
      console.warn(`[Export] ${table} FAILED:`, err.message);
    }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[Export] Done → ${outDir}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[Export] Failed:', err.message);
  process.exit(1);
});
