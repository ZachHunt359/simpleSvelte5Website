#!/usr/bin/env node
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

function tryLoadDotenv() {
  // Lightweight .env parser (only if env var not already set)
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
      console.log('[test-mariadb-connection] loaded .env');
    }
  } catch (e) {
    console.warn('[test-mariadb-connection] could not read .env:', e && e.message ? e.message : e);
  }
}

async function run() {
  // Try to load .env so DATABASE_URL is available when running directly
  tryLoadDotenv();

  const arg = process.argv[2];
  const dbUrl = process.env.DATABASE_URL || arg;

  if (!dbUrl) {
    console.log('No DATABASE_URL provided. Trying default localhost:3306 with user=root and empty password.');
  } else {
    console.log('Using DB URL:', dbUrl);
  }

  try {
    let conn;
    if (dbUrl) {
      // Allow full URL or mysql://user:pass@host:port/db
      const u = new URL(dbUrl);
      conn = await mysql.createConnection({
        host: u.hostname,
        port: Number(u.port) || 3306,
        user: decodeURIComponent(u.username) || 'root',
        password: decodeURIComponent(u.password) || '',
        database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
      });
    } else {
      conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '' });
    }

    const [rows] = await conn.query('SELECT 1+1 AS res');
    console.log('Test query succeeded. Result:', rows);
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Connection/test query failed:');
    if (err && err.message) console.error(err.message);
    else console.error(err);
    process.exit(2);
  }
}

run();
