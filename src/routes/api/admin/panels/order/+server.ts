import fs from 'fs/promises';
import path from 'path';

function slugifyChapterKey(key: string) {
  // If key looks like "Chapter 2" return "chapter-2"
  const m = key.match(/chapter\s*(\d+)/i);
  if (m && m[1]) return `chapter-${m[1]}`;
  return key.toLowerCase().replace(/\s+/g, '-');
}

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    const incoming = body.orders || body;
    if (!incoming || typeof incoming !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid orders payload' }), { status: 400 });
    }

    const projectRoot = process.cwd();
    const panelsDir = path.resolve(projectRoot, 'static', 'panels');
    await fs.mkdir(panelsDir, { recursive: true });
    const orderFile = path.join(panelsDir, '_order.json');

    // Read existing orders and normalize keys to slugs
    let existing = {};
    try {
      const raw = await fs.readFile(orderFile, 'utf8');
      existing = JSON.parse(raw || '{}');
    } catch (e) {
      existing = {};
    }

    const normalizedExisting: Record<string, any> = {};
    for (const k of Object.keys(existing)) {
      normalizedExisting[slugifyChapterKey(k)] = existing[k];
    }

    // Normalize incoming keys and merge into existing
    for (const k of Object.keys(incoming)) {
      const slug = slugifyChapterKey(k);
      const val = incoming[k] || {};
      if (!normalizedExisting[slug] || typeof normalizedExisting[slug] !== 'object') normalizedExisting[slug] = {};
      // Merge device arrays (desktop/mobile/other) - overwrite when provided
      for (const dev of Object.keys(val)) {
        normalizedExisting[slug][dev] = val[dev];
      }
    }

  const outJson = JSON.stringify(normalizedExisting, null, 2);
  // Write atomically: write to a tmp file then rename
  const tmpFile = orderFile + '.tmp';
  await fs.writeFile(tmpFile, outJson, 'utf8');
  await fs.rename(tmpFile, orderFile);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    console.error('Failed to save panels order', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
