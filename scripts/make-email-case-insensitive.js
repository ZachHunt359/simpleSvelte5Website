// Usage: node scripts/make-email-case-insensitive.js
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

function tryLoadDotenv(mode = null) {
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
          if (!process.env[key]) process.env[key] = val;
        }
        console.log(`[make-email-case-insensitive] loaded ${file}`);
      }
    } catch (e) {
      console.warn(`[make-email-case-insensitive] could not read ${file}:`, e && e.message ? e.message : e);
    }
  }
}

tryLoadDotenv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[make-email-case-insensitive] DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  const u = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname ? u.pathname.replace(/^\//, '') : undefined
  });
  try {
    console.log('[make-email-case-insensitive] Running ALTER TABLE...');
    await connection.query(`ALTER TABLE AdminUsers MODIFY Email VARCHAR(255) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci;`);
    console.log('[make-email-case-insensitive] Email column updated to case-insensitive (utf8mb4_unicode_ci).');
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error('[make-email-case-insensitive] error:', e && e.message ? e.message : e);
  process.exit(2);
});