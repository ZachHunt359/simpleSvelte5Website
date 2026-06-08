import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { isAdmin } from '$lib/auth/helpers';
import { logError } from '$lib/logger';
import { PANELS_CONFIG } from '$lib/config/panels.server';

const PANELS_DIR = path.resolve(PANELS_CONFIG.panelsDir);
// import { logInfo } from '$lib/logger';

async function listFiles(dir: string, base = ''): Promise<string[]> {
  let out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`[listFiles] Failed to read dir: ${dir}`, e);
    return [];
  }
    for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const rel = base ? path.posix.join(base, ent.name) : ent.name;
    console.log(`[listFiles] Traversing:`, { full, rel, isDir: ent.isDirectory(), isFile: ent.isFile() });
    if (ent.isDirectory()) {
      out = out.concat(await listFiles(full, rel));
    } else if (ent.isFile()) {
        // Skip internal metadata files and JSON files (like _order.json)
        if (ent.name.startsWith('_') || ent.name.toLowerCase().endsWith('.json')) {
          console.log('[listFiles] Skipping metadata/json file:', rel);
        } else {
          out.push(rel.replace(/\\/g, '/'));
          console.log(`[listFiles] Found file:`, rel.replace(/\\/g, '/'));
        }
    }
  }
  return out;
}

export const GET: RequestHandler = async ({ cookies }) => {
  if (!(await isAdmin(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  console.log('[api/panels/list] resolved PANELS_DIR:', PANELS_DIR);
  try {
    // Check if directory exists and is a directory
    let stat;
    try {
      stat = await fs.stat(PANELS_DIR);
    } catch (e) {
      console.error('[api/panels/list] panels dir missing:', PANELS_DIR, e);
      return new Response(JSON.stringify({ error: 'Panels directory not found', path: PANELS_DIR }), { status: 404 });
    }
    if (!stat.isDirectory()) {
      console.error('[api/panels/list] panels dir is not a directory:', PANELS_DIR);
      return new Response(JSON.stringify({ error: 'Panels path is not a directory', path: PANELS_DIR }), { status: 400 });
    }
    const files = await listFiles(PANELS_DIR);
    console.log('[api/panels/list] files found:', files.length, files);
    return new Response(JSON.stringify(files), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    console.error('[api/panels/list] error', stack, 'PANELS_DIR:', PANELS_DIR);
    return new Response(JSON.stringify({ error: 'Server error', __fallbackError: 'Failed to list panels (see server logs)' }), { status: 500 });
  }
};