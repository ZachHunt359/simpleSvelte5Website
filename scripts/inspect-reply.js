#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.resolve(__dirname, '..', 'data', 'db.db');

const db = new Database(dbFile, { readonly: true });
try {
  const id = process.argv[2] ? Number(process.argv[2]) : 3;
  const row = db.prepare(`SELECT Id, UserId, PageSentFrom, Message, Reply, ReplyTimestamp, typeof(ReplyTimestamp) as rt_type FROM Inquiries WHERE Id = ?`).get(id);
  if (!row) {
    console.log('No row found for Id', id);
    process.exit(0);
  }
  if (row.ReplyTimestamp && typeof row.ReplyTimestamp === 'number') {
    row.ReplyTimestampIso = new Date(row.ReplyTimestamp * 1000).toISOString();
  }
  console.table([row]);
} catch (err) {
  console.error('Error inspecting reply:', err.message);
  process.exit(1);
} finally {
  db.close();
}
