import fs from 'fs/promises';
import path from 'path';
import { PANELS_CONFIG } from '$lib/config/panels.server';

export const GET = async () => {
  try {
    const file = path.join(process.cwd(), PANELS_CONFIG.panelsJson);
    console.log('[panels.json endpoint] Reading from:', file);
    const data = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(data);
    console.log('[panels.json endpoint] Total chapters:', Object.keys(parsed.chapters || {}).length);
    if (parsed.chapters && parsed.chapters['chapter-1']) {
      const ch1Desktop = parsed.chapters['chapter-1'].desktop || [];
      console.log('[panels.json endpoint] chapter-1 desktop panel count:', ch1Desktop.length);
      // Check for YouTube entries around index 149
      console.log('[panels.json endpoint] Panels 147-151:', ch1Desktop.slice(147, 152).map((p: any) => 
        typeof p === 'object' && p.type === 'youtube' ? `YouTube:${p.id}` : 
        typeof p === 'string' ? p.split('/').pop() : JSON.stringify(p)
      ));
    }
    // Disable caching so clients always see the latest generated panels.json without a full rebuild
    return new Response(data, {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (err) {
    console.error('Failed to read panels.json', err);
    return new Response(JSON.stringify({ error: 'panels.json not found' }), {
      status: 404,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  }
};
