#!/usr/bin/env node
// Seed or update an admin user in MySQL/MariaDB using DATABASE_URL
// Usage examples:
//   node scripts/seed-admin-mysql.js test.admin@example.com Password123!
//   node scripts/seed-admin-mysql.js --env development test.admin@example.com Password123!
//   node scripts/seed-admin-mysql.js --url mysql://user:pass@host:3306/db test.admin@example.com Password123!
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { env: null, url: null, email: null, password: null };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && i + 1 < args.length) {
      result.env = args[i + 1];
      i++; // skip next arg as it's the value
    } else if (args[i] === '--url' && i + 1 < args.length) {
      result.url = args[i + 1];
      i++; // skip next arg as it's the value
    } else if (!result.email) {
      result.email = args[i];
    } else if (!result.password) {
      result.password = args[i];
    }
  }
  
  return result;
}

function tryLoadDotenv(mode = null) {
  // Load environment files in Vite/SvelteKit order:
  // 1. .env (always loaded)
  // 2. .env.local (always loaded, gitignored)
  // 3. .env.[mode] (only if mode specified)
  // 4. .env.[mode].local (only if mode specified, gitignored)
  
  const files = ['.env'];
  if (fs.existsSync('.env.local')) files.push('.env.local');
  if (mode) {
    if (fs.existsSync(`.env.${mode}`)) files.push(`.env.${mode}`);
    if (fs.existsSync(`.env.${mode}.local`)) files.push(`.env.${mode}.local`);
  }
  
  for (const file of files) {
    try {
      const envPath = path.resolve(process.cwd(), file);
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
          // Later files override earlier ones, but existing env vars have highest priority
          if (!process.env[key]) process.env[key] = val;
        }
        console.log(`[seed-admin] loaded ${file}`);
      }
    } catch (e) {
      console.warn(`[seed-admin] could not read ${file}:`, e && e.message ? e.message : e);
    }
  }
}

const args = parseArgs();

if (!args.email || !args.password) {
  console.error('Usage: node scripts/seed-admin-mysql.js [--env development|production|staging] [--url database_url] <email> <password>');
  console.error('Examples:');
  console.error('  node scripts/seed-admin-mysql.js test@example.com Pass123!');
  console.error('  node scripts/seed-admin-mysql.js --env development test@example.com Pass123!');
  console.error('  node scripts/seed-admin-mysql.js --url mysql://user:pass@host:3306/db test@example.com Pass123!');
  process.exit(1);
}

// Load environment files based on mode
tryLoadDotenv(args.env);

// Set NODE_ENV if specified via --env parameter
if (args.env && !process.env.NODE_ENV) {
  process.env.NODE_ENV = args.env === 'development' ? 'development' : 'production';
}

const email = args.email.trim().toLowerCase();
const password = args.password;
const dbUrl = args.url || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('[seed-admin] DATABASE_URL is not set. Please set it in your environment, .env file, or use --url parameter');
  console.error(`[seed-admin] Mode: ${args.env || 'auto-detect'}`);
  process.exit(2);
}

async function main() {
  console.log('[seed-admin] email:', email);
  console.log('[seed-admin] password length:', password.length);
  console.log('[seed-admin] mode:', args.env || 'auto-detect');
  console.log('[seed-admin] database URL:', dbUrl.replace(/:\/\/[^@]+@/, '://***:***@')); // mask credentials
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
