import fs from 'fs/promises';
import path from 'path';
import { PANELS_CONFIG } from '$lib/config/panels.server';

function slugifyChapterKey(key: string) {
  // If key looks like "Chapter 2" return "chapter-2"
  const m = key.match(/chapter\s*(\d+)/i);
  if (m && m[1]) return `chapter-${m[1]}`;
  return key.toLowerCase().replace(/\s+/g, '-');
}

// Natural / numeric-aware sort helpers
function tokenizeForSort(s: string) {
  // Strip file extension before tokenizing to avoid extension interfering with sort
  const norm = String(s).replace(/\s+/g, '');
  const withoutExt = norm.replace(/\.(png|jpg|jpeg|gif|webp|webm)$/i, '');
  const parts = withoutExt.split(/(\d+)/).filter(Boolean).map(p => {
    if (/^\d+$/.test(p)) return Number(p);
    return (p || '').toLowerCase();
  });
  return parts;
}

function naturalCompare(a: string, b: string) {
  const ta = tokenizeForSort(a);
  const tb = tokenizeForSort(b);
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    const ia = ta[i];
    const ib = tb[i];
    if (ia === undefined) return -1;
    if (ib === undefined) return 1;
    if (typeof ia === 'number' && typeof ib === 'number') {
      if (ia !== ib) return ia - ib;
      continue;
    }
    if (typeof ia === 'number') return -1;
    if (typeof ib === 'number') return 1;
    const cmp = (ia as string).localeCompare(ib as string);
    if (cmp !== 0) return cmp;
  }
  return 0;
}

function entryPath(e: any) {
  if (typeof e === 'string') return normalizePath(e);
  if (!e) return '';
  // Handle YouTube entries specially - use a unique identifier based on their id
  if (e.type === 'youtube' && e.id) {
    return `youtube:${e.id}`;
  }
  return normalizePath(String(e.path || ''));
}

// Normalize paths: strip leading "panels/" or "/panels/" prefix and leading slashes
function normalizePath(p: string): string {
  let normalized = String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.startsWith('panels/')) {
    normalized = normalized.slice(7);
  }
  return normalized;
}

