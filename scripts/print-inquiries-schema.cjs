const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(process.cwd(), 'data', 'db.db');
const db = new Database(dbPath);
const rows = db.prepare("PRAGMA table_info('Inquiries')").all();
console.log('PRAGMA table_info(Inquiries):');
console.table(rows);
