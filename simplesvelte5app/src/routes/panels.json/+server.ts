import fs from 'fs/promises';
import path from 'path';

export const GET = async () => {
  try {
    const file = path.join(process.cwd(), 'static', 'panels.json');
    const data = await fs.readFile(file, 'utf8');
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