function mergeInsertExisting(existing: any[], newItems: any[], naturalCompareFn: (a: string, b: string) => number) {
  const existingPaths = (existing || []).map(entryPath);
  const filteredNew = (newItems || []).filter(n => !existingPaths.includes(entryPath(n)));
  if (filteredNew.length === 0) return (existing || []).slice();

  const sortedNew = filteredNew.slice().sort((A, B) => naturalCompareFn(entryPath(A), entryPath(B)));

  const existingWithPaths = (existing || []).map(e => ({ raw: e, path: entryPath(e) }));

  for (const n of sortedNew) {
    const nPath = entryPath(n);
    let inserted = false;
    for (let i = 0; i < existingWithPaths.length; i++) {
      const cmp = naturalCompareFn(nPath, existingWithPaths[i].path);
      if (cmp <= 0) {
        existingWithPaths.splice(i, 0, { raw: n, path: nPath });
        inserted = true;
        break;
      }
    }
    if (!inserted) existingWithPaths.push({ raw: n, path: nPath });
  }

  return existingWithPaths.map(x => x.raw);
}

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('[API /panels/order] Received POST request, body:', JSON.stringify(body, null, 2));
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    const incoming = body.orders || body;
    console.log('[API /panels/order] Incoming orders:', JSON.stringify(incoming, null, 2));
    if (!incoming || typeof incoming !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid orders payload' }), { status: 400 });
    }

    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const panelsDir = path.resolve(projectRoot, PANELS_CONFIG.panelsDir);
    await fs.mkdir(panelsDir, { recursive: true });
    const orderFile = path.join(panelsDir, '_order.json');

    // Allow clients to request a full replace of the ordering file by sending { orders, replace: true }
    const replace = !!(body && (body.replace === true));

    // Read existing orders and normalize keys to slugs (unless replace requested)
    let existing = {};
    if (!replace) {
      try {
        const raw = await fs.readFile(orderFile, 'utf8');
        existing = JSON.parse(raw || '{}');
      } catch (e) {
        existing = {};
      }
    }

    const normalizedExisting: Record<string, any> = {};
    for (const k of Object.keys(existing)) {
      normalizedExisting[slugifyChapterKey(k)] = existing[k];
    }

    // Validate lock state: reject modifications to locked chapters
    // Exception: allow lock/unlock operations themselves
    for (const k of Object.keys(incoming)) {
      const slug = slugifyChapterKey(k);
      const existingChapter = normalizedExisting[slug];
      const incomingChapter = incoming[k];
      
      if (existingChapter && existingChapter.locked === true) {
        // Chapter is currently locked
        const isUnlocking = incomingChapter && incomingChapter.locked === false;
        const isJustLocking = incomingChapter && incomingChapter.locked === true && Object.keys(incomingChapter).length === 1;
        
        // Check if incoming data contains changes beyond just lock state
        const hasContentChanges = incomingChapter && (
          incomingChapter.desktop || 
          incomingChapter.mobile || 
          incomingChapter.other ||
          ('published' in incomingChapter && incomingChapter.locked !== false) ||
          ('publishDate' in incomingChapter && incomingChapter.locked !== false)
        );
        
        if (hasContentChanges && !isUnlocking) {
          console.log(`[API /panels/order] ⛔ Rejected: Attempt to modify locked chapter ${slug}`);
          return new Response(
            JSON.stringify({ 
              error: `Chapter "${slug}" is locked and cannot be modified. Unlock it first.`,
              lockedChapter: slug 
            }), 
            { status: 403 }
          );
        }
        
        if (isUnlocking) {
          console.log(`[API /panels/order] 🔓 Unlocking chapter ${slug}`);
        }
      }
      
      // Check if trying to lock a chapter
      if (incomingChapter && incomingChapter.locked === true) {
        console.log(`[API /panels/order] 🔒 Locking chapter ${slug}`);
      }
    }

    // Normalize incoming keys and merge into existing (or populate when replace=true)
    for (const k of Object.keys(incoming)) {
      const slug = slugifyChapterKey(k);
      const val = incoming[k] || {};
      if (!normalizedExisting[slug] || typeof normalizedExisting[slug] !== 'object') normalizedExisting[slug] = {};

      // Copy over non-array metadata properties (published, publishDate, etc.)
      for (const prop of Object.keys(val)) {
        if (prop !== 'desktop' && prop !== 'mobile' && prop !== 'other') {
          console.log(`[API] Copying metadata property "${prop}" = ${val[prop]} to chapter ${slug}`);
          normalizedExisting[slug][prop] = val[prop];
        }
      }
      console.log(`[API] After metadata copy, chapter ${slug} has:`, {
        published: normalizedExisting[slug].published,
        publishDate: normalizedExisting[slug].publishDate,
        hasDesktop: !!normalizedExisting[slug].desktop,
        hasMobile: !!normalizedExisting[slug].mobile
      });

      // For each device ensure we merge new items into existing arrays instead of overwriting
      for (const dev of ['desktop', 'mobile', 'other']) {
        const incomingArr = Array.isArray(val[dev]) ? val[dev] : [];
        const existingArr = Array.isArray(normalizedExisting[slug][dev]) ? normalizedExisting[slug][dev] : [];
        console.log(`[API /panels/order] Merging ${dev} for ${slug}:`, {
          incomingCount: incomingArr.length,
          existingCount: existingArr.length,
          incomingItems: incomingArr.map(i => typeof i === 'object' && i.type === 'youtube' ? `YT:${i.id}` : typeof i === 'string' ? i.substring(0, 30) : JSON.stringify(i).substring(0, 30))
        });
        if (replace || !existingArr || existingArr.length === 0) {
          // On replace or when no existing ordering, use incoming as provided (preserve objects)
          normalizedExisting[slug][dev] = incomingArr.slice();
        } else {
          // Merge incoming items into existing ordering, preserving existing manual order
          normalizedExisting[slug][dev] = mergeInsertExisting(existingArr, incomingArr, naturalCompare);
          console.log(`[API /panels/order] After merge, ${dev} for ${slug} has ${normalizedExisting[slug][dev].length} items`);
        }
      }
    }

    // If replace=true, drop any keys that were not part of incoming by rebuilding from incoming only
    if (replace) {
      const rebuilt: Record<string, any> = {};
      for (const k of Object.keys(incoming)) {
        const slug = slugifyChapterKey(k);
        rebuilt[slug] = normalizedExisting[slug] || {};
      }
      // use rebuilt as the final payload
      for (const k of Object.keys(normalizedExisting)) delete normalizedExisting[k];
      for (const k of Object.keys(rebuilt)) normalizedExisting[k] = rebuilt[k];
    }


    // Run final cleanup only when explicitly requested by the client (cleanup=true).
    // This prevents accidental removal of per-panel overrides for intermediate saves.
    const doCleanup = !!(body && body.cleanup === true);
    if (doCleanup) {
      // Final cleanup: remove any per-panel `published` flags that are redundant because they
      // match the chapter-level `published` value. Also collapse objects with no remaining
      // metadata back to plain strings for a tidy _order.json.
      for (const slug of Object.keys(normalizedExisting)) {
        try {
          const chapterMeta: any = normalizedExisting[slug] || {};
          // Determine chapter-level published boolean if present (or via publishDate)
          let chapterPublished: boolean | undefined = undefined;
          if ('published' in chapterMeta) {
            chapterPublished = !!chapterMeta.published;
          } else if (chapterMeta && chapterMeta.publishDate) {
            const cp = Date.parse(String(chapterMeta.publishDate));
            if (!isNaN(cp) && cp <= Date.now()) chapterPublished = true;
          }

          // For each device array, prune per-item published flags that mirror chapterPublished
          for (const dev of ['desktop', 'mobile', 'other']) {
            const arr = chapterMeta[dev];
            if (!Array.isArray(arr)) continue;
            const newArr: any[] = [];
            for (const item of arr) {
              if (typeof item === 'string') {
                newArr.push(item);
                continue;
              }
              // YouTube entries should always be preserved as objects
              if (item && item.type === 'youtube' && item.id) {
                const clone: any = { ...item };
                if (chapterPublished !== undefined && ('published' in clone) && clone.published === chapterPublished) {
                  // redundant, remove
                  delete clone.published;
                }
                newArr.push(clone);
                continue;
              }
              // item is object like { path, published?, publishDate?, ... }
              const clone: any = { ...item };
              if (chapterPublished !== undefined && ('published' in clone) && clone.published === chapterPublished) {
                // redundant, remove
                delete clone.published;
              }
              // if object has no metadata besides path, collapse to string
              const keys = Object.keys(clone).filter(k => k !== 'path');
              if (keys.length === 0) {
                newArr.push(String(clone.path || '').replace(/^\//, ''));
              } else {
                newArr.push(clone);
              }
            }
            chapterMeta[dev] = newArr;
          }
          // assign cleaned chapterMeta back
          normalizedExisting[slug] = chapterMeta;
        } catch (e) {
          // on any error keep the original as-is
          console.warn('Failed to clean chapter order for', slug, e);
        }
      }
    }

    const outJson = JSON.stringify(normalizedExisting, null, 2);

    console.log('[API] About to write _order.json. Chapter metadata:', Object.keys(normalizedExisting).map(slug => ({
      chapter: slug,
      published: normalizedExisting[slug].published,
      publishDate: normalizedExisting[slug].publishDate,
      desktopCount: normalizedExisting[slug].desktop?.length || 0,
      mobileCount: normalizedExisting[slug].mobile?.length || 0,
      otherCount: normalizedExisting[slug].other?.length || 0,
      otherItems: normalizedExisting[slug].other?.slice(0, 3).map((i: any) => typeof i === 'object' && i.type === 'youtube' ? `YT:${i.id}` : i)
    })));
    console.log('[API] Writing to file:', orderFile);

    // Write atomically: write to a tmp file then rename
    const tmpFile = orderFile + '.tmp';
    try {
      console.log('[API] Creating tmp file:', tmpFile);
      await fs.writeFile(tmpFile, outJson, 'utf8');
      console.log('[API] Tmp file written, size:', outJson.length, 'bytes');
      console.log('[API] Renaming tmp file to:', orderFile);
      await fs.rename(tmpFile, orderFile);
      console.log('[API] Rename successful');
    } catch (atomicErr) {
      console.error('[API] Atomic write failed, trying direct write:', atomicErr);
      // Fallback to direct write if atomic fails
      await fs.writeFile(orderFile, outJson, 'utf8');
      console.log('[API] Direct write successful');
      // Clean up tmp file if it exists
      try {
        await fs.unlink(tmpFile);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    console.error('Failed to save panels order', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
