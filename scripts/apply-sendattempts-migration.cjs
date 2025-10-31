const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(process.cwd(), 'data', 'db.db');
const sqlPath = path.resolve(process.cwd(), 'data', 'migrate_add_send_attempts_and_columns.sql');

if (!fs.existsSync(dbPath)) {
  console.error('DB not found at', dbPath);
  process.exit(1);
}
if (!fs.existsSync(sqlPath)) {
  console.error('Migration SQL not found at', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const db = new Database(dbPath);
try {
  console.log('Applying migration:', path.basename(sqlPath));
  db.exec(sql);
  console.log('Applied. PRAGMA table_info(Inquiries):');
  const info = db.prepare("PRAGMA table_info('Inquiries')").all();
  console.table(info);
  console.log('If SendAttempts table should exist; listing tables:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.table(tables);
} catch (err) {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
} finally {
  db.close();
}
