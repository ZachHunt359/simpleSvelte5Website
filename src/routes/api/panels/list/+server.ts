import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { isAdmin } from '$lib/auth/helpers';
import { logError } from '$lib/logger';

const PANELS_DIR = path.resolve('static/panels');

async function listFiles(dir: string, base = ''): Promise<string[]> {
  let out: string[] = [];
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
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  return out;
}

export const GET: RequestHandler = async ({ cookies }) => {
  if (!(await isAdmin(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const files = await listFiles(PANELS_DIR);
    return new Response(JSON.stringify(files), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[api/panels/list] error', { stack });
    return new Response(JSON.stringify({ error: 'Server error', __fallbackError: 'Failed to list panels (see server logs)' }), { status: 500 });
  }
};