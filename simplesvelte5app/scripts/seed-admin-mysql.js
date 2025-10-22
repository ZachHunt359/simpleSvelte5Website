#!/usr/bin/env node
// Seed or update an admin user in MySQL/MariaDB using DATABASE_URL
// Usage (PowerShell):
//   $env:DATABASE_URL="mysql://user:pass@127.0.0.1:3306/paranoid_DB"; node scripts/seed-admin-mysql.js test.admin@example.com Password123!
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

function tryLoadDotenv() {
  // Lightweight .env parser for local runs if DATABASE_URL not set
  if (process.env.DATABASE_URL) return;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const l = line.trim();
        if (!l || l.startsWith('#')) continue;
        const eq = l.indexOf('=');
        if (eq === -1) continue;
        const key = l.slice(0, eq).trim();
        let val = l.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
      console.log('[seed-admin] loaded .env');
    }
  } catch (e) {
    console.warn('[seed-admin] could not read .env:', e && e.message ? e.message : e);
  }
}

tryLoadDotenv();

const email = (process.argv[2] || '').trim().toLowerCase();
const password = process.argv[3] || '';

if (!email || !password) {
  console.error('Usage: node scripts/seed-admin-mysql.js <email> <password>');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[seed-admin] DATABASE_URL is not set. Please set it in your environment or .env');
  process.exit(2);
}

async function main() {
  console.log('[seed-admin] email:', email);
  console.log('[seed-admin] password length:', password.length);
  const u = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname ? u.pathname.replace(/^\//, '') : undefined
  });
  try {
    // Ensure AdminUsers exists (no-op if schema already applied)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS AdminUsers (
        Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        Email VARCHAR(255) NOT NULL UNIQUE,
        PasswordHash TEXT NOT NULL,
        CreatedAt INT NOT NULL DEFAULT (UNIX_TIMESTAMP())
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const hash = bcrypt.hashSync(password, 10);
    const epoch = Math.floor(Date.now() / 1000);

    const [result] = await connection.execute(
      `INSERT INTO AdminUsers (Email, PasswordHash, CreatedAt)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE PasswordHash = VALUES(PasswordHash)`,
      [email, hash, epoch]
    );

    console.log('[seed-admin] upserted admin:', email);

    // Verify what is stored and whether it matches the provided password
    const [rows] = await connection.execute(
      'SELECT Id, Email, PasswordHash FROM AdminUsers WHERE lower(Email) = lower(?)',
      [email]
    );
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (row) {
      const stored = row.PasswordHash;
      const ok = bcrypt.compareSync(password, stored);
      const sameAsGenerated = stored === hash;
      const okAgainstGenerated = bcrypt.compareSync(password, hash);
      console.log('[seed-admin] stored hash:', stored);
      console.log('[seed-admin] bcrypt.compareSync(password, stored) =>', ok);
      console.log('[seed-admin] stored === freshlyGeneratedHash =>', sameAsGenerated);
      console.log('[seed-admin] bcrypt.compareSync(password, freshlyGeneratedHash) =>', okAgainstGenerated);
      if (!ok) {
        console.warn('[seed-admin] WARNING: Stored hash does not match provided password.');
      }
    } else {
      console.warn('[seed-admin] WARNING: Could not re-read admin row after upsert.');
    }
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error('[seed-admin] error:', e && e.message ? e.message : e);
  process.exit(3);
});
