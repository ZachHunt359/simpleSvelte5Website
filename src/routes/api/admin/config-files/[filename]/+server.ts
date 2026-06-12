import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/auth/helpers';
import { PANELS_CONFIG } from '$lib/config/panels.server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * GET /api/admin/config-files/[filename]
 * Fetches configuration files for viewing in admin interface
 * Returns JSON content from environment-specific config files
 */
export const GET: RequestHandler = async ({ params, cookies }) => {
  // Check admin authorization
  if (!(await isAdmin(cookies))) {
    throw error(403, 'Admin access required');
  }

  const { filename } = params;
  
  // Map friendly filenames to actual file paths based on environment
  const fileMap: Record<string, string> = {
    'panels.json': PANELS_CONFIG.panelsJson,
    '_order.json': path.join(PANELS_CONFIG.panelsDir, '_order.json'),
  };

  // Resolve the file path
  const filePath = fileMap[filename];
  if (!filePath) {
    throw error(404, `Unknown file: ${filename}`);
  }

  try {
    const absolutePath = path.resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');
    
    // Try to parse as JSON to validate
    const parsed = JSON.parse(content);
    
    return json({
      filename,
      environment: PANELS_CONFIG.environment,
      path: filePath,
      content: parsed,
      size: content.length
    });
  } catch (err: any) {
    console.error(`[config-files] Error reading ${filename}:`, err);
    throw error(500, `Failed to read file: ${err.message}`);
  }
};
