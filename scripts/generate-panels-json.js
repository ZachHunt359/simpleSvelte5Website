import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { execSync } from 'child_process';



export function generatePanelsJson({ regenThumbnails = false, log = false } = {}) {
  console.log('Script running');
  // Use the project root (process.cwd()) so runtime imports from the built server
  // still resolve to the real project's static/panels directory instead of
  // the compiled .svelte-kit output path.
  const projectRoot = process.cwd();
  const panelsDir = path.resolve(projectRoot, 'static', 'panels');

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

  // Helper: extract all numbers from a string as an array of integers
  function extractNumbers(str) {
    return (str.match(/\d+/g) || []).map(Number);
  }

  // Sort by numbers in order, then by string as tie-breaker
  function numericSort(a, b) {
    const numsA = extractNumbers(a);
    const numsB = extractNumbers(b);
    for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
      const na = numsA[i] ?? 0;
      const nb = numsB[i] ?? 0;
      if (na !== nb) return na - nb;
    }
    return a.localeCompare(b);
  }

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
      } else if (/\.(png|jpg|jpeg|gif|webm)$/i.test(file)) {
        // Append a cache-busting version parameter based on mtime so clients fetch changed files immediately
        const st = fs.statSync(filePath);
        const v = Math.floor(st.mtimeMs);
        results.push(`/panels/${relPath}?v=${v}`);
      }
    }
    return results;
  }

  // Get all chapter directories (ignore files)
  const chapterDirs = fs.readdirSync(panelsDir)
    .filter(f => fs.statSync(path.join(panelsDir, f)).isDirectory());

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
      const all = findFilesRecursive(devicePath)
        .filter(f => !/\.thumb\.(jpg|jpeg|png)$/i.test(f))
        .map(f => f.replace(/^\/panels\//, '')) // store path relative to panelsDir
        .map(p => p.replace(/\?v=.*$/, ''));
      // orderMap keys are expected to be chapter directory names (e.g., 'chapter-1')
  const chapterMeta = (orderMap && orderMap[chapter]) || {};
  const chapterOrder = (chapterMeta && chapterMeta[deviceKey]) || null;
  const chapterPublishDate = chapterMeta && chapterMeta.publishDate ? String(chapterMeta.publishDate) : null;
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

      // Filter out unpublished or future-dated items
      const now = Date.now();
      ordered = ordered.filter(entry => {
        // If a chapter-level publishDate is set, items without their own publishDate inherit it
        if (entry && typeof entry === 'object') {
          if ('published' in entry && entry.published === false) return false;
          if ('publishDate' in entry && entry.publishDate) {
            const pd = Date.parse(String(entry.publishDate));
            if (!isNaN(pd) && pd > now) return false;
          } else if (chapterPublishDate) {
            const cp = Date.parse(String(chapterPublishDate));
            if (!isNaN(cp) && cp > now) return false;
          }
          return true;
        }
        // string path - inherit chapter publishDate if present
        if (chapterPublishDate) {
          const cp = Date.parse(String(chapterPublishDate));
          if (!isNaN(cp) && cp > now) return false;
        }
        return true;
      });

      // Convert to /panels/<rel>?v=<mtime> OR leave structured objects (e.g. youtube)
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
        return `/panels/${rel}?v=${v}`;
      }).filter(Boolean);
    }

    const desktopFiles = buildOrderedList(desktopPath, 'desktop');
    const mobileFiles = buildOrderedList(mobilePath, 'mobile');

    console.log('Desktop files:', desktopFiles);
    console.log('Mobile files:', mobileFiles);

    // Generate thumbnail in the chapter root
    let thumbnail = '';
    let lastPanel = desktopFiles.length
      ? desktopFiles[desktopFiles.length - 1]
      : (mobileFiles.length ? mobileFiles[mobileFiles.length - 1] : null);

    if (lastPanel) {
      const lastPanelAbs = path.join(panelsDir, lastPanel.replace(/^\/panels\//, ''));
      const thumbName = `${chapter}.thumb.jpg`;
      const thumbAbs = path.join(chapterPath, thumbName);
      const thumbRel = `/panels/${chapter}/${thumbName}`;

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

  const outFile = path.resolve(projectRoot, 'static', 'panels.json');
  const tmpFile = outFile + '.tmp';
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpFile, json, 'utf8');
  fs.renameSync(tmpFile, outFile);
  console.log('Atomically wrote panels.json with data:', json);

}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // CLI mode
  const regenThumbnails = process.argv.includes('--regen-thumbnails');
  generatePanelsJson({ regenThumbnails, log: true });
}