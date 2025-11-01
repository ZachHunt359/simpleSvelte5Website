import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function initPoolFromUrl(dbUrl: string) {
  const u = new URL(dbUrl);
  pool = mysql.createPool({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
  });
}

async function ensurePool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
    initPoolFromUrl(process.env.DATABASE_URL);
  }
}

export async function query(sql: string, params?: any[]) {
  await ensurePool();
  console.log('[db-mysql.query] SQL:', sql);
  console.log('[db-mysql.query] Params:', params);
  const [rows] = await (pool as mysql.Pool).query(sql, params);
  console.log('[db-mysql.query] Result:', rows);
  return rows as any[];
}

export async function get(sql: string, params?: any[]) {
  const rows = await query(sql, params);
  console.log('[db-mysql.get] SQL:', sql);
  console.log('[db-mysql.get] Params:', params);
  console.log('[db-mysql.get] Rows:', rows);
  return Array.isArray(rows) ? rows[0] : undefined;
}

export async function run(sql: string, params?: any[]) {
  await ensurePool();
  const [result] = await (pool as mysql.Pool).execute(sql, params);
  return result as any;
}

export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>) {
  await ensurePool();
  const conn = await (pool as mysql.Pool).getConnection();
  try {
    await conn.beginTransaction();
    const res = await fn(conn);
    await conn.commit();
    return res;
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    throw err;
  } finally {
    conn.release();
  }
}

// Convenience helper used at startup to validate the pool can run a simple query.
export async function validateConnection() {
  await ensurePool();
  // run a trivial query
  const [rows] = await (pool as mysql.Pool).query('SELECT 1+1 AS res');
  return rows as any[];
}
