import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';
import { get, query } from '$lib/db';

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'db.db');

function loadMigrationsFromDisk() {
  if (!fs.existsSync(dataDir)) return [];
  return fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.sql') && f.startsWith('migrate_'))
    .sort()
    .map(name => ({ name }));
}

async function loadAppliedMigrations() {
  try {
    const rows = await query('SELECT Name, AppliedAt FROM Migrations');
    const m = new Map();
    for (const r of rows) m.set(r.Name, r.AppliedAt);
    return m;
  } catch (e) {
    return new Map();
  }
}

export const GET: RequestHandler = async ({ locals }) => {
  // admin-only: check locals.user and AdminUsers table
  if (!locals.user || !locals.user.email) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 403 });
  }
  try {
    const row = await get('SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)', [locals.user.email]);
    if (!row) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 403 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }

  const disk = loadMigrationsFromDisk();
  const applied = await loadAppliedMigrations();

  const list = disk.map(d => ({ name: d.name, appliedAt: applied.get(d.name) ?? null }));

  return new Response(JSON.stringify({ migrations: list }), { status: 200, headers: { 'content-type': 'application/json' } });
};

// No default export for SvelteKit endpoints; named exports (GET, POST, etc.) are used.
