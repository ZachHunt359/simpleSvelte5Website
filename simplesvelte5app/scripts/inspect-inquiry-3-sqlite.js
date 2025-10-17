#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
const dbPath = path.resolve(process.cwd(), 'data', 'db.db');
const db = new Database(dbPath, { readonly: true });
const row = db.prepare('SELECT Id, Email, SeenByUser, Reply, ReplyTimestamp FROM Inquiries WHERE Id = ?').get(3);
console.log(row);
