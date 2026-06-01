import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';
import { isAdmin } from '$lib/auth/helpers';
import { logError, logInfo } from '$lib/logger';
import { PANELS_CONFIG } from '$lib/config/panels.server';

const PANELS_DIR = path.resolve(PANELS_CONFIG.panelsDir);

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
  // Support two modes:
  // - regular upload: form field 'files' contains uploaded File objects
  // - chunked upload: request URL contains ?chunk=true and the form contains a single 'chunk' file plus metadata
  const url = new URL(request.url);
  const isChunk = url.searchParams.get('chunk') === 'true';

  try {
    if (isChunk) {
      // handle a single chunk upload
      const formData = await request.formData();
      const chunk = formData.get('chunk') as File | null;
      const relativePath = (formData.get('relativePath') as string) || (formData.get('relativepath') as string) || '';
      const chunkIndex = Number(formData.get('chunkIndex'));
      const totalChunks = Number(formData.get('totalChunks')) || undefined;

      if (!chunk || !relativePath || Number.isNaN(chunkIndex)) {
        return new Response(JSON.stringify({ error: 'Missing chunk, relativePath or chunkIndex' }), { status: 400 });
      }

      // normalize relative path and prevent traversal
      let relPath = path.posix.normalize(relativePath).replace(/^\/+/, '');
      if (relPath.includes('..')) return new Response(JSON.stringify({ error: 'Invalid relativePath' }), { status: 400 });
      
      // Normalize chapter and device folder names to lowercase
      relPath = normalizeUploadPath(relPath);

      // ensure tmp dir exists
      const tmpBase = path.join(PANELS_DIR, '.upload_tmp');
      const safeDir = path.join(tmpBase, path.dirname(relPath));
      if (!existsSync(safeDir)) mkdirSync(safeDir, { recursive: true });

      // store chunk as: .upload_tmp/<relpath>.part<index>
      const chunkName = `${path.basename(relPath)}.part${chunkIndex}`;
      const chunkPath = path.join(safeDir, chunkName);
      // @ts-ignore
      const ab = await chunk.arrayBuffer();
      await fs.writeFile(chunkPath, Buffer.from(ab));

      // optionally log progress
      try { logInfo('[panels:upload] chunk saved', { relPath, chunkIndex, totalChunks }); } catch {}

      return new Response(JSON.stringify({ success: true, chunkIndex }), { status: 200 });
    }

    // regular non-chunked upload
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return new Response(JSON.stringify({ error: 'No files uploaded' }), { status: 400 });
    }

    // Log how many files we received for traceability
    try { logInfo('[panels:upload] received files', { count: files.length }); } catch {}

    for (const file of files) {
      // @ts-ignore
      let relPath = (file.name || '').toString().trim();
      if (!relPath) throw new Error('Missing filename');
      // normalize and prevent directory traversal
      relPath = path.posix.normalize(relPath).replace(/^\/+/, '');
      if (relPath.includes('..')) throw new Error('Invalid path: contains ..');
      
      // Normalize chapter and device folder names to lowercase
      relPath = normalizeUploadPath(relPath);

      const destPath = path.join(PANELS_DIR, relPath);
      const destDir = path.dirname(destPath);
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
      // @ts-ignore
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(destPath, Buffer.from(arrayBuffer));
    }
    return new Response(JSON.stringify({ success: true, message: 'Files uploaded' }), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[panels:upload] error', { stack });
    return new Response(JSON.stringify({ error: 'Upload failed', __fallbackError: 'Upload failed (see server logs)' }), { status: 500 });
  }
};