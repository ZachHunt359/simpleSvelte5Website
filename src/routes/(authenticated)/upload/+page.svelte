<script lang="ts">
  import UploadSummary from '$lib/UploadSummary.svelte';
  // import ThumbnailGallery from '$lib/ThumbnailGallery.svelte';
  import ChapterTree from '$lib/ChapterTree.svelte';
  import { analyzeConflicts, getExistingPanels, preprocessFiles, type ConflictAnalysis } from '$lib/uploadValidation';
  
  let selectedFiles: File[] = [];
  let filesToUpload: any[] = [];
  let existingFiles: string[] = [];
  type PanelFileInfo = { name: string; webkitRelativePath: string; size: number; type: string };
  let panelsFiles: any[] = [];
  let panelsOrderMap: Record<string, any> = {};
  let panelsFilesKey = '';
  let panelsTreeConflicts: ConflictAnalysis = { duplicates: [], missing: [], errors: [], warnings: [], mismatched: [] };
  let panelsInferredChapters: string[] = [];
  let loadingExisting = false;
  let uploading = false;
  let uploadError = '';
  let uploadSuccess = '';
  let showAllFiles = false;
  let conflicts: ConflictAnalysis = { duplicates: [], missing: [], errors: [], warnings: [], mismatched: [] };
  let validationInProgress = false;
  let totalSize = 0;
  let inferredChapters: string[] = [];
  // Local debug toggle to control tree/component debug output
  let treeDebug = false;

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      selectedFiles = Array.from(input.files);
      uploadError = '';
      uploadSuccess = '';
      
      // Start validation process
      await validateFiles();
    }
  }

  import { onMount } from 'svelte';

  // Shared chapter extraction function (top-level)
  function extractChapter(path: string): string | null {
    const parts = path.split(/\\|\//);
    let result = null;
    if (parts.length > 1 && /^chapter-\d+$/i.test(parts[0])) {
      const num = parts[0].match(/chapter-(\d+)/i);
      if (num && num[1]) result = `Chapter ${num[1]}`;
    }
    if (!result) {
      // fallback: look for any chapter-N in the path
      const chapterMatch = path.match(/chapter-(\d+)/i);
      if (chapterMatch && chapterMatch[1]) result = `Chapter ${chapterMatch[1]}`;
    }
    if (!result) result = 'Uncategorized';
    if (treeDebug) console.log('extractChapter:', { path, result });
    return result;
  }

  // Fetch all files in /panels and build a File[] for tree rendering
  async function fetchPanelsFiles() {
    // Fetch file list and _order.json (if present) then reorder files according to _order.json
    const [listRes, orderRes] = await Promise.all([
      fetch('/api/panels/list', { credentials: 'same-origin' }).catch(() => null),
      fetch('/panels/_order.json', { credentials: 'same-origin' }).catch(() => null)
    ]);
    if (!listRes || !listRes.ok) return;
    const fileList: string[] = await listRes.json();

    // Load order map if available
    try {
      if (orderRes && orderRes.ok) {
        panelsOrderMap = await orderRes.json();
      } else {
        panelsOrderMap = {};
      }
    } catch (e) {
      panelsOrderMap = {};
    }

    // Build lookup map for quick access
    const lookup: Record<string, any> = {};
    for (const p of fileList) {
      const rel = p.replace(/\\/g, '/');
      lookup[rel] = { name: rel.split('/').pop() || rel, webkitRelativePath: rel, size: 0, type: '' };
    }

    // If we have an order map, build ordered list by iterating each chapter/device in order
    const ordered: any[] = [];
    const added = new Set<string>();
    try {
      for (const rawKey of Object.keys(panelsOrderMap || {})) {
        const chapter = rawKey; // already slug form in file
        const entry = panelsOrderMap[chapter] || {};
        for (const dev of ['desktop', 'mobile', 'other']) {
          const arr = entry[dev] || [];
          for (const item of arr) {
            // item may be a string or an object { path: '...' }
            const rel = (typeof item === 'string' ? item : (item && item.path))?.toString().replace(/^\//, '') || null;
            if (!rel) continue;
            if (lookup[rel] && !added.has(rel)) {
              ordered.push(lookup[rel]);
              added.add(rel);
            }
          }
        }
      }
    } catch (e) {
      // Fall back silently
      console.warn('Failed to apply panels order map', e);
    }

    // Append remaining files that weren't in the order map, sorted naturally by path
    const remaining = Object.keys(lookup).filter(k => !added.has(k)).sort((a, b) => {
      // simple natural-ish compare using localeCompare with numeric option
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    for (const r of remaining) ordered.push(lookup[r]);

    panelsFiles = ordered;
    panelsFiles = [...panelsFiles]; // Force reactivity
    panelsFilesKey = panelsFiles.length > 0
      ? panelsFiles.map(f => f.webkitRelativePath || f.name || '').join('|')
      : 'empty';
    panelsTreeConflicts = { duplicates: [], missing: [], errors: [], warnings: [], mismatched: [] };
    panelsInferredChapters = [...new Set(
      panelsFiles.map(file => extractChapter(file.webkitRelativePath || file.name)).filter((chapter): chapter is string => chapter !== null)
    )].sort();
    if (treeDebug) console.log('Detected chapters:', panelsInferredChapters);
  }

  onMount(() => {
    fetchPanelsFiles();
  });

  // Admin heartbeat: inform server when admin is viewing the ChapterTree so scheduled regeneration can pause
  let heartbeatInterval: number | null = null;
  async function sendHeartbeat() {
    try {
      await fetch('/api/admin/panels/heartbeat', { method: 'POST', credentials: 'same-origin' });
    } catch (e) {
      // ignore
    }
  }

  onMount(() => {
    // Start heartbeating when upload page is mounted (admins only endpoint will reject non-admins)
    sendHeartbeat();
    heartbeatInterval = window.setInterval(sendHeartbeat, 15_000);
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
  });

  async function validateFiles() {
    fetchPanelsFiles();
    if (selectedFiles.length === 0) return;
    
    validationInProgress = true;
    loadingExisting = true;
    
    try {
      // Fetch existing files
      const res = await fetch('/api/panels/list', { credentials: 'same-origin' });
      if (!res.ok) {
        uploadError = `Failed to fetch existing files: ${res.status}`;
        return;
      }
      existingFiles = await res.json();
      
      // Analyze conflicts with enhanced validation
      conflicts = await analyzeConflicts(selectedFiles, existingFiles);
      
      // Determine the selected folder name (top-level)
      let topFolder = '';
      if (selectedFiles.length > 0) {
        const firstPath = selectedFiles[0].webkitRelativePath || selectedFiles[0].name;
        const parts = firstPath.split(/\\|\//);
        if (parts.length > 1) topFolder = parts[0];
      }
  // Debug: log selectedFiles before filtering (only when debugging)
  if (treeDebug) console.log('[validateFiles] selectedFiles sample:', selectedFiles.slice(0,3));
      // Normalize all existing file paths to use forward slashes
      const normalizedExisting = existingFiles.map(f => f.replace(/\\/g, '/'));
      // Filter files (remove duplicates)
      filesToUpload = selectedFiles.filter(file => {
        let relPath = file.webkitRelativePath || file.name;
        // Remove the top-level folder from the relative path
        if (topFolder && relPath.startsWith(topFolder + '/')) relPath = relPath.slice(topFolder.length + 1);
        if (topFolder && relPath.startsWith(topFolder + "\\")) relPath = relPath.slice(topFolder.length + 1);
        relPath = relPath.replace(/\\/g, '/');
        return !normalizedExisting.includes(relPath);
      })
      // Explicitly copy all relevant properties from File objects and keep a reference to the original File
      .map((file, idx) => {
        const out: any = {
          name: file.name,
          webkitRelativePath: file.webkitRelativePath ? file.webkitRelativePath.replace(/\\/g, '/') : file.name,
          size: file.size,
          type: file.type,
          id: (file as any).id || `${file.webkitRelativePath || file.name}-${idx}`,
          _isNew: true,
          // keep the original File/Blob so uploads can append a real Blob to FormData
          _file: file,
          // upload metadata
          _uploadProgress: 0,
          _status: 'queued'
        };
        // Copy preview if present
        if ('preview' in file) out.preview = (file as any).preview;
        // Copy lastModified if present
        if ('lastModified' in file) out.lastModified = (file as any).lastModified;
        // Copy any other enumerable properties
        for (const key in file) {
          if (!(key in out)) {
            out[key] = (file as any)[key];
          }
        }
        return out;
      });
      // Natural / numeric-aware sort so "Spread 1" comes before "Spread 2" and "Spread10" sorts after 9
      function tokenizeForSort(s: string) {
        // Normalize common separators that should not affect numeric ordering.
        // Remove whitespace so "Spread 20" and "Spread20" are treated the same.
        const norm = s.replace(/\s+/g, '');
        // split into runs of digits or non-digits
        const parts = norm.split(/(\d+)/).filter(Boolean).map(p => {
          if (/^\d+$/.test(p)) return Number(p);
          return p.toLowerCase();
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
          if (typeof ia === 'number') return -1; // numbers before letters
          if (typeof ib === 'number') return 1;
          const cmp = (ia as string).localeCompare(ib as string);
          if (cmp !== 0) return cmp;
        }
        return 0;
      }

      filesToUpload.sort((A, B) => {
        const aPath = (A.webkitRelativePath || A.name || '').replace(/\\/g, '/');
        const bPath = (B.webkitRelativePath || B.name || '').replace(/\\/g, '/');
        // compare by path segments so chapter/device ordering remains natural
        return naturalCompare(aPath, bPath);
      });
  // Debug: log filesToUpload after mapping (only when debugging)
  if (treeDebug) console.log('[validateFiles] filesToUpload sample:', filesToUpload.slice(0,3));
      
      // Calculate total size and extract chapters
      const { totalValidSize } = preprocessFiles(filesToUpload);
      totalSize = totalValidSize;
      
      // Extract inferred chapters
      inferredChapters = [...new Set(
        selectedFiles.map(file => extractChapter(file.webkitRelativePath || file.name)).filter((chapter): chapter is string => chapter !== null)
      )].sort();
      
    } catch (error) {
      console.error('Error validating files:', error);
      uploadError = 'Error analyzing files';
    } finally {
      validationInProgress = false;
      loadingExisting = false;
    }
  }

  // Helpers: XHR upload with progress + retry/backoff
  function uploadOnce(blobOrFile: Blob | File, relPath: string, onProgress: (pct: number) => void): Promise<{ ok: boolean; status: number; text?: string }> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('files', blobOrFile, relPath);
      fd.append('relativePaths', relPath);
      xhr.open('POST', '/api/panels/upload', true);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        const status = xhr.status || 0;
        resolve({ ok: status >= 200 && status < 300, status, text: xhr.responseText });
      };
      xhr.onerror = () => resolve({ ok: false, status: 0 });
      xhr.ontimeout = () => resolve({ ok: false, status: 0 });
      xhr.send(fd);
    });
  }

  async function uploadWithRetries(fileObj: any, relPath: string, maxRetries = 3) {
    const blobOrFile = fileObj._file || fileObj;
    let attempt = 0;
    const baseDelay = 500;
    while (attempt < maxRetries) {
      fileObj._status = 'uploading';
      const res = await uploadOnce(blobOrFile, relPath, (pct) => { fileObj._uploadProgress = pct; });
      if (res.ok) {
        fileObj._status = 'done';
        fileObj._uploadProgress = 100;
        return true;
      }
      // don't retry on client errors
      if (res.status >= 400 && res.status < 500 && res.status !== 0) {
        fileObj._status = `failed (${res.status})`;
        return false;
      }
      attempt++;
      fileObj._status = `retrying (${attempt}/${maxRetries})`;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
    fileObj._status = 'failed';
    return false;
  }

  async function handleUpload() {
    if (!filesToUpload.length) return;
    uploading = true; uploadError = ''; uploadSuccess = '';
    let topFolder = '';
    if (filesToUpload.length > 0) {
      const firstPath = filesToUpload[0].webkitRelativePath || filesToUpload[0].name;
      const parts = firstPath.split(/\\|\//);
      if (parts.length > 1) topFolder = parts[0];
    }

    let anyFailure = false;
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      let relPath = file.webkitRelativePath || file.name;
      if (topFolder && relPath.startsWith(topFolder + '/')) relPath = relPath.slice(topFolder.length + 1);
      if (topFolder && relPath.startsWith(topFolder + "\\")) relPath = relPath.slice(topFolder.length + 1);
      file._uploadProgress = 0;
      file._status = 'queued';
      const ok = await uploadWithRetries(file, relPath, 3);
      if (!ok) {
        anyFailure = true;
        uploadError = uploadError ? uploadError : `Some files failed to upload.`;
      }
    }
    uploading = false;
    if (!anyFailure) {
      // Treat the uploaded ordering as a tentative save: persist ordering to _order.json
      try {
        const orders = buildOrdersFromFiles(filesToUpload, topFolder);
        // Only call save if we actually have something to write
        if (Object.keys(orders).length > 0) {
          // Replace existing order entries with the newly uploaded ordering to prune stale entries
          await saveFullOrder(orders, true);
          // Refresh panelsFiles and order map so the tree reflects saved order immediately
          await fetchPanelsFiles();
        }
      } catch (e) {
        console.warn('Failed to persist tentative order after upload', e);
      }
      uploadSuccess = 'Upload complete!';
      selectedFiles = [];
      filesToUpload = [];
    }
  }

  // Persist order changes to server (writes static/panels/_order.json)
  async function savePanelsOrder(detail: { chapter: string; device: string; order: string[] }) {
    try {
      const payload = { orders: { [detail.chapter]: { [detail.device]: detail.order } } };
      const res = await fetch('/api/admin/panels/order', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) {
        console.warn('Failed to save panels order:', res.status);
      }
    } catch (err) {
      console.warn('Error saving panels order', err);
    }
  }

  // Save a full orders mapping (from ChapterTree 'saveOrder')
  // Save a full orders mapping. `replace` controls whether to replace the entire file.
  // `cleanup` when true instructs the server to prune redundant per-panel published flags
  // that match the chapter — only use cleanup=true when the admin clicks "Save Order".
  async function saveFullOrder(orders: Record<string, any>, replace = false, cleanup = false) {
    try {
      const payload: any = { orders };
      if (replace) payload.replace = true;
      if (cleanup) payload.cleanup = true;
      const res = await fetch('/api/admin/panels/order', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) {
        console.warn('Failed to save full panels order:', res.status);
      }
    } catch (err) {
      console.warn('Error saving full panels order', err);
    }
  }

  // Build an orders mapping from the current files array (keeps the current upload order)
  function buildOrdersFromFiles(files: any[], topFolder = ''): Record<string, any> {
    const orders: Record<string, any> = {};
    for (const f of files) {
      let relPath = (f.webkitRelativePath || f.name || '').replace(/\\/g, '/');
      if (topFolder && relPath.startsWith(topFolder + '/')) relPath = relPath.slice(topFolder.length + 1);
      if (!relPath) continue;
      const parts = relPath.split('/');
      // first segment should be chapter-like (chapter-1) but fall back to 'uncategorized'
      const chapterKey = parts[0] || 'uncategorized';
      const device = parts[1] || 'other';
      const slug = slugifyChapterKey(chapterKey);
      if (!orders[slug]) orders[slug] = {};
      if (!orders[slug][device]) orders[slug][device] = [];
      // store the relative path as it will be discovered under static/panels
      orders[slug][device].push(relPath);
    }
    return orders;
  }

  // Handler wrapper that serializes save-order operations and exposes a saving flag
  async function handleSaveOrderAndWait(orders: Record<string, any>) {
    savingOrder = true;
    try {
      // This is the explicit "Save Order" action: request server-side cleanup to tidy _order.json
      await saveFullOrder(orders, false, true);
    } finally {
      // small debounce to avoid flicker UI if save is super-fast
      setTimeout(() => { savingOrder = false; }, 150);
    }
  }

  // Handlers for ChapterTree dispatched events
  function handleTreeDelete(file: any) {
    // Remove from new uploads or existing panels depending on _isNew
    if (file._isNew) {
      filesToUpload = filesToUpload.filter(f => ((f as any).id || (f.webkitRelativePath || f.name)) !== (file.id || file.webkitRelativePath || file.name));
    } else {
      panelsFiles = panelsFiles.filter(f => (f.webkitRelativePath || f.name) !== (file.webkitRelativePath || file.name));
    }
  }

  async function handleTreeTogglePublish(file: any) {
    // Toggle panel-level published override. Rules:
    // - If file has explicit published === false and user clicks publish -> remove explicit published flag (delete override)
    // - Else if effectivePublished === true -> set explicit published = false
    // - Else (effective false and no explicit false) -> set explicit published = true
    const chapter = extractChapter(file.webkitRelativePath || file.name);
    const slug = slugifyChapterKey(chapter);
    // Determine chapter-level published flag
    const chapterPublished = panelsOrderMap && panelsOrderMap[slug] && ('published' in panelsOrderMap[slug]) ? !!panelsOrderMap[slug].published : undefined;
    // helper to compute effective published for this file
    function effectivePublishedFor(f: any) {
      if (f && ('published' in f)) return !!f.published;
      // if file has publishDate and it's in the past, consider published
      if (f && f.publishDate) {
        const pd = Date.parse(String(f.publishDate));
        if (!isNaN(pd) && pd <= Date.now()) return true;
        return false;
      }
      if (chapterPublished === true) return true;
      // if chapter has publishDate in panelsOrderMap
      const chapterMeta = panelsOrderMap && panelsOrderMap[slug] ? panelsOrderMap[slug] : {};
      if (chapterMeta && chapterMeta.publishDate) {
        const cp = Date.parse(String(chapterMeta.publishDate));
        if (!isNaN(cp) && cp <= Date.now()) return true;
      }
      return false;
    }

    const eff = effectivePublishedFor(file);
    // Update the appropriate array with explicit override changes
    if (file._isNew) {
      filesToUpload = filesToUpload.map(f => {
        if ((f.id || (f.webkitRelativePath || f.name)) !== (file.id || file.webkitRelativePath || file.name)) return f;
        const clone = { ...(f as any) } as any;
        if ('published' in clone && clone.published === false) {
          // was explicit false; clicking should remove the explicit flag
          delete clone.published;
        } else if (eff) {
          // effective published => clicking should set explicit false
          clone.published = false;
        } else {
          // effective unpublished => set explicit true
          clone.published = true;
        }
        return clone;
      });
    } else {
      panelsFiles = panelsFiles.map(f => {
        if ((f.webkitRelativePath || f.name) !== (file.webkitRelativePath || file.name)) return f;
        const clone = { ...f } as any;
        if ('published' in clone && clone.published === false) {
          delete clone.published;
        } else if (eff) {
          clone.published = false;
        } else {
          clone.published = true;
        }
        return clone;
      });
    }

    // Persist chapter-level mapping for this chapter (merge behavior)
    try {
      const chapterFiles = [
        ...panelsFiles.filter(pf => extractChapter(pf.webkitRelativePath || pf.name) === chapter),
        ...filesToUpload.filter(pf => extractChapter(pf.webkitRelativePath || pf.name) === chapter)
      ];
      function mapEntryLocal(f: any) {
        const rel = (f.webkitRelativePath || f.name || '').toString().replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
        const outHasMeta = ('published' in f) || ('publishDate' in f);
        if (outHasMeta) {
          const out: any = { path: rel };
          if ('published' in f) out.published = !!f.published;
          if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
          return out;
        }
        return rel;
      }
      const ordersForChapter: any = {
        [slug]: {
          desktop: (chapterFiles.filter((c:any) => /\/desktop\//i.test(c.webkitRelativePath || c.name)).map(mapEntryLocal)),
          mobile: (chapterFiles.filter((c:any) => /\/mobile\//i.test(c.webkitRelativePath || c.name)).map(mapEntryLocal)),
          other: (chapterFiles.filter((c:any) => !/\/desktop\//i.test(c.webkitRelativePath || c.name) && !/\/mobile\//i.test(c.webkitRelativePath || c.name)).map(mapEntryLocal))
        }
      };
      // Merge save (no replace) so other chapters are preserved
      await saveFullOrder(ordersForChapter, false);
    } catch (e) {
      console.warn('Failed to persist panel publish override', e);
    }
  }

  function handleTreeDeleteChapter(chapter: string) {
    panelsFiles = panelsFiles.filter(f => extractChapter(f.webkitRelativePath || f.name) !== chapter);
    filesToUpload = filesToUpload.filter(f => extractChapter((f as any).webkitRelativePath || f.name) !== chapter);
  }

  async function handleTreeTogglePublishChapter(chapter: string) {
    // Toggle chapter-level published flag only (do not flip each panel individually)
    const slug = slugifyChapterKey(chapter);
    const current = panelsOrderMap && panelsOrderMap[slug] && ('published' in panelsOrderMap[slug]) ? !!panelsOrderMap[slug].published : false;
    const desired = !current;
    // Optimistically update local order map so UI reflects change immediately
    panelsOrderMap = { ...panelsOrderMap, [slug]: { ...(panelsOrderMap[slug] || {}), published: desired } };
    const payload = { orders: { [slug]: { published: desired } } };
    try {
      const res = await fetch('/api/admin/panels/order', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) {
        console.warn('Failed to persist chapter publish flag:', res.status);
        // revert optimistic update
        panelsOrderMap = { ...panelsOrderMap, [slug]: { ...(panelsOrderMap[slug] || {}), published: current } };
      }
    } catch (e) {
      console.warn('Failed to persist chapter publish flag', e);
      // revert optimistic update
      panelsOrderMap = { ...panelsOrderMap, [slug]: { ...(panelsOrderMap[slug] || {}), published: current } };
    }
  }

  // Handle scheduling/publishDate set from ChapterTree
  async function handleTreeSetPublishDate(detail: { file: any; publishDate: string | null; publishTZ?: string | null; chapter: string; orders?: Record<string, any> }) {
    const { file, publishDate, publishTZ, orders } = detail;
    // Update in-memory state
    if (file._isNew) {
      filesToUpload = filesToUpload.map(f => ((f as any).id || (f.webkitRelativePath || f.name)) === (file.id || file.webkitRelativePath || file.name) ? { ...(f as any), publishDate: publishDate || undefined, publishTZ: publishTZ || undefined } : f);
    } else {
      panelsFiles = panelsFiles.map(f => ((f.webkitRelativePath || f.name) === (file.webkitRelativePath || file.name) ? { ...f, publishDate: publishDate || undefined, publishTZ: publishTZ || undefined } : f));
    }

    // Persist via order save if orders mapping supplied by ChapterTree
    if (orders) {
      await saveFullOrder(orders);
      // Optionally regenerate panels.json so reader sees changes immediately
      try { await regeneratePanels(); } catch (_) {}
    }
  }

  // Insert a YouTube link into the given chapter as an 'other' panel
  function extractYouTubeId(urlOrId: string) {
    // If full URL, extract v= or youtu.be/ or /embed/
    try {
      const u = new URL(urlOrId);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if (u.searchParams.has('v')) return u.searchParams.get('v');
      const pathParts = u.pathname.split('/');
      return pathParts[pathParts.length-1];
    } catch (e) {
      // treat input as id
      return urlOrId;
    }
  }

  function slugifyChapterKey(key: string) {
    const m = key.match(/chapter\s*(\d+)/i);
    if (m && m[1]) return `chapter-${m[1]}`;
    return key.toLowerCase().replace(/\s+/g, '-');
  }

  async function handleInsertYouTube(chapter: string) {
    const url = window.prompt('YouTube URL or video ID to insert into ' + chapter + ':');
    if (!url) return;
    const id = extractYouTubeId(url);
    const slug = slugifyChapterKey(chapter);
    const relDesktop = `${slug}/desktop/youtube:${id}`;
    const relMobile = `${slug}/mobile/youtube:${id}`;
    // Insert placeholder for both desktop and mobile so admin can drag into place for each device
    panelsFiles = [
      ...panelsFiles,
      { name: `YouTube: ${id} (desktop)`, webkitRelativePath: relDesktop, size: 0, type: 'video/youtube', published: false },
      { name: `YouTube: ${id} (mobile)`, webkitRelativePath: relMobile, size: 0, type: 'video/youtube', published: false }
    ];
    // Notify admin that both entries were created and need placement
    window.alert('Inserted YouTube placeholders for Desktop and Mobile. Please drag each into its desired position for Desktop and Mobile ordering.');
  }

  // Admin-triggered regenerate panels (calls server endpoint)
  let regenerating = false;
  let regenerateStatus = '';
  let savingOrder = false;

  // ref to the hidden input so a button can trigger it
  let panelInput: HTMLInputElement | null = null;

  // chooser info text shown to the right of the chooser button: "X files found, Y new"
  $: chooserInfo = selectedFiles.length
    ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} found, ${filesToUpload.length} new`
    : 'No folder chosen';

  function openFolderPicker() {
    panelInput?.click();
  }

  async function regeneratePanels() {
    regenerating = true;
    regenerateStatus = '';
    try {
      const res = await fetch('/api/admin/panels/regenerate', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) {
        regenerateStatus = `Regenerate failed: ${res.status}`;
      } else {
        const data = await res.json().catch(() => ({}));
        regenerateStatus = data && data.success ? 'Panels regenerated successfully.' : (data && data.error) || 'Panels regenerated (server returned no details).';
      }
    } catch (err: any) {
      regenerateStatus = `Regenerate error: ${err?.message || String(err)}`;
    } finally {
      regenerating = false;
    }
  }
</script>

<section class="prose upload-section">
  <h1>Upload New Panels</h1>
  
  <!-- File Selection -->
  <form class="upload-form" on:submit|preventDefault={handleUpload}>
    <div class="chooser">
      <button type="button" class="btn btn-outline" on:click={openFolderPicker}>
        {loadingExisting ? 'Analyzing...' : 'Choose Folder'}
      </button>
      <span class="chooser-info" aria-live="polite">{chooserInfo}</span>
      <input id="panel-folder-input" bind:this={panelInput} type="file" webkitdirectory multiple on:change={handleFileSelect} class="file-input" aria-hidden="true" />
    </div>

    <div class="actions">
      <button class="btn btn-primary" type="submit" disabled={uploading || !filesToUpload.length || conflicts.errors.length > 0}>
        {uploading ? 'Uploading...' : 'Upload All'}
      </button>
      <button type="button" class="btn btn-secondary" style="margin-left:0.5rem" on:click={regeneratePanels} disabled={regenerating || savingOrder}>
        {regenerating || savingOrder ? 'Processing...' : 'Regenerate panels'}
      </button>
    </div>
  </form>
  
  <!-- Enhanced Upload Summary -->
  <!-- Always show the current panels tree -->
  <div class="flex items-center gap-3">
    <h2 class="mt-8 mb-2 text-lg font-semibold text-slate-100">Current Comic File Tree</h2>
    <label class="text-sm text-slate-400 ml-2" style="margin-top:0.5rem;">
      <input type="checkbox" bind:checked={treeDebug} style="margin-right:0.4rem;vertical-align:middle;" />
      Show debug
    </label>
  </div>
  {#if panelsFiles.length > 0 || filesToUpload.length > 0}
    <ChapterTree
      existingFiles={panelsFiles}
      newFiles={filesToUpload}
      orderMap={panelsOrderMap}
      conflicts={conflicts}
      debug={treeDebug}
      key={panelsFilesKey + '|' + filesToUpload.length}
      on:delete={e => handleTreeDelete(e.detail.file)}
      on:togglePublish={e => handleTreeTogglePublish(e.detail.file)}
      on:deleteChapter={e => handleTreeDeleteChapter(e.detail.chapter)}
      on:togglePublishChapter={e => handleTreeTogglePublishChapter(e.detail.chapter)}
    on:orderChange={e => savePanelsOrder(e.detail)}
    on:saveOrder={e => handleSaveOrderAndWait(e.detail.orders)}
      on:insertYouTube={e => handleInsertYouTube(e.detail.chapter)}
      on:setPublishDate={e => handleTreeSetPublishDate(e.detail)}
    />
  {:else}
    <div class="text-slate-400 text-sm">Loading comic file tree...</div>
  {/if}

  {#if selectedFiles.length > 0}
    <UploadSummary 
      files={selectedFiles} 
      {conflicts} 
      {inferredChapters} 
      {totalSize} 
    />
    <!-- ThumbnailGallery removed: unified tree now handles all files -->
  {/if}
  <!-- Status Messages -->
  {#if uploadError}<div class="error">{uploadError}</div>{/if}
  {#if uploadSuccess}<div class="success">{uploadSuccess}</div>{/if}
  {#if regenerateStatus}
    <div class="info" style="margin-top:0.5rem">{regenerateStatus}</div>
  {/if}
  
  <!-- Validation Errors (if any) -->
  {#if conflicts.errors.length > 0}
    <div class="validation-errors bg-red-900 border border-red-600 rounded-lg p-4 mt-4">
      <h4 class="text-red-100 font-medium mb-2">
        <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        Upload Errors
      </h4>
      <ul class="text-red-200 text-sm space-y-1">
        {#each conflicts.errors as error}
          <li>• {error}</li>
        {/each}
      </ul>
    </div>
  {/if}
  
  <!-- File Preview (enhanced) -->
  {#if filesToUpload.length > 0}
    <div class="file-list-preview bg-slate-800 border border-slate-700 rounded-lg p-4 mt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-white font-medium">Ready for Upload</h4>
        <span class="text-sm text-slate-400">{filesToUpload.length} files</span>
      </div>
      
      {#if filesToUpload.length <= 6 || showAllFiles}
        <ul class="space-y-1">
          {#each filesToUpload as file}
            <li class="text-slate-300 text-sm">
              <div class="flex items-center justify-between">
                <span class="truncate">{file.webkitRelativePath || file.name}</span>
                <div class="flex items-center">
                  <span class="text-slate-500 text-xs ml-2 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                </div>
              </div>
              <div class="upload-meta mt-1 flex items-center gap-2">
                <span class="text-xs text-slate-400">{file._status || 'queued'}</span>
                <div class="progress" style="width:140px">
                  <div class="bar" style="width:{file._uploadProgress || 0}%"></div>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <ul class="space-y-1">
          {#each filesToUpload.slice(0,3) as file}
            <li class="text-slate-300 text-sm">
              <div class="flex items-center justify-between">
                <span class="truncate">{file.webkitRelativePath || file.name}</span>
                <div class="flex items-center">
                  <span class="text-slate-500 text-xs ml-2 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                </div>
              </div>
              <div class="upload-meta mt-1 flex items-center gap-2">
                <span class="text-xs text-slate-400">{file._status || 'queued'}</span>
                <div class="progress" style="width:140px">
                  <div class="bar" style="width:{file._uploadProgress || 0}%"></div>
                </div>
              </div>
            </li>
          {/each}
          <li class="text-slate-500 text-sm text-center py-1">
            ... {filesToUpload.length - 6} more files ...
          </li>
          {#each filesToUpload.slice(-3) as file}
            <li class="text-slate-300 text-sm">
              <div class="flex items-center justify-between">
                <span class="truncate">{file.webkitRelativePath || file.name}</span>
                <div class="flex items-center">
                  <span class="text-slate-500 text-xs ml-2 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                </div>
              </div>
              <div class="upload-meta mt-1 flex items-center gap-2">
                <span class="text-xs text-slate-400">{file._status || 'queued'}</span>
                <div class="progress" style="width:140px">
                  <div class="bar" style="width:{file._uploadProgress || 0}%"></div>
                </div>
              </div>
            </li>
          {/each}
        </ul>
        <button class="btn btn-xs btn-ghost text-slate-400 hover:text-white mt-2" on:click={() => showAllFiles = true}>
          Show all {filesToUpload.length} files
        </button>
      {/if}
    </div>
  {/if}
</section>

<style>
.upload-section { 
  max-width: 800px; 
  margin: auto;
  padding: 1rem;
}

/* visually hide the file input but keep it operable via the label */
.file-input {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.chooser {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-right: 0.5rem;
}
.chooser-info {
  color: #ccc;
  font-size: 0.95rem;
}

.upload-form {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.chooser + .actions { 
  margin-left: auto;
}

.error { 
  color: #ff4d4f; 
  background: #2d1b1b; 
  border: 1px solid #ff4d4f; 
  padding: 0.75rem; 
  border-radius: 0.5rem; 
  margin-top: 0.5rem;
}
.success { 
  color: #4caf50; 
  background: #1b2d1b; 
  border: 1px solid #4caf50; 
  padding: 0.75rem; 
  border-radius: 0.5rem; 
  margin-top: 0.5rem;
}
.info { 
  color: #ccc; 
  background: #2a2a2a; 
  border: 1px solid #555; 
  padding: 0.75rem; 
  border-radius: 0.5rem; 
  margin-top: 0.5rem;
}

.validation-errors ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.file-list-preview ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.upload-meta .progress {
  background: #0f172a; /* slate-900 */
  border-radius: 6px;
  height: 8px;
  overflow: hidden;
}
.upload-meta .progress .bar {
  height: 100%;
  background: #10b981; /* emerald-500 */
  transition: width 120ms linear;
}

/* Button styles */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
}
.btn-outline {
  border: 1px solid #4b5563;
  color: #d1d5db;
  background-color: transparent;
}
.btn-outline:hover {
  background-color: #374151;
  border-color: #6b7280;
}
.btn-primary {
  background-color: #2563eb;
  color: white;
}
.btn-primary:hover {
  background-color: #1d4ed8;
}
.btn-primary:disabled {
  background-color: #4b5563;
  color: #9ca3af;
}
.btn-secondary {
  background-color: #4b5563;
  color: white;
}
.btn-secondary:hover {
  background-color: #374151;
}
.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
.btn-ghost {
  background-color: transparent;
}
.btn-ghost:hover {
  background-color: #374151;
}

/* Responsive design */
@media (max-width: 640px) {
  .upload-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .chooser {
    justify-content: center;
  }
  
  .actions {
    justify-content: center;
    margin-left: 0;
  }
}
</style>

