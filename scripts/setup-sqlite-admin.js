#!/usr/bin/env node
// Seed a local SQLite DB with minimal tables and a test admin user
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const root = process.cwd();
const dataDir = path.resolve(root, 'data');
const dbPath = path.resolve(dataDir, 'db.db');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

// Minimal schema for auth tests
db.exec(`
CREATE TABLE IF NOT EXISTS AdminUsers (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Email TEXT NOT NULL UNIQUE,
  PasswordHash TEXT NOT NULL,
  CreatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS Sessions (
  Token TEXT PRIMARY KEY,
  UserId TEXT NOT NULL,
  CreatedAt INTEGER NOT NULL,
  ExpiresAt INTEGER NULL
);
CREATE INDEX IF NOT EXISTS IX_Sessions_UserId ON Sessions(UserId);
`);

const email = process.env.TEST_ADMIN_EMAIL || 'test@example.com';
const password = process.env.TEST_ADMIN_PASSWORD || 'test1234';
const hash = bcrypt.hashSync(password, 10);

// Upsert user
const row = db.prepare('SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)').get(email);
if (!row) {
  const info = db.prepare('INSERT INTO AdminUsers (Email, PasswordHash) VALUES (?, ?)').run(email, hash);
  console.log('Created test admin user:', email, 'id=', info.lastInsertRowid);
} else {
  db.prepare('UPDATE AdminUsers SET PasswordHash = ? WHERE Id = ?').run(hash, row.Id);
  console.log('Updated password for existing admin user:', email, 'id=', row.Id);
}

db.close();
console.log('SQLite admin setup complete at', dbPath);
