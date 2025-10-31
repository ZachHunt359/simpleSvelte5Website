import Database from "better-sqlite3";
import path from "path";
import mysql from "mysql2/promise";
let pool = null;
function initPoolFromUrl(dbUrl) {
  const u = new URL(dbUrl);
  pool = mysql.createPool({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname ? u.pathname.replace(/^\//, "") : void 0,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z"
  });
}
async function ensurePool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not configured");
    initPoolFromUrl(process.env.DATABASE_URL);
  }
}
async function query$1(sql, params) {
  await ensurePool();
  const [rows] = await pool.query(sql, params);
  return rows;
}
async function get$1(sql, params) {
  const rows = await query$1(sql, params);
  return Array.isArray(rows) ? rows[0] : void 0;
}
async function run$1(sql, params) {
  await ensurePool();
  const [result] = await pool.execute(sql, params);
  return result;
}
async function transaction$1(fn) {
  await ensurePool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const res = await fn(conn);
    await conn.commit();
    return res;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (e) {
    }
    throw err;
  } finally {
    conn.release();
  }
}
async function validateConnection() {
  await ensurePool();
  const [rows] = await pool.query("SELECT 1+1 AS res");
  return rows;
}
const dbPath = path.resolve(process.cwd(), "data", "db.db");
let sqliteDb = null;
function getSqliteDb() {
  if (!sqliteDb) {
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("foreign_keys = ON");
  }
  return sqliteDb;
}
const useMysql = !!process.env.DATABASE_URL;
async function query(sql, params) {
  if (useMysql) return query$1(sql, params);
  const db = getSqliteDb();
  return db.prepare(sql).all(params || []);
}
async function get(sql, params) {
  if (useMysql) return get$1(sql, params);
  const db = getSqliteDb();
  return db.prepare(sql).get(params || []);
}
async function run(sql, params) {
  if (useMysql) return run$1(sql, params);
  const db = getSqliteDb();
  return db.prepare(sql).run(params || []);
}
async function transaction(fn) {
  if (useMysql) return transaction$1(fn);
  try {
    return await fn(getSqliteDb());
  } catch (e) {
    throw e;
  }
}
export {
  get as g,
  initPoolFromUrl as i,
  query as q,
  run as r,
  transaction as t,
  validateConnection as v
};
