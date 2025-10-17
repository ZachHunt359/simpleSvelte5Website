#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.resolve(__dirname, '..', 'data', 'db.db');

const db = new Database(dbFile, { readonly: true });
try {
  console.log('Inspecting Inquiries rows (showing typeof MessTimestamp):');
  const rows = db.prepare("SELECT Id, UserId, PageSentFrom, MessTimestamp, typeof(MessTimestamp) as mt_type FROM Inquiries ORDER BY Id DESC LIMIT 10").all();
  console.table(rows);
} catch (err) {
  console.error('Error querying Inquiries:', err.message);
  process.exit(1);
} finally {
  db.close();
}
