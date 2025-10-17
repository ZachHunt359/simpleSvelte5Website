const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'db.db');

function loadMigrationsFromDisk() {
  if (!fs.existsSync(dataDir)) return [];
  return fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.sql') && f.startsWith('migrate_'))
    .sort()
    .map(name => ({ name }));
}

function loadAppliedMigrations() {
  if (!fs.existsSync(dbPath)) return new Map();
  const db = new Database(dbPath, { readonly: true });
  try {
    const rows = db.prepare('SELECT Name, AppliedAt FROM Migrations').all();
    const m = new Map();
    for (const r of rows) m.set(r.Name, r.AppliedAt);
    return m;
  } catch (e) {
    console.error('failed to read Migrations table', e.message || e);
    return new Map();
  } finally {
    db.close();
  }
}

(async function(){
  const disk = loadMigrationsFromDisk();
  const applied = loadAppliedMigrations();
  const list = disk.map(d => ({ name: d.name, appliedAt: applied.get(d.name) ?? null }));
  console.log(JSON.stringify({ migrations: list }, null, 2));
})();
