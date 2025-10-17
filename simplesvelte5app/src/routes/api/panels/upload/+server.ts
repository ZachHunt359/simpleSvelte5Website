import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';
import { isAdmin } from '$lib/auth/helpers';
import { logError } from '$lib/logger';

const PANELS_DIR = path.resolve('static/panels');

export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!(await isAdmin(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files.length) {
    return new Response(JSON.stringify({ error: 'No files uploaded' }), { status: 400 });
  }

  try {
    for (const file of files) {
      // @ts-ignore
      const relPath = file.name;
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