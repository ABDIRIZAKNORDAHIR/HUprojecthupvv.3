import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { bindNamedParams, translateForPostgres } from './sqlCompat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

let pool = null;

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
}

export async function getPool() {
  if (pool) return pool;
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for PostgreSQL (Supabase / Neon). See GO_LIVE.txt');
  }
  pool = new Pool({
    connectionString,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 10,
  });
  return pool;
}

export async function query(q, params = {}) {
  const p = await getPool();
  const translated = translateForPostgres(q);
  const { text, values } = bindNamedParams(translated, params);
  const result = await p.query(text, values);
  return { recordset: result.rows, rowsAffected: [result.rowCount ?? 0] };
}

export async function testConnection() {
  try {
    await getPool();
    return { ok: true, driver: 'postgres' };
  } catch (err) {
    return { ok: false, error: err.message, driver: 'postgres' };
  }
}

export function getDriverLabel() {
  try {
    const url = new URL(getConnectionString());
    return `PostgreSQL (${url.hostname})`;
  } catch {
    return 'PostgreSQL';
  }
}
