#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
const db=new Database(path.resolve(process.cwd(),'data','db.db'));
const rows = db.prepare('SELECT Id, Email, SeenByUser, SentMessageId FROM Inquiries WHERE Id IN (3,5)').all();
console.log(rows);
