import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { execSync } from 'child_process';



export function generatePanelsJson({ regenThumbnails = false, log = false } = {}) {
  console.log('Script running');
  // Use PROJECT_ROOT env var in production, fallback to process.cwd() for local development
  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const panelsDir = path.resolve(projectRoot, process.env.PANELS_DIR || 'static/panels');
  const panelsJson = process.env.PANELS_JSON || 'static/panels.json';
  const assetBase = process.env.STATIC_ASSET_BASE || '/panels';

  // Check if ffmpeg is installed
  const hasFFmpeg = checkFFmpeg(log);

  function checkFFmpeg(log) {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      return true;
    } catch (e) {
      if (log) {
        console.warn('WARNING: ffmpeg is not installed or not in your PATH. Thumbnails will not be generated.');
        console.warn('You can install ffmpeg using one of the following methods:');
        console.warn('- Windows: https://ffmpeg.org/download.html (add ffmpeg/bin to your PATH');
        console.warn('- Mac: brew install ffmpeg'); 
        console.warn('- Linux: sudo apt install ffmpeg');
      }
      return false;
    }
  }



  function generateThumbnail(panelPath, thumbPath) {
    // If panel is image, resize it; if video, extract frame
    if (/\.(png|jpg|jpeg)$/i.test(panelPath)) {
      execSync(`ffmpeg -y -i "${panelPath}" -vf scale=200:-1 "${thumbPath}"`);
    } else if (/\.(webm|mp4)$/i.test(panelPath)) {
      execSync(`ffmpeg -y -i "${panelPath}" -ss 00:00:01.000 -vframes 1 -vf scale=200:-1 "${thumbPath}"`);
    }
  }

  // Natural sort helpers (match client and server implementations)
  function tokenizeForSort(s) {
    // Strip file extension before tokenizing to avoid extension interfering with sort
    const norm = String(s).replace(/\s+/g, '');
    const withoutExt = norm.replace(/\.(png|jpg|jpeg|gif|webp|webm)$/i, '');
    const parts = withoutExt.split(/(\d+)/).filter(Boolean).map(p => {
      if (/^\d+$/.test(p)) return Number(p);
      return p.toLowerCase();
    });
    return parts;
  }

  function naturalCompare(a, b) {
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
      const cmp = ia.localeCompare(ib);
      if (cmp !== 0) return cmp;
    }
    return 0;
  }

  // Alias for backward compatibility within this script
  const numericSort = naturalCompare;

  // Helper: recursively find all image/video files in a folder
  function findFilesRecursive(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const relPath = path.relative(panelsDir, filePath).replace(/\\/g, '/');
      if (fs.statSync(filePath).isDirectory()) {
        results = results.concat(findFilesRecursive(filePath));
      } else if (/\.(png|jpg|jpeg|gif|webp|webm)$/i.test(file)) {
        // Append a cache-busting version parameter based on mtime so clients fetch changed files immediately
        const st = fs.statSync(filePath);
        const v = Math.floor(st.mtimeMs);
        results.push(`${assetBase}/${relPath}?v=${v}`);
      }
    }
    return results;
  }

  // Get all chapter directories (ignore files). Exclude hidden directories (dot-prefixed) such as
  // the upload temp folder ".upload_tmp" so they are not exposed as chapters in panels.json.
  const chapterDirs = fs.readdirSync(panelsDir)
    .filter(f => fs.statSync(path.join(panelsDir, f)).isDirectory() && !f.startsWith('.'));

  // Sort chapters numerically
  chapterDirs.sort(numericSort);

  const data = chapterDirs.map(chapter => {
    const chapterPath = path.join(panelsDir, chapter);
    const desktopPath = path.join(chapterPath, 'desktop');
    const mobilePath = path.join(chapterPath, 'mobile');

    // Read ordering file if present (static/panels/_order.json)
    let orderMap = {};
    try {
      const orderFile = path.join(panelsDir, '_order.json');
      if (fs.existsSync(orderFile)) {
        const raw = fs.readFileSync(orderFile, 'utf8');
        orderMap = JSON.parse(raw || '{}');
      }
    } catch (e) {
      if (log) console.warn('Failed to read _order.json, continuing with filesystem order', e && e.message ? e.message : e);
      orderMap = {};
    }

    // Helper to build file list honoring saved order when possible
    function buildOrderedList(devicePath, deviceKey) {
      // Escape special regex chars in assetBase and create dynamic pattern
      const assetBaseEscaped = assetBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const assetBasePrefixPattern = new RegExp(`^${assetBaseEscaped}\\/`);
      
      const all = findFilesRecursive(devicePath)
        .filter(f => !/\.thumb\.(jpg|jpeg|png)$/i.test(f))
        .map(f => f.replace(assetBasePrefixPattern, '')) // store path relative to panelsDir (dynamic prefix)
        .map(p => p.replace(/\?v=.*$/, ''));
      // orderMap keys are expected to be chapter directory names (e.g., 'chapter-1')
  const chapterMeta = (orderMap && orderMap[chapter]) || {};
  const chapterOrder = (chapterMeta && chapterMeta[deviceKey]) || null;
  const chapterPublishDate = chapterMeta && chapterMeta.publishDate ? String(chapterMeta.publishDate) : null;
  const chapterPublished = (chapterMeta && ('published' in chapterMeta)) ? !!chapterMeta.published : undefined;
      let ordered = [];
      if (Array.isArray(chapterOrder) && chapterOrder.length > 0) {
        // Use specified order but allow non-file tokens (like youtube) and preserve objects with metadata.
        const included = new Set();
        for (const rawEntry of chapterOrder) {
          if (rawEntry && typeof rawEntry === 'object') {
            // If it's already a structured youtube object, keep it as-is
            if (rawEntry.type === 'youtube' && rawEntry.id) {
              ordered.push(rawEntry);
              continue;
            }
            // If it's an object that references a path (e.g. { path: 'chapter-1/desktop/Story1.png', published: true })
            if (rawEntry.path) {
              const relPath = String(rawEntry.path).replace(/^\/+/, '');
              if (all.includes(relPath)) {
                // preserve metadata by pushing an object; mapping step will turn it into a URL
                const outObj = { path: relPath };
                if ('published' in rawEntry) outObj.published = rawEntry.published;
                if ('publishDate' in rawEntry) outObj.publishDate = rawEntry.publishDate;
                ordered.push(outObj);
                included.add(relPath);
                continue;
              }
            }
            // Unknown object shape - skip
            continue;
          }
          // rawEntry is likely a string
          const rel = String(rawEntry || '').replace(/^\/+/, '');
          // If the order entry contains a youtube token anywhere, extract and emit structured object
          const yMatch = rel.match(/youtube:([^\\/\\s]+)/i);
          if (yMatch) {
            ordered.push({ type: 'youtube', id: yMatch[1] });
            continue;
          }
          // Otherwise include the file if it exists under this device's discovered files
          if (all.includes(rel)) {
            ordered.push(rel);
            included.add(rel);
          }
        }
        // Append any files not mentioned in the order, sorted numerically
        const remaining = all.filter(a => !included.has(a));
        remaining.sort(numericSort);
        ordered = ordered.concat(remaining);
      } else {
        // No saved order: use numeric sort
        ordered = all.sort(numericSort);
      }

      // Filter: default to published for existing files unless explicitly marked published=false or future publishDate
      const now = Date.now();
      ordered = ordered.filter(entry => {
        // If a chapter-level publishDate or published flag is set, items without their own publishDate may inherit
        if (entry && typeof entry === 'object') {
          // youtube structured object
          if (entry.type === 'youtube') {
            if ('published' in entry) return entry.published === true;
            if (entry.publishDate) {
              const pd = Date.parse(String(entry.publishDate));
              if (!isNaN(pd) && pd <= now) return true;
              return false;
            }
            if (chapterPublished !== undefined) return chapterPublished === true;
            if (chapterPublishDate) {
              const cp = Date.parse(String(chapterPublishDate));
              if (!isNaN(cp) && cp <= now) return true;
              return false;
            }
            return true; // default to published
          }
          // object with path metadata
          if (entry.path) {
            if ('published' in entry) return entry.published === true;
            if ('publishDate' in entry && entry.publishDate) {
              const pd = Date.parse(String(entry.publishDate));
              if (!isNaN(pd) && pd <= now) return true;
              return false;
            }
            if (chapterPublished !== undefined) return chapterPublished === true;
            if (chapterPublishDate) {
              const cp = Date.parse(String(chapterPublishDate));
              if (!isNaN(cp) && cp <= now) return true;
              return false;
            }
            return true; // default to published
          }
          return true; // default to published
        }
        // string path - default to published unless chapter-level flags explicitly hide it
        if (chapterPublished === false) return false;
        if (chapterPublishDate) {
          const cp = Date.parse(String(chapterPublishDate));
          if (!isNaN(cp) && cp > now) return false; // future publish date
        }
        return true; // default to published
      });

      // Convert to assetBase/<rel>?v=<mtime> OR leave structured objects (e.g. youtube)
      return ordered.map(item => {
        if (item && typeof item === 'object' && item.type === 'youtube') {
          return item;
        }
        // item might be an object with path metadata or a simple string
        const rel = (typeof item === 'object' && item.path) ? String(item.path).replace(/^\/+/, '') : String(item || '').replace(/^\/+/, '');
        const abs = path.join(panelsDir, rel);
        if (!fs.existsSync(abs)) return null;
        const st = fs.statSync(abs);
        const v = Math.floor(st.mtimeMs);
        return `${assetBase}/${rel}?v=${v}`;
      }).filter(Boolean);
    }

    const desktopFiles = buildOrderedList(desktopPath, 'desktop');
    const mobileFiles = buildOrderedList(mobilePath, 'mobile');

    console.log('Desktop files:', desktopFiles);
    console.log('Mobile files:', mobileFiles);

    // Generate thumbnail in the chapter root
    let thumbnail = '';
    // Find last actual panel file (skip YouTube objects)
    const panelFiles = desktopFiles.filter(f => typeof f === 'string');
    const mobilePanelFiles = mobileFiles.filter(f => typeof f === 'string');
    let lastPanel = panelFiles.length
      ? panelFiles[panelFiles.length - 1]
      : (mobilePanelFiles.length ? mobilePanelFiles[mobilePanelFiles.length - 1] : null);

    if (lastPanel) {
      const lastPanelAbs = path.join(panelsDir, lastPanel.replace(new RegExp(`^${assetBase.replace(/\//g, '\\/')}\\/`), ''));
      const thumbName = `${chapter}.thumb.jpg`;
      const thumbAbs = path.join(chapterPath, thumbName);
      const thumbRel = `${assetBase}/${chapter}/${thumbName}`;

      if ((regenThumbnails || !fs.existsSync(thumbAbs)) && hasFFmpeg) {
        try {
          generateThumbnail(lastPanelAbs, thumbAbs);
          if (log) console.log(`Generated thumbnail: ${thumbAbs}`);
        } catch (e) {
          console.warn(`Failed to generate thumbnail for ${lastPanelAbs}: ${e.message}`);
          if (log) console.warn(`Failed to generate thumbnail for ${lastPanelAbs}: ${e.message}`);
        }
      }
      if (fs.existsSync(thumbAbs)) {
        const st = fs.statSync(thumbAbs);
        const v = Math.floor(st.mtimeMs);
        thumbnail = `${thumbRel}?v=${v}`;
      }
    }

    return {
      title: chapter,
      slug: chapter,
      desktop: desktopFiles,
      mobile: mobileFiles,
      thumbnail
    };
  });

  const outFile = path.resolve(projectRoot, panelsJson);
  const tmpFile = outFile + '.tmp';
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpFile, json, 'utf8');
  fs.renameSync(tmpFile, outFile);
  console.log(`Atomically wrote ${panelsJson} with data:`, json);

  // Also write to build directory if it exists (for production updates without full rebuild)
  // Only do this for production panels.json, not staging
  const isProduction = panelsJson === 'static/panels.json';
  if (isProduction) {
    const buildFile = path.resolve(projectRoot, 'build', 'client', 'panels.json');
    const buildDir = path.dirname(buildFile);
    if (fs.existsSync(buildDir)) {
      const buildTmpFile = buildFile + '.tmp';
      fs.writeFileSync(buildTmpFile, json, 'utf8');
      fs.renameSync(buildTmpFile, buildFile);
      console.log('✓ Also updated build/client/panels.json (production hot-update)');
    }
  }

}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // CLI mode
  const regenThumbnails = process.argv.includes('--regen-thumbnails');
  generatePanelsJson({ regenThumbnails, log: true });
}