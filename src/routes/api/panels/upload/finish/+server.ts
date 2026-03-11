import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync, readdirSync, unlinkSync, rmdirSync } from 'fs';
import { isAdmin } from '$lib/auth/helpers';
import { logError, logInfo } from '$lib/logger';

const PANELS_DIR = path.resolve('static/panels');

/**
 * Normalize upload path: lowercase chapter and device folder names for consistency
 * Example: "Chapter-1/Desktop/file.png" -> "chapter-1/desktop/file.png"
 */
function normalizeUploadPath(relPath: string): string {
  const parts = relPath.split('/');
  
  // Normalize chapter folder (first segment matching chapter-N pattern)
  if (parts.length > 0 && /^chapter-\d+$/i.test(parts[0])) {
    parts[0] = parts[0].toLowerCase();
  }
  
  // Normalize device folder (second segment matching desktop/mobile)
  if (parts.length > 1 && /^(desktop|mobile)$/i.test(parts[1])) {
    parts[1] = parts[1].toLowerCase();
  }
  
  return parts.join('/');
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!(await isAdmin(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const relativePath = (body.relativePath || body.relativepath || '') as string;
    const totalChunks = Number(body.totalChunks || body.total_chunks || body.total);

    if (!relativePath || !totalChunks || Number.isNaN(totalChunks)) {
      return new Response(JSON.stringify({ error: 'Missing relativePath or totalChunks' }), { status: 400 });
    }

    // normalize and safety
    let relPath = path.posix.normalize(relativePath).replace(/^\/+/, '');
    if (relPath.includes('..')) return new Response(JSON.stringify({ error: 'Invalid relativePath' }), { status: 400 });
    
    // Normalize chapter and device folder names to lowercase
    relPath = normalizeUploadPath(relPath);

    const tmpBase = path.join(PANELS_DIR, '.upload_tmp');
    const safeDir = path.join(tmpBase, path.dirname(relPath));
    const baseName = path.basename(relPath);

    // Collect chunk paths
    const parts: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(safeDir, `${baseName}.part${i}`);
      if (!existsSync(chunkPath)) {
        return new Response(JSON.stringify({ error: 'Missing chunk', index: i }), { status: 400 });
      }
      parts.push(chunkPath);
    }

    // Ensure destination directory exists
    const destPath = path.join(PANELS_DIR, relPath);
    const destDir = path.dirname(destPath);
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

    // Assemble into a temp file then rename atomically
    const tmpAssemble = destPath + '.tmp';
    const fd = await fs.open(tmpAssemble, 'w');
    try {
      for (const p of parts) {
        const data = await fs.readFile(p);
        await fd.write(data);
      }
    } finally {
      await fd.close();
    }

    // Move assembled file into place
    await fs.rename(tmpAssemble, destPath);

    // Cleanup chunk files and possibly empty dirs
    try {
      for (const p of parts) {
        try { unlinkSync(p); } catch (e) {}
      }
      // remove safeDir if empty
      const remaining = readdirSync(safeDir).filter(f => !f.startsWith('.keep'));
      if (remaining.length === 0) {
        try { rmdirSync(safeDir); } catch (e) {}
      }
      // try to remove tmpBase subdirs that are empty
      // Note: don't attempt to recursively remove higher-level dirs unless empty
    } catch (e) {
      // ignore cleanup errors
    }

    try { logInfo('[panels:upload:finish] assembled', { relPath, totalChunks }); } catch {}

    return new Response(JSON.stringify({ success: true, path: relPath }), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[panels:upload:finish] error', { stack });
    return new Response(JSON.stringify({ error: 'Assemble failed' }), { status: 500 });
  }
};
