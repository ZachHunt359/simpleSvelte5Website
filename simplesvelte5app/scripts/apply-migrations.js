import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// Resolve __dirname correctly in ESM across platforms
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
// Default DB path is data/db.db unless overridden by DATABASE_PATH
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'db.db');

function loadMigrations() {
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.sql') && f.startsWith('migrate_'))
    .sort();
  return files.map(f => ({ name: f, path: path.join(dataDir, f), sql: fs.readFileSync(path.join(dataDir, f), 'utf8') }));
}

function ensureMigrationsTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS Migrations (Name TEXT PRIMARY KEY, AppliedAt INTEGER NOT NULL)`);
}

function appliedMigrations(db) {
  const rows = db.prepare('SELECT Name FROM Migrations').all();
  return new Set(rows.map(r => r.Name));
}

function applyMigration(db, mig) {
  console.log('Applying', mig.name);
  // If the migration file contains a single top-level transaction wrapper, strip it.
  // Remove standalone BEGIN/COMMIT lines to avoid nested transaction issues.
  // This allows migration files that toggle PRAGMA before/after a transaction to run here.
  let sql = mig.sql;
  const beginLine = /^\s*BEGIN(?:\s+TRANSACTION)?;?\s*$/gim;
  const commitLine = /^\s*COMMIT;?\s*$/gim;
  if (beginLine.test(sql) || commitLine.test(sql)) {
    sql = sql.replace(beginLine, '').replace(commitLine, '').trim();
    console.log('Removed BEGIN/COMMIT lines from', mig.name);
  }

  try {
    try {
      db.exec(sql);
    } catch (innerErr) {
      const imsg = String(innerErr && innerErr.message || innerErr);
      if (/cannot start a transaction within a transaction/i.test(imsg)) {
        console.warn('Nested transaction error, falling back to statement-by-statement execution');
        // Fallback: execute statements individually split by semicolon.
        const parts = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
        for (const stmt of parts) {
          db.exec(stmt);
        }
      } else {
        throw innerErr;
      }
    }
    db.prepare('INSERT OR REPLACE INTO Migrations (Name, AppliedAt) VALUES (?, ?)').run(mig.name, Math.floor(Date.now() / 1000));
  } catch (e) {
    const msg = String(e && e.message || e);
    // Treat common "already exists" / duplicate column errors as non-fatal: record migration as applied
    if (/duplicate column name|already exists|duplicate column/i.test(msg)) {
      console.warn('Non-fatal migration error (likely already applied):', msg);
      db.prepare('INSERT OR REPLACE INTO Migrations (Name, AppliedAt) VALUES (?, ?)').run(mig.name, Math.floor(Date.now() / 1000));
    } else {
      throw e;
    }
  }
}

function main() {
  console.log('MIGRATIONS: DB path=', dbPath);
  const db = new Database(dbPath);
  ensureMigrationsTable(db);
  const applied = appliedMigrations(db);
  const migrations = loadMigrations();
  for (const m of migrations) {
    if (!applied.has(m.name)) {
      try {
        applyMigration(db, m);
        console.log('Applied', m.name);
      } catch (e) {
        console.error('Failed to apply', m.name, e);
        // Do not attempt ROLLBACK here; migrations may manage their own transactions
        process.exit(1);
      }
    } else {
      console.log('Skipping already applied', m.name);
    }
  }
  console.log('Migrations complete');
  db.close();
}

if (import.meta.url === process.argv[1] || import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
