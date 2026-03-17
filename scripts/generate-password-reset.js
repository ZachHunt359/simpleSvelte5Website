#!/usr/bin/env node
// Generate a password reset link for an admin user
// Usage examples:
//   node scripts/generate-password-reset.js admin@example.com
//   node scripts/generate-password-reset.js --env development admin@example.com
//   node scripts/generate-password-reset.js --env production admin@example.com
//   node scripts/generate-password-reset.js --url mysql://user:pass@host:3306/db admin@example.com
import mysql from 'mysql2/promise';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

const RESET_TOKEN_EXPIRY = 60 * 60; // 1 hour in seconds

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { env: null, url: null, email: null };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && i + 1 < args.length) {
      result.env = args[i + 1];
      i++;
    } else if (args[i] === '--url' && i + 1 < args.length) {
      result.url = args[i + 1];
      i++;
    } else if (!result.email) {
      result.email = args[i];
    }
  }
  
  return result;
}

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
          process.env[key] = val;
        }
        console.log(`[reset-link] loaded ${file}`);
      }
    } catch (e) {
      console.warn(`[reset-link] could not read ${file}:`, e && e.message ? e.message : e);
    }
  }
}

const args = parseArgs();

if (!args.email) {
  console.error('Usage: node scripts/generate-password-reset.js [--env development|production|staging] [--url database_url] <email>');
  console.error('Examples:');
  console.error('  node scripts/generate-password-reset.js admin@example.com');
  console.error('  node scripts/generate-password-reset.js --env development admin@example.com');
  console.error('  node scripts/generate-password-reset.js --env production admin@example.com');
  process.exit(1);
}

tryLoadDotenv(args.env);

if (args.env && !process.env.NODE_ENV) {
  process.env.NODE_ENV = args.env === 'development' ? 'development' : 'production';
}

const email = args.email.trim().toLowerCase();
const dbUrl = args.url || process.env.DATABASE_URL;
const siteOrigin = process.env.SITE_ORIGIN || 'http://localhost:5173';

if (!dbUrl) {
  console.error('[reset-link] DATABASE_URL is not set. Please set it in your environment, .env file, or use --url parameter');
  console.error(`[reset-link] Mode: ${args.env || 'auto-detect'}`);
  process.exit(2);
}

async function main() {
  console.log('[reset-link] email:', email);
  console.log('[reset-link] mode:', args.env || 'auto-detect');
  console.log('[reset-link] database URL:', dbUrl.replace(/:\/\/[^@]+@/, '://***:***@'));
  
  const u = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname ? u.pathname.replace(/^\//, '') : undefined
  });
  
  try {
    // Check if admin user exists
    const [rows] = await connection.execute(
      'SELECT Id, Email FROM AdminUsers WHERE lower(Email) = lower(?)',
      [email]
    );
    
    const admin = Array.isArray(rows) ? rows[0] : undefined;
    
    if (!admin) {
      console.error('[reset-link] ERROR: No admin user found with email:', email);
      console.error('[reset-link] Please check the email address or create the admin user first.');
      process.exit(3);
    }
    
    console.log('[reset-link] Found admin user:', admin.Email, 'ID:', admin.Id);
    
    // Generate secure random token
    const token = randomBytes(32).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + RESET_TOKEN_EXPIRY;
    
    // Store reset token
    await connection.execute(
      'INSERT INTO PasswordResets (Token, AdminUserId, CreatedAt, ExpiresAt) VALUES (?, ?, ?, ?)',
      [token, admin.Id, now, expiresAt]
    );
    
    const resetUrl = `${siteOrigin}/reset-password?token=${token}`;
    const expiresDate = new Date(expiresAt * 1000).toLocaleString();
    
    console.log('');
    console.log('=============================================');
    console.log('PASSWORD RESET LINK GENERATED');
    console.log('=============================================');
    console.log('Admin:', admin.Email);
    console.log('Reset URL:', resetUrl);
    console.log('Valid until:', expiresDate);
    console.log('Valid for: 1 hour');
    console.log('=============================================');
    console.log('');
    console.log('Send this link to the admin user to reset their password.');
    console.log('The link will expire in 1 hour and can only be used once.');
    
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error('[reset-link] error:', e && e.message ? e.message : e);
  process.exit(4);
});