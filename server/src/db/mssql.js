import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';

let sql;
if (useWindowsAuth) {
  sql = (await import('mssql/msnodesqlv8.js')).default;
} else {
  sql = (await import('mssql')).default;
}

const serverRaw = process.env.DB_SERVER || 'AHMED666\\TEW_SQLEXPRESS';
const [serverHost, instanceName] = serverRaw.includes('\\')
  ? serverRaw.split('\\')
  : [serverRaw, undefined];

const config = useWindowsAuth
  ? {
      server: serverRaw,
      database: process.env.DB_DATABASE || 'ProjectHub',
      options: {
        trustedConnection: true,
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        encrypt: process.env.DB_ENCRYPT === 'true',
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    }
  : {
      server: serverHost,
      ...(instanceName ? { options: { instanceName } } : { port: parseInt(process.env.DB_PORT || '1433', 10) }),
      database: process.env.DB_DATABASE || 'ProjectHub',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        ...(instanceName ? { instanceName } : {}),
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };

let pool = null;

export async function getPool() {
  if (pool) return pool;
  pool = await sql.connect(config);
  return pool;
}

export { sql };

export async function query(q, params = {}) {
  const p = await getPool();
  const request = p.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(q);
}

export async function testConnection() {
  try {
    await getPool();
    return { ok: true, driver: 'mssql' };
  } catch (err) {
    return { ok: false, error: err.message, driver: 'mssql' };
  }
}

export function getDriverLabel() {
  return `SQL Server (${serverRaw})`;
}
