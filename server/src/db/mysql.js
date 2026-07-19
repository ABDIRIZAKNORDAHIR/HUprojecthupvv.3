import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  translateForMySQL,
  detectOutputInserted,
  MYSQL_PRIMARY_KEYS,
} from './sqlCompat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'ProjectHub',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  decimalNumbers: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

let pool = null;

export async function getPool() {
  if (pool) return pool;
  pool = mysql.createPool(poolConfig);
  return pool;
}

function toNamedPlaceholders(sql) {
  return sql.replace(/@(\w+)/g, ':$1');
}

async function fetchOutputRow(p, meta, params, insertId) {
  const pk = MYSQL_PRIMARY_KEYS[meta.table];
  if (!pk) return null;

  if (meta.kind === 'insert' && insertId != null) {
    const selectCols = meta.cols === '*' ? '*' : meta.cols.join(', ');
    const [rows] = await p.execute(
      toNamedPlaceholders(`SELECT ${selectCols} FROM ${meta.table} WHERE ${pk} = @id`),
      { id: insertId }
    );
    return Array.isArray(rows) ? rows : [];
  }

  if (meta.kind === 'update' && meta.where) {
    const selectCols = meta.cols === '*' ? '*' : meta.cols.join(', ');
    const [rows] = await p.execute(
      toNamedPlaceholders(`SELECT ${selectCols} FROM ${meta.table} ${meta.where}`),
      params
    );
    return Array.isArray(rows) ? rows : [];
  }

  return null;
}

export async function query(q, params = {}) {
  const p = await getPool();
  const outputMeta = detectOutputInserted(q);
  const translated = translateForMySQL(q);
  const text = toNamedPlaceholders(translated);
  const [result] = await p.execute(text, params);

  if (outputMeta) {
    const insertId = !Array.isArray(result) ? result.insertId : null;
    const rows = await fetchOutputRow(p, outputMeta, params, insertId);
    if (rows) {
      return {
        recordset: rows,
        rowsAffected: [!Array.isArray(result) ? result.affectedRows ?? rows.length : rows.length],
      };
    }
    if (insertId != null && outputMeta.cols !== '*' && outputMeta.cols.length === 1) {
      return {
        recordset: [{ [outputMeta.cols[0]]: insertId }],
        rowsAffected: [1],
      };
    }
  }

  const recordset = Array.isArray(result) ? result : [];
  const rowsAffected = Array.isArray(result) ? result.length : result.affectedRows ?? 0;
  return { recordset, rowsAffected: [rowsAffected] };
}

export async function testConnection() {
  try {
    const p = await getPool();
    await p.query('SELECT 1');
    return { ok: true, driver: 'mysql' };
  } catch (err) {
    return { ok: false, error: err.message, driver: 'mysql' };
  }
}

export function getDriverLabel() {
  return `MySQL (${poolConfig.host}:${poolConfig.port})`;
}

export const sql = mysql;
