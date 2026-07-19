import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export function isPostgresDriver() {
  return (
    process.env.DB_DRIVER === 'postgres' ||
    !!process.env.DATABASE_URL ||
    !!process.env.SUPABASE_DB_URL
  );
}

export function isMySqlDriver() {
  return process.env.DB_DRIVER === 'mysql';
}

const impl = isPostgresDriver()
  ? await import('./db/postgres.js')
  : isMySqlDriver()
    ? await import('./db/mysql.js')
    : await import('./db/mssql.js');

export const getPool = impl.getPool;
export const query = impl.query;
export const testConnection = impl.testConnection;
export const getDriverLabel = impl.getDriverLabel;
export const sql = impl.sql;
