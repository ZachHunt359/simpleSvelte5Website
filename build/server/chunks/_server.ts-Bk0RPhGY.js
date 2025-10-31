import fs from 'fs/promises';
import path from 'path';
import { i as isAdmin } from './helpers-S__xQH7Y.js';
import { a as logError } from './logger-C0P_e9_2.js';
import './cookie-CxBKF6rI.js';
import 'debug';
import 'neverthrow';
import './db-DArO5U0k.js';
import 'better-sqlite3';
import 'mysql2/promise';
import 'bcryptjs';
import 'crypto';

const PANELS_DIR = path.resolve("static/panels");
async function listFiles(dir, base = "") {
  let out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    return [];
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const rel = base ? path.posix.join(base, ent.name) : ent.name;
    if (ent.isDirectory()) {
      out = out.concat(await listFiles(full, rel));
    } else if (ent.isFile()) {
      out.push(rel.replace(/\\/g, "/"));
    }
  }
  return out;
}
const GET = async ({ cookies }) => {
  if (!await isAdmin(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const files = await listFiles(PANELS_DIR);
    return new Response(JSON.stringify(files), { status: 200 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/panels/list] error", { stack });
    return new Response(JSON.stringify({ error: "Server error", __fallbackError: "Failed to list panels (see server logs)" }), { status: 500 });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-Bk0RPhGY.js.map
