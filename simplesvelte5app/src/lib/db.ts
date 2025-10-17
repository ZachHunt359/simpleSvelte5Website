import Database from 'better-sqlite3';
import path from 'path';
import * as dbMysql from './db-mysql';

const dbPath = path.resolve(process.cwd(), 'data', 'db.db');
let sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (!sqliteDb) {
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
  }
  return sqliteDb;
}

const useMysql = !!process.env.DATABASE_URL;

// Unified async API: query/get/run/transaction
export async function query(sql: string, params?: any[]) {
  if (useMysql) return dbMysql.query(sql, params);
  const db = getSqliteDb();
  return db.prepare(sql).all(params || []);
}

export async function get(sql: string, params?: any[]) {
  if (useMysql) return dbMysql.get(sql, params);
  const db = getSqliteDb();
  return db.prepare(sql).get(params || []);
}

export async function run(sql: string, params?: any[]) {
  if (useMysql) return dbMysql.run(sql, params);
  const db = getSqliteDb();
  return db.prepare(sql).run(params || []);
}

export async function transaction<T>(fn: (tx: any) => Promise<T>) {
  if (useMysql) return dbMysql.transaction(fn as any);
  try {
    return await fn(getSqliteDb());
  } catch (e) {
    throw e;
  }
}

// Backwards compatibility: getDb only when using sqlite
export function getDb(): Database.Database {
  if (useMysql) throw new Error('getDb() is not available when using MySQL (set DATABASE_URL)');
  return getSqliteDb();
}