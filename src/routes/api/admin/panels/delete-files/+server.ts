import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { isAdmin } from '$lib/auth/helpers';
import { logError, logInfo } from '$lib/logger';
import { PANELS_CONFIG } from '$lib/config/panels.server';

const PANELS_DIR = path.resolve(PANELS_CONFIG.panelsDir);

/**
 * Delete one or more files from the panels directory.
 * Expects { paths: string[] } where each path is relative to static/panels/
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!(await isAdmin(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const paths = body?.paths;

    if (!Array.isArray(paths) || paths.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid or empty paths array' }), { status: 400 });
    }

    const results = { deleted: [], failed: [], notFound: [] };

    for (const relPath of paths) {
      if (!relPath || typeof relPath !== 'string') {
        results.failed.push({ path: relPath, reason: 'Invalid path' });
        continue;
      }

      // Normalize and prevent directory traversal
      const normalized = path.posix.normalize(relPath).replace(/^\/+/, '');
      if (normalized.includes('..')) {
        results.failed.push({ path: relPath, reason: 'Invalid path: contains ..' });
        continue;
      }

      const fullPath = path.join(PANELS_DIR, normalized);

      // Ensure path is within PANELS_DIR (security check)
      if (!fullPath.startsWith(PANELS_DIR)) {
        results.failed.push({ path: relPath, reason: 'Path outside panels directory' });
        continue;
      }

      // Check if file exists
      if (!existsSync(fullPath)) {
        results.notFound.push(relPath);
        continue;
      }

      try {
        await fs.unlink(fullPath);
        results.deleted.push(relPath);
        logInfo('[panels:delete-files] deleted', { path: relPath });
      } catch (err) {
        results.failed.push({ path: relPath, reason: String(err) });
        logError('[panels:delete-files] failed to delete', { path: relPath, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[panels:delete-files] error', { stack });
    return new Response(JSON.stringify({ error: 'Delete failed', __fallbackError: 'Delete failed (see server logs)' }), { status: 500 });
  }
};
