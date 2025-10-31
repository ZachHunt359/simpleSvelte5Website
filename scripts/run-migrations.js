#!/usr/bin/env node
// Run SQL migrations against data/db.db using better-sqlite3 (ESM-compatible)
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.resolve(__dirname, '..', 'data', 'db.db');
const migrFile = path.resolve(__dirname, '..', 'data', 'migrate_set_pagesentfrom_default.sql');

if (!fs.existsSync(dbFile)) {
  console.error('DB file not found at', dbFile);
  process.exit(1);
}
if (!fs.existsSync(migrFile)) {
  console.error('Migration file not found at', migrFile);
  process.exit(1);
}

const sql = fs.readFileSync(migrFile, 'utf8');
const db = new Database(dbFile);

try {
  console.log('Current Inquiries table schema (before migration):');
  try {
    const infoBefore = db.prepare("PRAGMA table_info('Inquiries')").all();
    console.table(infoBefore);
  } catch (e) {
    console.log('Could not read Inquiries schema (table may not exist yet):', e.message);
  }

  console.log('\nSample last 5 inquiries (before migration, if table exists):');
  try {
    const rowsBefore = db.prepare(`SELECT Id, UserId, PageSentFrom, Message, MessTimestamp FROM Inquiries ORDER BY MessTimestamp DESC LIMIT 5`).all();
    for (const r of rowsBefore) {
      r.MessTimestamp = typeof r.MessTimestamp === 'number' ? new Date(r.MessTimestamp * 1000).toISOString() : String(r.MessTimestamp);
    }
    console.table(rowsBefore);
  } catch (e) {
    console.log('Could not read inquiries rows (table may not exist yet):', e.message);
  }

  console.log('\nAttempting to apply migration SQL...');
  // Migration SQL already contains BEGIN/COMMIT, execute directly
  db.exec(sql);
  console.log('Migration applied successfully.');

  console.log('\nPRAGMA table_info(Inquiries) (after migration):');
  const info = db.prepare("PRAGMA table_info('Inquiries')").all();
  console.table(info);

  console.log('\nLast 5 inquiries (after migration):');
  const rows = db.prepare(`SELECT Id, UserId, PageSentFrom, Message, MessTimestamp FROM Inquiries ORDER BY MessTimestamp DESC LIMIT 5`).all();
  // Convert MessTimestamp to readable form for display
  for (const r of rows) {
    r.MessTimestamp = typeof r.MessTimestamp === 'number' ? new Date(r.MessTimestamp * 1000).toISOString() : String(r.MessTimestamp);
  }
  console.table(rows);
} catch (err) {
  console.error('Migration failed:', err);
  try { db.exec('ROLLBACK'); } catch (e) {}
  process.exit(1);
} finally {
  db.close();
}
