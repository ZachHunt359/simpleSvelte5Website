#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
const db = new Database(path.resolve(process.cwd(),'data','db.db'),{readonly:true});
const rows = db.prepare('SELECT Id, UserId, Email, SeenByUser, Reply, CAST(MessTimestamp AS INTEGER) as ts FROM Inquiries ORDER BY ts DESC LIMIT 20').all();
console.log(rows.map(r=>({Id:r.Id,UserId:r.UserId,Email:r.Email,SeenByUser:r.SeenByUser,Reply:r.Reply,ts:r.ts}))); 
