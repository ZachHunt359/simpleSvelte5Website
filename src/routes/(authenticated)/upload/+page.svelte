<script lang="ts">
  import UploadSummary from '$lib/UploadSummary.svelte';
  // import ThumbnailGallery from '$lib/ThumbnailGallery.svelte';
  import ChapterTree from '$lib/ChapterTree.svelte';
  import ConflictResolutionModal from '$lib/ConflictResolutionModal.svelte';
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
  
  // Conflict resolution modal state
  let showConflictModal = false;
  let conflictUploadMode: 'regular' | 'flattened' = 'regular'; // Track which upload mode triggered conflicts
  let pendingConflicts: Array<{
    file: File;
    existingPath: string;
    size: number;
    existingSize?: number;
  }> = [];
  let conflictResolutions: Record<string, 'keep-existing' | 'replace' | 'keep-both' | 'skip'> = {};
  // Overall upload progress (0-100)
  let overallProgress = 0;
  // ETA (seconds remaining), -1 when unknown
  let overallETA = -1;
  // moving average bytes/sec for ETA
  let emaBytesPerSec = 0;
  let uploadStartTime: number | null = null;
  let lastBytesSeen = 0;
  // timestamp (ms) of last sample used to compute EMA
  let lastUpdateTime: number | null = null;
  // recent instantaneous bps samples to stabilize early ETA estimates
  let bpsSamples: number[] = [];
  // track how many files completed since last ETA recalc
  let filesCompletedSinceLastCalc = 0;
  // chunking thresholds (bytes)
  const CHUNK_THRESHOLD = 8 * 1024 * 1024; // 8MB
  const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
  let inferredChapters: string[] = [];
  // Local debug toggle to control tree/component debug output
  let treeDebug = false;
  
  // File removal state
  let selectedFilesForRemoval: Set<number> = new Set();
  
  // Missing metadata prompt state
  let showMissingMetadataModal = false;
  let missingChapter = false;
  let missingDevice = false;
  let detectedChapter: string | null = null;
  let detectedDevice: 'desktop' | 'mobile' | null = null;
  let userSelectedChapter = '1';  // Default to chapter 1
  let userSelectedDevice: 'desktop' | 'mobile' = 'desktop';  // Default to desktop

  // Natural / numeric-aware sort helpers (shared so merging uses same ordering)
  function tokenizeForSort(s: string) {
    // Strip file extension before tokenizing to avoid extension interfering with sort
    const norm = String(s).replace(/\s+/g, '');
    const withoutExt = norm.replace(/\.(png|jpg|jpeg|gif|webp|webm)$/i, '');
    const parts = withoutExt.split(/(\d+)/).filter(Boolean).map(p => {
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
      if (typeof ia === 'number') return -1;
      if (typeof ib === 'number') return 1;
      const cmp = (ia as string).localeCompare(ib as string);
      if (cmp !== 0) return cmp;
    }
    return 0;
  }

  // Merge helpers: handle array entries that may be strings or metadata objects { path: '...' }
  function entryPath(e: string | { path?: string }) {
    return typeof e === 'string' ? e : (e && (e as any).path) || '';
  }

  function mergeInsertExisting(existing: (string|any)[], newItems: string[], naturalCompareFn: (a: string, b: string) => number) {
    const existingPaths = existing.map(entryPath);
    const filteredNew = newItems.filter(n => !existingPaths.includes(n));
    if (filteredNew.length === 0) return existing.slice();

    const sortedNew = filteredNew.slice().sort(naturalCompareFn);

    const existingWithPaths = existing.map(e => ({ raw: e, path: entryPath(e) }));

    for (const n of sortedNew) {
      let inserted = false;
      for (let i = 0; i < existingWithPaths.length; i++) {
        const cmp = naturalCompareFn(n, existingWithPaths[i].path);
        if (cmp <= 0) {
          existingWithPaths.splice(i, 0, { raw: n, path: n });
          inserted = true;
          break;
        }
      }
      if (!inserted) existingWithPaths.push({ raw: n, path: n });
    }

    return existingWithPaths.map(x => x.raw);
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      selectedFiles = Array.from(input.files);
      uploadError = '';
      uploadSuccess = '';
      
      // Detect chapter and device for each file individually
      if (selectedFiles.length > 0) {
        let hasChapterlessFiles = false;
        let hasDevicelessFiles = false;
        let detectedChapters = new Set<string>();
        
        // Analyze each file's path
        selectedFiles.forEach((file: any) => {
          const filePath = file.webkitRelativePath || file.name;
          const pathParts = filePath.split(/[\\/]/);
          
          // Detect chapter from this file's path
          let fileChapter: string | null = null;
          for (const part of pathParts) {
            const chapterMatch = part.match(/^chapter-(\d+)$/i);
            if (chapterMatch) {
              fileChapter = chapterMatch[1];
              if (fileChapter) detectedChapters.add(fileChapter);
              break;
            }
          }
          
          // Detect device from this file's path
          let fileDevice: 'desktop' | 'mobile' | null = null;
          for (const part of pathParts) {
            const partLower = part.toLowerCase();
            if (partLower === 'desktop') {
              fileDevice = 'desktop';
              break;
            } else if (partLower === 'mobile') {
              fileDevice = 'mobile';
              break;
            }
          }
          
          // Check if this is a special file (like thumbnails) that doesn't need a device
          const fileName = pathParts[pathParts.length - 1];
          const isSpecialFile = /\.thumb\./i.test(fileName) || /thumbnail/i.test(fileName);
          
          // Store detected metadata on the file
          file._detectedChapter = fileChapter;
          file._detectedDevice = fileDevice;
          file._isSpecialFile = isSpecialFile;
          
          // Track if we have files missing metadata (excluding special files)
          if (!fileChapter && !isSpecialFile) hasChapterlessFiles = true;
          if (!fileDevice && !isSpecialFile) hasDevicelessFiles = true;
        });
        
        // Determine if we need to prompt for missing metadata
        // Only prompt if we have non-special files missing chapter/device
        missingChapter = hasChapterlessFiles;
        missingDevice = hasDevicelessFiles;
        
        if (missingChapter || missingDevice) {
          // Set defaults based on what we detected
          if (detectedChapters.size === 1) {
            userSelectedChapter = Array.from(detectedChapters)[0];
            detectedChapter = userSelectedChapter;
          } else if (detectedChapters.size > 1) {
            // Multiple chapters detected - use the first one as default
            userSelectedChapter = Array.from(detectedChapters).sort()[0];
            detectedChapter = userSelectedChapter;
          }
          
          console.log(`[Upload] Some files missing metadata - Chapter: ${missingChapter ? 'MISSING' : 'detected'}, Device: ${missingDevice ? 'MISSING' : 'detected'}`);
          console.log(`[Upload] Files breakdown:`, selectedFiles.map((f: any) => ({
            name: f.name,
            chapter: f._detectedChapter,
            device: f._detectedDevice,
            special: f._isSpecialFile
          })));
          
          // Show modal to get missing information
          showMissingMetadataModal = true;
          return; // Don't proceed with validation yet
        }
        
        // All files have proper metadata detected
        console.log(`[Upload] All files have proper metadata detected`);
        console.log(`[Upload] Files breakdown:`, selectedFiles.map((f: any) => ({
          name: f.name,
          chapter: f._detectedChapter,
          device: f._detectedDevice,
          special: f._isSpecialFile
        })));
      }
      
      // Start validation process
      await validateFiles();
    }
  }
  
  // Handle confirmation from missing metadata modal
  async function handleMetadataConfirm() {
    showMissingMetadataModal = false;
    
    // Apply user selections only to files that are missing metadata
    const chapter = missingChapter ? userSelectedChapter : detectedChapter;
    const device = missingDevice ? userSelectedDevice : detectedDevice;
    
    console.log(`[Upload] User confirmed - Chapter: ${chapter}, Device: ${device}`);
    
    selectedFiles.forEach((file: any) => {
      // Only override for non-special files that are missing metadata
      if (!file._isSpecialFile) {
        if (!file._detectedChapter) file._detectedChapter = chapter;
        if (!file._detectedDevice) file._detectedDevice = device;
      }
    });
    
    console.log(`[Upload] After user confirmation:`, selectedFiles.map((f: any) => ({
      name: f.name,
      chapter: f._detectedChapter,
      device: f._detectedDevice,
      special: f._isSpecialFile
    })));
    
    // Now proceed with validation
    await validateFiles();
  }
  
  // Handle cancel from missing metadata modal
  function handleMetadataCancel() {
    showMissingMetadataModal = false;
    selectedFiles = [];
    filesToUpload = []; // Clear files to upload so they don't appear in tree
    uploadError = 'Upload cancelled - please organize files in chapter-X/desktop or chapter-X/mobile folders.';
  }

  import { onMount } from 'svelte';

  // Shared chapter extraction function (top-level)
  function extractChapter(path: string): string | null {
    // Normalize path: strip leading slash and 'panels/' prefix before extracting chapter
    const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^panels\//, '');
    const parts = normalizedPath.split(/\\|\//);
    let result = null;
    if (parts.length > 1 && /^chapter-\d+$/i.test(parts[0])) {
      const num = parts[0].match(/chapter-(\d+)/i);
      if (num && num[1]) result = `Chapter ${num[1]}`;
    }
    if (!result) {
      // fallback: look for any chapter-N in the path
      const chapterMatch = normalizedPath.match(/chapter-(\d+)/i);
      if (chapterMatch && chapterMatch[1]) result = `Chapter ${chapterMatch[1]}`;
    }
    if (!result) result = 'Uncategorized';
    if (treeDebug) console.log('extractChapter:', { path, normalizedPath, result });
    return result;
  }

  // Convert chapter slug (e.g., "chapter-1") to formatted name (e.g., "Chapter 1")
  function slugToChapterName(slug: string): string {
    const match = slug.match(/chapter-(\d+)/i);
    if (match && match[1]) return `Chapter ${match[1]}`;
    if (slug === 'uncategorized') return 'Uncategorized';
    return slug;
  }

  // Fetch all files in /panels and build a File[] for tree rendering
  async function fetchPanelsFiles() {
    console.log('[fetchPanelsFiles] Starting fetch...');
    // Fetch file list and _order.json (if present) then reorder files according to _order.json
    const [listRes, orderRes] = await Promise.all([
      fetch('/api/panels/list', { credentials: 'same-origin' }).catch(() => null),
      fetch('/panels/_order.json', { credentials: 'same-origin' }).catch(() => null)
    ]);
    if (!listRes || !listRes.ok) return;
    const fileList: string[]  = await listRes.json();
    console.log('[fetchPanelsFiles] File list length:', fileList.length);

    // Load order map if available
    try {
      if (orderRes && orderRes.ok) {
        panelsOrderMap = await orderRes.json();
        console.log('[fetchPanelsFiles] Loaded _order.json, chapters:', Object.keys(panelsOrderMap));
        // Log YouTube entries found
        for (const chapter of Object.keys(panelsOrderMap)) {
          const chapterData = panelsOrderMap[chapter];
          for (const device of ['desktop', 'mobile', 'other']) {
            const arr = chapterData[device] || [];
            const youtubeEntries = arr.filter((item: any) => 
              (typeof item === 'object' && item.type === 'youtube') || 
              (typeof item === 'string' && item.startsWith('youtube:'))
            );
            if (youtubeEntries.length > 0) {
              console.log(`[fetchPanelsFiles] Found ${youtubeEntries.length} YouTube entries in ${chapter}/${device}:`, youtubeEntries);
            }
          }
        }
      } else {
        panelsOrderMap = {};
        console.log('[fetchPanelsFiles] No _order.json found, using empty map');
      }
    } catch (e) {
      panelsOrderMap = {};
      console.error('[fetchPanelsFiles] Error loading _order.json:', e);
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
    const youtubeIds = new Set<string>(); // Track YouTube entries to prevent duplicates
    try {
      // Sort chapter keys to ensure consistent chapter ordering (chapter-1, chapter-2, etc.)
      const chapterKeys = Object.keys(panelsOrderMap || {}).sort((a, b) => {
        const aMatch = a.match(/chapter-(\d+)/i);
        const bMatch = b.match(/chapter-(\d+)/i);
        if (aMatch && bMatch) {
          return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        }
        return a.localeCompare(b);
      });
      
      for (const chapter of chapterKeys) {
        const entry = panelsOrderMap[chapter] || {};
        const chapterName = slugToChapterName(chapter); // Convert slug to formatted name
        for (const dev of ['desktop', 'mobile', 'other']) {
          const arr = entry[dev] || [];
          for (const item of arr) {
            // Handle YouTube entries (objects with type='youtube' and id)
            if (typeof item === 'object' && item && item.type === 'youtube' && item.id) {
              const youtubeEntry = {
                name: `YouTube: ${item.id}`,
                webkitRelativePath: `youtube:${item.id}`,
                id: `youtube-${item.id}`,
                size: 0,
                type: 'youtube',
                youtubeId: item.id,
                ...item, // Spread item first to get title, etc.
                _device: dev, // Then explicitly set device (overrides any _device from item)
                _chapter: chapterName // Then explicitly set chapter (overrides any _chapter from item)
              };
              console.log('[fetchPanelsFiles] YouTube entry created:', { id: item.id, dev, chapterName, _device: youtubeEntry._device, _chapter: youtubeEntry._chapter });
              ordered.push(youtubeEntry);
              youtubeIds.add(item.id); // Mark this YouTube video as processed
              continue;
            }
            
            // item may be a string or an object { path: '...' }
            let rel = (typeof item === 'string' ? item : (item && item.path))?.toString() || null;
            
            // Handle YouTube entries stored as strings (format: "youtube:VIDEO_ID")
            if (rel && rel.startsWith('youtube:')) {
              const videoId = rel.slice(8); // Remove "youtube:" prefix
              
              // Skip if we already added this YouTube entry
              if (youtubeIds.has(videoId)) {
                continue;
              }
              
              const youtubeEntry: any = {
                name: `YouTube: ${videoId}`,
                webkitRelativePath: rel,
                id: `youtube-${videoId}`,
                size: 0,
                type: 'youtube',
                youtubeId: videoId,
                // Preserve metadata if item is an object
                ...(typeof item === 'object' && item ? item : {}),
                _device: dev, // Then explicitly set device (overrides any _device from item)
                _chapter: chapterName // Then explicitly set chapter (overrides any _chapter from item)
              };
              console.log('[fetchPanelsFiles] YouTube string entry created:', { videoId, dev, chapterName, _device: youtubeEntry._device, _chapter: youtubeEntry._chapter });
              
              // Try to fetch title if not already present
              if (!youtubeEntry.title) {
                try {
                  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                  const response = await fetch(oembedUrl);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.title) {
                      youtubeEntry.title = data.title;
                    }
                  }
                } catch (e) {
                  console.warn(`Failed to fetch YouTube title for ${videoId}:`, e);
                }
              }
              
              ordered.push(youtubeEntry);
              youtubeIds.add(videoId); // Mark this YouTube video as processed
              continue;
            }
            if (!rel) continue;
            // Normalize: strip leading slash and 'panels/' prefix
            rel = rel.replace(/^\/+/, '').replace(/^panels\//, '');
            if (lookup[rel] && !added.has(rel)) {
              // Preserve any metadata from the order map entry
              const fileObj = { ...lookup[rel] };
              if (typeof item === 'object' && item) {
                if ('published' in item) fileObj.published = item.published;
                if ('publishDate' in item) fileObj.publishDate = item.publishDate;
              }
              ordered.push(fileObj);
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
    // Don't add files that look like YouTube entries from the lookup
    const remaining = Object.keys(lookup).filter(k => {
      // Skip if already added
      if (added.has(k)) return false;
      // Skip if it's a YouTube entry path (shouldn't happen, but just in case)
      if (k.startsWith('youtube:')) return false;
      return true;
    }).sort(naturalCompare);
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
      
      // Detect actual file conflicts (duplicates that need resolution)
      pendingConflicts = [];
      conflictResolutions = {};
      
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
      
      // Build conflicts list for modal
      for (const file of selectedFiles) {
        let relPath = file.webkitRelativePath || file.name;
        if (topFolder && relPath.startsWith(topFolder + '/')) relPath = relPath.slice(topFolder.length + 1);
        if (topFolder && relPath.startsWith(topFolder + "\\")) relPath = relPath.slice(topFolder.length + 1);
        relPath = relPath.replace(/\\/g, '/');
        
        if (normalizedExisting.includes(relPath)) {
          // Found a conflict - try to get existing file size
          const existingFile = panelsFiles.find(pf => {
            const pfPath = (pf.webkitRelativePath || pf.name || '').replace(/\\/g, '/');
            return pfPath.endsWith(relPath) || pfPath === relPath;
          });
          
          pendingConflicts.push({
            file,
            existingPath: relPath,
            size: file.size,
            existingSize: existingFile?.size
          });
        }
      }
      
      // Filter files (remove duplicates for now - will be re-added based on resolution)
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
        const originalPath = file.webkitRelativePath ? file.webkitRelativePath.replace(/\\/g, '/') : file.name;
        
        // Get detected metadata
        const detectedDevice = (file as any)._detectedDevice;
        const detectedChapter = (file as any)._detectedChapter;
        const isSpecialFile = (file as any)._isSpecialFile;
        
        let adjustedPath: string;
        
        // COMPLETE PATH RECONSTRUCTION: scan entire path for valid folders, then rebuild from scratch
        if (!isSpecialFile && (detectedDevice || detectedChapter)) {
          // Split path into parts
          const pathParts = originalPath.split('/');
          const fileName = pathParts[pathParts.length - 1];
          
          // Scan for valid intermediate folders (like "Spread X") that should be preserved
          const validFolders: string[] = [];
          for (const part of pathParts.slice(0, -1)) { // Exclude filename
            // Keep only Spread folders - everything else gets discarded
            if (part.match(/^spread\s+\d+$/i)) {
              validFolders.push(part);
            }
          }
          
          // Rebuild path from scratch using detected metadata
          const chapter = detectedChapter || '1';
          const device = detectedDevice || 'desktop';
          
          // Structure: chapter-X/device/[Spread X/]filename
          const intermediatePath = validFolders.length > 0 ? validFolders.join('/') + '/' : '';
          adjustedPath = `chapter-${chapter}/${device}/${intermediatePath}${fileName}`;
          
          console.log(`[Upload] Rebuilt path for "${fileName}": "${originalPath}" → "${adjustedPath}"`);
        } else if (isSpecialFile) {
          // Special files: chapter/filename (no device folder)
          const pathParts = originalPath.split('/');
          const fileName = pathParts[pathParts.length - 1];
          const chapter = detectedChapter || '1';
          
          adjustedPath = `chapter-${chapter}/${fileName}`;
          console.log(`[Upload] Rebuilt special file path: "${originalPath}" → "${adjustedPath}"`);
        } else {
          // No metadata detected - use original path as-is
          adjustedPath = originalPath;
        }
        
        const out: any = {
          name: file.name,
          webkitRelativePath: adjustedPath,
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
        
        // If we detected device, also set _device property for ChapterTree
        if (detectedDevice) {
          out._device = detectedDevice;
        }
        
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
      // naturalCompare is defined at module scope and reused here

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
      
      // Show conflict resolution modal if there are conflicts
      if (pendingConflicts.length > 0) {
        conflictUploadMode = 'regular';
        showConflictModal = true;
      }
      
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
          // kick off ETA tracking
          if (!uploadStartTime) uploadStartTime = Date.now();
          updateETA();
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
    // proactively chunk very large files instead of trying a single large POST
    if ((blobOrFile as File).size && (blobOrFile as File).size > CHUNK_THRESHOLD) {
      fileObj._status = 'chunking';
      const chunkOk = await attemptChunkedUpload(blobOrFile as File, relPath, fileObj);
      if (chunkOk) {
        fileObj._status = 'done';
        fileObj._uploadProgress = 100;
        updateOverallProgress();
        return true;
      }
      // fall through to try normal upload retries if chunking failed
      fileObj._status = 'chunk-failed';
    }
    while (attempt < maxRetries) {
      fileObj._status = 'uploading';
      const res = await uploadOnce(blobOrFile, relPath, (pct) => { fileObj._uploadProgress = pct; updateOverallProgress(); });
      if (res.ok) {
        fileObj._status = 'done';
        fileObj._uploadProgress = 100;
        updateOverallProgress();
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
    // If the file is large, attempt chunked upload as a fallback
    if ((blobOrFile as File).size && (blobOrFile as File).size > CHUNK_THRESHOLD) {
      fileObj._status = 'attempting chunked upload';
      const chunkOk = await attemptChunkedUpload(blobOrFile as File, relPath, fileObj);
      if (chunkOk) {
        fileObj._status = 'done';
        fileObj._uploadProgress = 100;
        updateOverallProgress();
        return true;
      }
    }
    fileObj._status = 'failed';
    return false;
  }

  // Compute and update overallProgress from per-file uploadProgress values
  function updateOverallProgress() {
    try {
      const all = [...filesToUpload];
      if (all.length === 0) {
        overallProgress = 0;
        overallETA = -1;
        return;
      }
      // Weight by file size if available
      const total = all.reduce((s, f) => s + ((f.size || 0) || 0), 0) || all.length;
      let acc = 0;
      let uploadedBytes = 0;
      for (const f of all) {
        const weight = (f.size || 0) || 1;
        const pct = (f._uploadProgress || 0) / 100;
        acc += pct * weight;
        uploadedBytes += pct * weight;
      }
      overallProgress = Math.round((acc / total) * 100);

      // Recalculate ETA only periodically (every 10 files or 25% of queue, whichever is smaller)
      const recalcInterval = Math.min(10, Math.ceil(all.length * 0.25));
      const completedCount = all.filter(f => f._status === 'done').length;
      const shouldRecalc = (completedCount - filesCompletedSinceLastCalc) >= recalcInterval;

      if (!shouldRecalc && overallETA >= 0) {
        // Skip recalc; just decrement existing ETA estimate if we made progress
        const prevProgress = overallProgress;
        if (overallProgress > prevProgress && overallETA > 0) {
          // rough decrement proportional to progress gain
          const progressDelta = overallProgress - prevProgress;
          const etaDecrement = Math.max(1, Math.round(overallETA * (progressDelta / 100)));
          overallETA = Math.max(0, overallETA - etaDecrement);
        }
        return;
      }

      // Perform full ETA recalculation
      filesCompletedSinceLastCalc = completedCount;
      const now = Date.now();
      if (!uploadStartTime && uploadedBytes > 0) {
        uploadStartTime = now;
        lastUpdateTime = now;
        lastBytesSeen = uploadedBytes;
        emaBytesPerSec = 0;
        bpsSamples = [];
      }
      const bytesSeen = uploadedBytes;
      const prevTime = lastUpdateTime || uploadStartTime || now;
      let dt = (now - prevTime) / 1000;
      if (dt <= 0) dt = 0.1;
      const deltaBytes = Math.max(0, bytesSeen - (lastBytesSeen || 0));
      const instantBps = deltaBytes / dt;

      // push into short sample buffer and cap length
      bpsSamples.push(instantBps);
      if (bpsSamples.length > 6) bpsSamples.shift();

      // only start computing a stable EMA after we have at least two samples and at least 1s elapsed
      const haveEnoughSamples = bpsSamples.length >= 2 && ((now - (uploadStartTime || now)) >= 1000);
      const alpha = 0.12; // slower smoothing to reduce jitter
      if (haveEnoughSamples) {
        // derive a robust instant by taking the median of recent samples to avoid spikes
        const sorted = bpsSamples.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const medianInstant = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        if (!emaBytesPerSec || emaBytesPerSec <= 0) emaBytesPerSec = medianInstant;
        else emaBytesPerSec = alpha * medianInstant + (1 - alpha) * emaBytesPerSec;
      } else {
        // warm up: keep last values but don't expose ETA until stable
        if (!emaBytesPerSec || emaBytesPerSec <= 0) emaBytesPerSec = instantBps;
        else emaBytesPerSec = 0.6 * emaBytesPerSec + 0.4 * instantBps;
      }

      lastBytesSeen = bytesSeen;
      lastUpdateTime = now;

      const remaining = Math.max(0, total - uploadedBytes);
      // show ETA only when EMA indicates a reasonable throughput and we had time to warm up
      const minShowBps = 24; // bytes/sec threshold for showing ETA (keeps very noisy/slow cases hidden)
      if (haveEnoughSamples && emaBytesPerSec > minShowBps) {
        overallETA = Math.max(0, Math.round(remaining / emaBytesPerSec));
      } else {
        overallETA = -1; // unknown or too slow to estimate reliably
      }
    } catch (e) {
      overallProgress = 0;
      overallETA = -1;
    }
  }

  function updateETA() {
    // helper to trigger ETA recalculation by delegating to updateOverallProgress
    updateOverallProgress();
  }

  // Format seconds into a human friendly "Xm Ys" string; return empty when unknown
  function formatETA(sec: number) {
    if (typeof sec !== 'number' || sec < 0) return '';
    if (sec < 60) return `${Math.round(sec)}s`;
    const mins = Math.floor(sec / 60);
    const rem = Math.round(sec % 60);
    return `${mins}m ${String(rem).padStart(2, '0')}s`;
  }

  // Chunked upload fallback (best-effort). This assumes server supports chunked uploads
  // by accepting chunked POSTs and an optional assemble request. If server doesn't
  // support it, this will likely fail and return false.
  async function attemptChunkedUpload(file: File, relPath: string, fileObj: any) {
    const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);
      // send chunk
      const fd = new FormData();
      fd.append('chunk', chunk, file.name + `.part${i}`);
      fd.append('relativePath', relPath);
      fd.append('chunkIndex', String(i));
      fd.append('totalChunks', String(totalChunks));
      fd.append('originalSize', String(file.size));
      try {
        const resp = await fetch('/api/panels/upload?chunk=true', { method: 'POST', body: fd, credentials: 'same-origin' });
        if (!resp.ok) {
          console.warn('Chunk upload failed', resp.status);
          return false;
        }
        // update per-file progress based on chunks completed
        fileObj._uploadProgress = Math.round(((i + 1) / totalChunks) * 100);
        updateOverallProgress();
      } catch (e) {
        console.warn('Chunk upload error', e);
        return false;
      }
    }
    // attempt assemble
    try {
      const finish = await fetch('/api/panels/upload/finish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ relativePath: relPath, totalChunks }), credentials: 'same-origin' });
      if (!finish.ok) {
        console.warn('Chunk assemble failed', finish.status);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Chunk assemble error', e);
      return false;
    }
  }

  async function handleUpload() {
    if (!filesToUpload.length) return;
    uploading = true; uploadError = ''; uploadSuccess = '';
    overallProgress = 1; // make the overall bar visible immediately when uploads start
    // reset ETA tracking state at start of upload
    filesCompletedSinceLastCalc = 0;
    uploadStartTime = null;
    lastUpdateTime = null;
    lastBytesSeen = 0;
    emaBytesPerSec = 0;
    bpsSamples = [];
    overallETA = -1;
    
    // Don't strip topFolder - the adjusted paths from validateFiles are already correct
    let anyFailure = false;
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      let relPath = file.webkitRelativePath || file.name;
      
      // Validation: Ensure path has proper chapter-X/device/ structure
      if (!relPath.match(/^chapter-\d+\/(desktop|mobile)\//i) && !relPath.match(/^chapter-\d+\/[^/]+\.(jpg|jpeg|png|gif|webm)$/i)) {
        console.error(`[Upload] Invalid path structure: ${relPath}. Expected chapter-X/device/file format.`);
        file._status = 'invalid-path';
        anyFailure = true;
        uploadError = `Invalid file structure: ${file.name}. Files must be in chapter-X/device/ format.`;
        continue;
      }
      
      file._uploadProgress = 0;
      file._status = 'queued';
      updateOverallProgress();
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
        const orders = buildOrdersFromFiles(filesToUpload, '');
        // Only call save if we actually have something to write
        if (Object.keys(orders).length > 0) {
          // Merge newly uploaded ordering into existing order (do not replace)
          await saveFullOrder(orders, false);
          // Refresh panelsFiles and order map so the tree reflects saved order immediately
          await fetchPanelsFiles();
        }
      } catch (e) {
        console.warn('Failed to persist tentative order after upload', e);
      }
      uploadSuccess = 'Upload complete!';
      overallProgress = 100;
      setTimeout(() => { overallProgress = 0; updateOverallProgress(); }, 1500);
      selectedFiles = [];
      filesToUpload = [];
    }
  }

  // Persist order changes to server (writes static/panels/_order.json)
  async function savePanelsOrder(detail: { chapter: string; device: string; order: any[] }) {
    try {
      const slug = slugifyChapterKey(detail.chapter);
      
      console.log('🔄 [DRAG] savePanelsOrder START:', {
        chapter: detail.chapter,
        slug,
        device: detail.device,
        orderLength: detail.order.length,
        firstThreeItems: detail.order.slice(0, 3).map(item => 
          typeof item === 'string' ? item.substring(item.lastIndexOf('/') + 1) : item.title
        )
      });
      
      // **CRITICAL: Update local state FIRST (optimistic update)**
      // This prevents the UI from snapping back while the server request is in flight
      const updatedOrderMap = { ...panelsOrderMap };
      if (!updatedOrderMap[slug]) updatedOrderMap[slug] = {};
      updatedOrderMap[slug] = { ...updatedOrderMap[slug], [detail.device]: detail.order };
      panelsOrderMap = updatedOrderMap;
      
      console.log('✅ [DRAG] panelsOrderMap updated locally (optimistic)');
      
      // **CRITICAL: Also rebuild panelsFiles to match the new order**
      // This ensures ChapterTree receives the updated order immediately
      console.log('🔄 [DRAG] Rebuilding panelsFiles to match new order...');
      const newPanelsFiles: any[] = [];
      const lookup: Record<string, any> = {};
      const youtubeUsed = new Set<string>(); // Track which YouTube entries we've added
      
      // Build lookup from current panelsFiles (for regular files only)
      for (const f of panelsFiles) {
        if (f.type === 'youtube' && f.youtubeId) {
          // Don't add YouTube to lookup - we'll handle them separately
          continue;
        }
        const key = f.webkitRelativePath || f.name;
        lookup[key] = f;
      }
      
      // Rebuild panelsFiles from updated order map
      for (const [chapterSlug, chapterData] of Object.entries(updatedOrderMap)) {
        for (const device of ['desktop', 'mobile', 'other']) {
          const deviceArray = (chapterData as any)[device] || [];
          for (const entry of deviceArray) {
            if (typeof entry === 'string') {
              // Regular file path
              if (lookup[entry]) {
                newPanelsFiles.push(lookup[entry]);
                delete lookup[entry]; // Remove so we don't add it twice
              }
            } else if (entry.type === 'youtube') {
              // YouTube entry - find it in panelsFiles (only add once)
              if (!youtubeUsed.has(entry.id)) {
                const existingYt = panelsFiles.find(f => f.type === 'youtube' && f.youtubeId === entry.id);
                if (existingYt) {
                  newPanelsFiles.push(existingYt);
                  youtubeUsed.add(entry.id);
                }
              }
            } else if (entry.path) {
              // Object with path property
              if (lookup[entry.path]) {
                newPanelsFiles.push(lookup[entry.path]);
                delete lookup[entry.path];
              }
            }
          }
        }
      }
      
      // Add any remaining regular files not in order map (shouldn't happen, but be defensive)
      // Don't add YouTube entries here - they should already be in the order map
      for (const f of Object.values(lookup)) {
        if (f.type !== 'youtube') {
          newPanelsFiles.push(f);
        }
      }
      
      panelsFiles = newPanelsFiles;
      console.log('✅ [DRAG] panelsFiles rebuilt:', newPanelsFiles.length, 'files');
      
      // Check if we're moving a YouTube entry - if so, we need to remove it from all other locations
      const youtubeEntries = detail.order.filter(item => {
        // Handle object format (what we now send from ChapterTree)
        if (typeof item === 'object' && (item as any).type === 'youtube') return true;
        // Legacy: handle string format for backwards compatibility
        if (typeof item === 'string' && item.startsWith('youtube:')) return true;
        return false;
      });
      
      if (youtubeEntries.length > 0) {
        // Get current full order map and remove YouTube entries from all other locations
        const fullOrderPayload: any = {};
        
        // Slugify the target chapter for comparison
        const targetSlug = slug;
        
        // For each chapter in the order map, remove the YouTube entries from all device sections
        // except the target chapter+device
        for (const [chapterSlug, chapterData] of Object.entries(panelsOrderMap)) {
          const isTargetChapter = chapterSlug === targetSlug;
          fullOrderPayload[chapterSlug] = {};
          
          for (const device of ['desktop', 'mobile', 'other']) {
            const deviceArray = (chapterData as any)[device] || [];
            const isTargetDevice = isTargetChapter && device === detail.device;
            
            if (isTargetDevice) {
              // This is the target location - use the new order
              fullOrderPayload[chapterSlug][device] = detail.order;
            } else {
              // Not the target - filter out YouTube entries that match any in youtubeEntries
              fullOrderPayload[chapterSlug][device] = deviceArray.filter((entry: any) => {
                const entryId = typeof entry === 'string' && entry.startsWith('youtube:') 
                  ? entry.split(':')[1]
                  : (entry?.type === 'youtube' ? entry.id : null);
                
                if (!entryId) return true; // Not a YouTube entry, keep it
                
                // Check if this YouTube entry matches any in our moved entries
                return !youtubeEntries.some((movedEntry: any) => {
                  const movedId = typeof movedEntry === 'string' && movedEntry.startsWith('youtube:')
                    ? movedEntry.split(':')[1]
                    : (movedEntry?.type === 'youtube' ? movedEntry.id : null);
                  return movedId === entryId;
                });
              });
            }
          }
        }
        
        // Update local order map with cleaned version
        panelsOrderMap = { ...fullOrderPayload };
        
        console.log('📡 [DRAG] Sending YouTube cleanup to server...');
        
        // Save the full modified order map to remove duplicates
        const res = await fetch('/api/admin/panels/order', { 
          method: 'POST', 
          body: JSON.stringify({ orders: fullOrderPayload, replace: true }), 
          headers: { 'content-type': 'application/json' }, 
          credentials: 'same-origin' 
        });
        if (!res.ok) {
          console.warn('❌ [DRAG] Failed to save panels order with YouTube cleanup:', res.status);
        } else {
          console.log('✅ [DRAG] Server saved YouTube cleanup successfully');
          // Update _chapter and _device properties on YouTube entries in local state
          panelsFiles = panelsFiles.map(f => {
            if (f.type === 'youtube' && f.youtubeId) {
              const youtubeId = f.youtubeId;
              const inMovedEntries = youtubeEntries.some((movedEntry: any) => {
                const movedId = typeof movedEntry === 'string' && movedEntry.startsWith('youtube:')
                  ? movedEntry.split(':')[1]
                  : (movedEntry?.type === 'youtube' ? movedEntry.id : null);
                return movedId === youtubeId;
              });
              
              if (inMovedEntries) {
                // This YouTube entry was moved - update its chapter and device
                return { ...f, _chapter: detail.chapter, _device: detail.device };
              }
            }
            return f;
          });
        }
      } else {
        // No YouTube entries, use simple save - but send the full chapter to preserve order
        console.log('📡 [DRAG] Sending simple order to server...');
        // Send all three device arrays for this chapter to ensure exact order is preserved
        const chapterData = updatedOrderMap[slug] || {};
        const payload = { 
          orders: { 
            [slug]: {
              desktop: chapterData.desktop || [],
              mobile: chapterData.mobile || [],
              other: chapterData.other || []
            }
          },
          replace: true  // Tell server to use exact order, not merge/sort
        };
        const res = await fetch('/api/admin/panels/order', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });
        if (!res.ok) {
          console.warn('❌ [DRAG] Failed to save panels order:', res.status);
        } else {
          console.log('✅ [DRAG] Server saved simple order successfully');
        }
      }
      
      console.log('🏁 [DRAG] savePanelsOrder COMPLETE');
    } catch (err) {
      console.warn('❌ [DRAG] Error saving panels order', err);
    }
  }

  // Save a full orders mapping (from ChapterTree 'saveOrder')
  // Save a full orders mapping. `replace` controls whether to replace the entire file.
  // `cleanup` when true instructs the server to prune redundant per-panel published flags
  // that match the chapter — only use cleanup=true when the admin clicks "Save Order".
  async function saveFullOrder(orders: Record<string, any>, replace = false, cleanup = false) {
    console.log('[saveFullOrder] Called with:', { orders, replace, cleanup });
    try {
      const payload: any = { orders };
      if (replace) payload.replace = true;
      if (cleanup) payload.cleanup = true;
      console.log('[saveFullOrder] Sending payload:', JSON.stringify(payload, null, 2));
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

    // Merge new uploads into existing per-device arrays while preserving manual ordering.
    for (const slug of Object.keys(orders)) {
      const chapterOrders = orders[slug] || {};
      const existingChapter = (panelsOrderMap && panelsOrderMap[slug]) || {};
      for (const device of ['desktop', 'mobile', 'other']) {
        const newArr: string[] = (chapterOrders[device] || []).map((p: any) => String(p));
        const existingArr: any[] = existingChapter[device] || [];
        if (existingArr && existingArr.length > 0) {
          chapterOrders[device] = mergeInsertExisting(existingArr, newArr, naturalCompare);
        } else {
          // no existing ordering; use a natural-sorted new array
          chapterOrders[device] = newArr.slice().sort(naturalCompare);
        }
      }
      orders[slug] = chapterOrders;
    }
    return orders;
  }

  // Handlers for ChapterTree dispatched events
  async function handleTreeDelete(file: any) {
    // Remove from new uploads or existing panels depending on _isNew
    if (file._isNew) {
      filesToUpload = filesToUpload.filter(f => ((f as any).id || (f.webkitRelativePath || f.name)) !== (file.id || file.webkitRelativePath || file.name));
    } else {
      // Delete file from server (skip YouTube entries which aren't actual files)
      if (file.type !== 'youtube') {
        let relPath = (file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
        // Normalize path: remove "panels/" prefix if present
        relPath = relPath.replace(/^\/+/, '').replace(/^panels\//, '');
        
        // Normalize chapter and device folder names to lowercase for consistency
        const parts = relPath.split('/');
        if (parts.length >= 2) {
          parts[0] = parts[0].toLowerCase(); // chapter folder
          if (parts[1] === 'Desktop' || parts[1] === 'Mobile') {
            parts[1] = parts[1].toLowerCase(); // device folder
          }
        }
        relPath = parts.join('/');
        
        try {
          console.log('[handleTreeDelete] Deleting file from server:', relPath);
          const res = await fetch('/api/admin/panels/delete-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ paths: [relPath] })
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('[handleTreeDelete] Failed to delete file from server:', errorData);
          } else {
            const result = await res.json();
            console.log('[handleTreeDelete] Server deletion result:', result);
          }
        } catch (err) {
          console.error('[handleTreeDelete] Error deleting file from server:', err);
        }
      }
      
      // For YouTube entries, filter by youtubeId; for regular files, filter by path
      if (file.type === 'youtube' && file.youtubeId) {
        panelsFiles = panelsFiles.filter(f => !(f.type === 'youtube' && f.youtubeId === file.youtubeId));
      } else {
        panelsFiles = panelsFiles.filter(f => (f.webkitRelativePath || f.name) !== (file.webkitRelativePath || file.name));
      }
      
      // Also remove from _order.json
      // Determine which chapter and device this file belongs to
      const chapter = extractChapter(file.webkitRelativePath || file.name);
      const slug = slugifyChapterKey(chapter || 'uncategorized');
      let relPath = (file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
      // Normalize path: remove "panels/" prefix if present
      relPath = relPath.replace(/^\/+/, '').replace(/^panels\//, '');
      
      // Determine device type - use explicit _device if available (for YouTube entries)
      let device: 'desktop' | 'mobile' | 'other' = file._device || 'other';
      if (!file._device) {
        if (/\/desktop\//i.test(relPath)) device = 'desktop';
        else if (/\/mobile\//i.test(relPath)) device = 'mobile';
      }
      
      // Build updated orders by filtering out this file (only first occurrence if duplicates exist)
      const existingChapter = (panelsOrderMap && panelsOrderMap[slug]) || {};
      const updatedChapterOrders: any = { ...existingChapter };
      
      for (const dev of ['desktop', 'mobile', 'other']) {
        const arr = Array.isArray(existingChapter[dev]) ? existingChapter[dev] : [];
        if (dev === device) {
          // Remove only the first occurrence of this file
          let removed = false;
          updatedChapterOrders[dev] = arr.filter((entry: any) => {
            const entryPath = typeof entry === 'string' ? entry : (entry.path || '');
            const normalizedEntry = entryPath.replace(/^\/+/, '').replace(/^panels\//, '');
            // For YouTube entries, check if it's a youtube type with matching ID
            if (file.type === 'youtube' && file.youtubeId) {
              if (typeof entry === 'object' && entry.type === 'youtube' && entry.id === file.youtubeId) {
                if (!removed) {
                  removed = true;
                  return false; // Remove this entry
                }
              }
            }
            // For regular files, match by path
            if (normalizedEntry === relPath) {
              if (!removed) {
                removed = true;
                return false; // Remove this entry
              }
            }
            return true; // Keep this entry
          });
        } else {
          updatedChapterOrders[dev] = arr.slice();
        }
      }
      
      // Save updated orders
      try {
        await saveFullOrder({ [slug]: updatedChapterOrders }, false, false);
      } catch (err) {
        console.error('Failed to update _order.json after delete:', err);
      }
    }
  }

  async function handleTreeTogglePublish(file: any) {
    console.log('[handleTreeTogglePublish] File:', {
      name: file.name,
      webkitRelativePath: file.webkitRelativePath,
      type: file.type,
      youtubeId: file.youtubeId,
      id: file.id,
      published: file.published,
      _isNew: file._isNew
    });
    // Toggle panel-level published override. Rules:
    // - If file has explicit published === false and user clicks publish -> remove explicit published flag (delete override)
    // - Else if effectivePublished === true -> set explicit published = false
    // - Else (effective false and no explicit false) -> set explicit published = true
  // For YouTube entries and other files with explicit _chapter, use that; otherwise extract from path
  const chapter = file._chapter || extractChapter(file.webkitRelativePath || file.name);
  const slug = slugifyChapterKey(chapter || 'uncategorized');
  console.log('[handleTreeTogglePublish] Using chapter:', chapter, 'slug:', slug);
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
      // Default: NEW files are unpublished, EXISTING files are published
      // This prevents all existing content from being hidden when no explicit flag is set
      return !f._isNew;
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
      console.log('[handleTreeTogglePublish] Updating panelsFiles for existing file');
      panelsFiles = panelsFiles.map(f => {
        if ((f.webkitRelativePath || f.name) !== (file.webkitRelativePath || file.name)) return f;
        const clone = { ...f } as any;
        console.log('[handleTreeTogglePublish] Found matching file, updating published flag. Before:', { published: clone.published, eff });
        if ('published' in clone && clone.published === false) {
          delete clone.published;
          console.log('[handleTreeTogglePublish] Deleted explicit false flag');
        } else if (eff) {
          clone.published = false;
          console.log('[handleTreeTogglePublish] Set to false (was effectively published)');
        } else {
          clone.published = true;
          console.log('[handleTreeTogglePublish] Set to true (was effectively unpublished)');
        }
        console.log('[handleTreeTogglePublish] After update:', { published: clone.published });
        return clone;
      });
      console.log('[handleTreeTogglePublish] panelsFiles updated, count:', panelsFiles.length);
    }

    // Persist chapter-level mapping for this chapter (merge behavior)
    try {
      // For YouTube entries and other files with explicit _chapter, use that; otherwise extract from path
      const getFileChapter = (pf: any) => pf._chapter || extractChapter(pf.webkitRelativePath || pf.name);
      const chapterFiles = [
        ...panelsFiles.filter(pf => getFileChapter(pf) === chapter),
        ...filesToUpload.filter(pf => getFileChapter(pf) === chapter)
      ];
      console.log('[handleTreeTogglePublish] chapterFiles for', chapter, ':', chapterFiles.length, 'files');
      function mapEntryLocal(f: any) {
        // Handle YouTube entries specially
        if (f.type === 'youtube' && f.youtubeId) {
          const out: any = {
            type: 'youtube',
            id: f.youtubeId
          };
          if (f.title) out.title = f.title;
          // Include published if explicitly set (true/false), omit if undefined
          if ('published' in f && f.published !== undefined) {
            out.published = !!f.published;
          }
          if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
          return out;
        }
        
        const rel = (f.webkitRelativePath || f.name || '').toString().replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
        const outHasMeta = ('published' in f) || ('publishDate' in f);
        if (outHasMeta) {
          const out: any = { path: rel };
          // Include published if explicitly set (true/false), omit if undefined
          if ('published' in f && f.published !== undefined) {
            out.published = !!f.published;
          }
          if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
          return out;
        }
        return rel;
      }
      
      // Helper to determine device for a file (respects _device for YouTube entries)
      function getFileDevice(f: any): 'desktop' | 'mobile' | 'other' {
        if (f._device) return f._device;
        const path = f.webkitRelativePath || f.name;
        // Look for "desktop" or "mobile" as whole words anywhere in path (case-insensitive)
        // This handles nested folders like "Chapter-1/Desktop/SUBFOLDER/Spread01/..."
        if (/\bdesktop\b/i.test(path)) return 'desktop';
        if (/\bmobile\b/i.test(path)) return 'mobile';
        return 'other';
      }
      
      const ordersForChapter: any = {
        [slug]: {
          desktop: chapterFiles.filter((c:any) => getFileDevice(c) === 'desktop').map(mapEntryLocal),
          mobile: chapterFiles.filter((c:any) => getFileDevice(c) === 'mobile').map(mapEntryLocal),
          other: chapterFiles.filter((c:any) => getFileDevice(c) === 'other').map(mapEntryLocal)
        }
      };
      // Use replace=true to ensure metadata updates are persisted for this chapter
      console.log('[togglePublish] Saving panel publish state for chapter:', slug);
      await saveFullOrder(ordersForChapter, true);
      
      // Auto-run Ensure YouTube to position YouTube entries correctly
      console.log('[togglePublish] Running Ensure YouTube...');
      try {
        await ensureYouTubeEntries(true); // silent mode - no status messages
      } catch (err) {
        console.warn('[togglePublish] Ensure YouTube failed:', err);
      }
      
      // Don't refresh from server - we already have the correct state locally
      // and refreshing causes the UI to revert to the server's cached state
      console.log('[togglePublish] Complete');
    } catch (e) {
      console.warn('Failed to persist panel publish override', e);
    }
  }

  async function handleTreeDeleteChapter(chapter: string) {
    console.log('[handleTreeDeleteChapter] Deleting chapter:', chapter);
    
    // Collect files to delete from the server (only from panelsFiles - already uploaded)
    const filesToDelete = panelsFiles
      .filter(f => {
        const fileChapter = f._chapter || extractChapter(f.webkitRelativePath || f.name);
        return fileChapter === chapter;
      })
      .map(f => {
        // Extract path relative to static/panels/
        let relPath = f.webkitRelativePath || f.name || '';
        // Strip "panels/" prefix if present
        if (relPath.startsWith('panels/')) {
          relPath = relPath.slice('panels/'.length);
        }
        // Normalize chapter and device folder names to lowercase for consistency
        const parts = relPath.split('/');
        if (parts.length >= 2) {
          parts[0] = parts[0].toLowerCase(); // chapter folder
          if (parts[1] === 'Desktop' || parts[1] === 'Mobile') {
            parts[1] = parts[1].toLowerCase(); // device folder
          }
        }
        return parts.join('/');
      })
      .filter(path => path && !path.includes('youtube:') && !path.includes('_youtube')); // Skip YouTube entries (not files)
    
    // Delete files from server if there are any
    if (filesToDelete.length > 0) {
      try {
        console.log('[handleTreeDeleteChapter] Deleting files from server:', filesToDelete);
        const res = await fetch('/api/admin/panels/delete-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ paths: filesToDelete })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('[handleTreeDeleteChapter] Failed to delete files from server:', errorData);
        } else {
          const result = await res.json();
          console.log('[handleTreeDeleteChapter] Server deletion result:', result);
        }
      } catch (err) {
        console.error('[handleTreeDeleteChapter] Error deleting files from server:', err);
      }
    }
    
    // For files with explicit _chapter (like YouTube), use that; otherwise extract from path
    panelsFiles = panelsFiles.filter(f => {
      const fileChapter = f._chapter || extractChapter(f.webkitRelativePath || f.name);
      return fileChapter !== chapter;
    });
    filesToUpload = filesToUpload.filter(f => {
      const fileChapter = (f as any)._chapter || extractChapter((f as any).webkitRelativePath || f.name);
      return fileChapter !== chapter;
    });
    
    // Force ChapterTree to rebuild by updating key
    panelsFilesKey = panelsFiles.length > 0
      ? panelsFiles.map(f => f.webkitRelativePath || f.name || '').join('|')
      : 'empty';
    
    // Remove chapter from order map and persist deletion
    const slug = slugifyChapterKey(chapter);
    console.log('[handleTreeDeleteChapter] Removing chapter slug from order map:', slug);
    
    // Build new order map without this chapter
    const newOrderMap = { ...panelsOrderMap };
    delete newOrderMap[slug];
    panelsOrderMap = newOrderMap;
    
    // Save the updated order map to remove the chapter from _order.json
    try {
      // Send entire order map with replace=true to ensure chapter is removed
      await saveFullOrder(newOrderMap, true, false);
      console.log('[handleTreeDeleteChapter] Successfully removed chapter from _order.json');
    } catch (err) {
      console.error('[handleTreeDeleteChapter] Failed to update _order.json:', err);
    }
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
      console.log('[togglePublishChapter] Saving chapter publish state:', { chapter, slug, desired });
      const res = await fetch('/api/admin/panels/order', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) {
        console.warn('Failed to persist chapter publish flag:', res.status);
        // revert optimistic update
        panelsOrderMap = { ...panelsOrderMap, [slug]: { ...(panelsOrderMap[slug] || {}), published: current } };
        return;
      }
      
      // Auto-run Ensure YouTube to position YouTube entries correctly
      console.log('[togglePublishChapter] Running Ensure YouTube...');
      try {
        await ensureYouTubeEntries(true); // silent mode - no status messages
      } catch (err) {
        console.warn('[togglePublishChapter] Ensure YouTube failed:', err);
      }
      
      // Don't refresh from server - we already have the correct state locally
      // and refreshing causes the UI to revert to the server's cached state
      console.log('[togglePublishChapter] Complete');
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
    
    console.log('[handleInsertYouTube] Starting insertion:', { chapter, url, id });
    
    // Fetch video title from YouTube
    let videoTitle = `YouTube: ${id}`;
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          videoTitle = data.title;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch YouTube video title:', e);
      // Continue with default title
    }
    
    console.log('[handleInsertYouTube] Video title fetched:', videoTitle);
    
    const slug = slugifyChapterKey(chapter);
    
    console.log('[handleInsertYouTube] Chapter slug:', slug);
    console.log('[handleInsertYouTube] Current panelsOrderMap for this chapter:', panelsOrderMap && panelsOrderMap[slug]);
    
    // Save to _order.json with the fetched title
    const existingChapter = (panelsOrderMap && panelsOrderMap[slug]) || {};
    const updatedChapterOrders: any = { 
      ...existingChapter,
      other: [
        ...(Array.isArray(existingChapter.other) ? existingChapter.other : []),
        {
          type: 'youtube',
          id: id,
          title: videoTitle,
          published: false
        }
      ]
    };
    
    console.log('[handleInsertYouTube] Updated chapter orders:', updatedChapterOrders);
    console.log('[handleInsertYouTube] Updated "other" array:', updatedChapterOrders.other);
    
    try {
      console.log('[handleInsertYouTube] Calling saveFullOrder with:', { [slug]: updatedChapterOrders });
      await saveFullOrder({ [slug]: updatedChapterOrders }, false, false);
      console.log('[handleInsertYouTube] saveFullOrder completed successfully');
      
      // Refresh the panels files to show the new YouTube entry
      console.log('[handleInsertYouTube] Calling fetchPanelsFiles to refresh UI...');
      await fetchPanelsFiles();
      console.log('[handleInsertYouTube] fetchPanelsFiles completed');
      
      window.alert(`YouTube video "${videoTitle}" added successfully! You can drag it to reorder within Other Files.`);
    } catch (err) {
      console.error('Failed to save YouTube entry:', err);
      window.alert('Failed to add YouTube video. Please try again.');
    }
  }

  // Admin-triggered regenerate panels (calls server endpoint)
  let regenerating = false;
  let regenerateStatus = '';

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

  // Run ensure-youtube script and refresh tree
  let ensuringYouTube = false;
  async function ensureYouTubeEntries(silent = false) {
    ensuringYouTube = true;
    if (!silent) regenerateStatus = '';
    try {
      const res = await fetch('/api/admin/panels/ensure-youtube', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) {
        if (!silent) regenerateStatus = `Ensure YouTube failed: ${res.status}`;
      } else {
        const data = await res.json().catch(() => ({}));
        if (!silent) regenerateStatus = data && data.success ? 'YouTube entries ensured successfully.' : (data && data.error) || 'YouTube entries processed.';
        // Only refresh if not in silent mode (to avoid race conditions with publish toggles)
        if (!silent) {
          await fetchPanelsFiles();
        }
      }
    } catch (err: any) {
      if (!silent) regenerateStatus = `Ensure YouTube error: ${err?.message || String(err)}`;
    } finally {
      ensuringYouTube = false;
    }
  }
  
  // Handle conflict resolution from modal
  async function handleConflictResolution(event: CustomEvent) {
    const { resolutions } = event.detail;
    conflictResolutions = resolutions;
    showConflictModal = false;
    
    if (conflictUploadMode === 'flattened') {
      // Handle flattened upload mode - prepare files with resolutions applied
      uploading = true; uploadError = ''; uploadSuccess = '';
      overallProgress = 1;
      filesCompletedSinceLastCalc = 0;
      uploadStartTime = null;
      lastUpdateTime = null;
      lastBytesSeen = 0;
      emaBytesPerSec = 0;
      bpsSamples = [];
      overallETA = -1;
      
      const filesToProcess: any[] = [];
      
      for (const conflict of pendingConflicts) {
        const resolution = resolutions[conflict.existingPath];
        
        if (resolution === 'replace') {
          // Upload with original name (will replace)
          filesToProcess.push({
            name: conflict.file.name,
            size: conflict.file.size,
            type: conflict.file.type,
            _file: conflict.file,
            _uploadProgress: 0,
            _status: 'queued',
            targetPath: `chapter-1/mobile/${conflict.file.name}`,
            id: `flattened-${conflict.file.name}-${Date.now()}`
          });
        } else if (resolution === 'keep-both') {
          // Upload with versioned name
          const ext = conflict.file.name.split('.').pop();
          const baseName = conflict.file.name.slice(0, conflict.file.name.length - (ext ? ext.length + 1 : 0));
          const versionedName = `${baseName}-v2.${ext}`;
          
          filesToProcess.push({
            name: versionedName,
            size: conflict.file.size,
            type: conflict.file.type,
            _file: conflict.file,
            _uploadProgress: 0,
            _status: 'queued',
            targetPath: `chapter-1/mobile/${versionedName}`,
            id: `flattened-${versionedName}-${Date.now()}`
          });
        }
        // 'keep-existing' means skip this file
      }
      
      // Process uploads
      let anyFailure = false;
      for (let i = 0; i < filesToProcess.length; i++) {
        const fileObj = filesToProcess[i];
        fileObj._uploadProgress = 0;
        fileObj._status = 'queued';
        const ok = await uploadWithRetries(fileObj, fileObj.targetPath, 3);
        if (!ok) {
          anyFailure = true;
          uploadError = uploadError ? uploadError : `Some files failed to upload.`;
        }
      }
      
      uploading = false;
      if (!anyFailure) {
        // Update _order.json with the newly uploaded files
        try {
          const mockFiles = filesToProcess.map(f => ({
            name: f.name,
            size: f.size,
            webkitRelativePath: f.targetPath
          }));
          
          const orders = buildOrdersFromFiles(mockFiles, '');
          if (Object.keys(orders).length > 0) {
            await saveFullOrder(orders, false);
          }
        } catch (e) {
          console.warn('Failed to update _order.json after flattened upload', e);
        }
        
        uploadSuccess = 'Upload complete! Files added to chapter-1/mobile.';
        overallProgress = 100;
        setTimeout(() => { overallProgress = 0; updateOverallProgress(); }, 1500);
        selectedFiles = [];
        filesToUpload = [];
        await fetchPanelsFiles();
      }
      return;
    }
    
    // Regular upload mode - process resolutions and update filesToUpload
    const topFolder = selectedFiles.length > 0 ? (selectedFiles[0].webkitRelativePath || selectedFiles[0].name).split(/\\|\//)[0] : '';
    
    for (const conflict of pendingConflicts) {
      const resolution = resolutions[conflict.existingPath];
      
      if (resolution === 'replace') {
        // Add to filesToUpload - will overwrite existing
        let relPath = conflict.file.webkitRelativePath || conflict.file.name;
        if (topFolder && relPath.startsWith(topFolder + '/')) relPath = relPath.slice(topFolder.length + 1);
        if (topFolder && relPath.startsWith(topFolder + "\\")) relPath = relPath.slice(topFolder.length + 1);
        
        const fileObj: any = {
          name: conflict.file.name,
          webkitRelativePath: relPath.replace(/\\/g, '/'),
          size: conflict.file.size,
          type: conflict.file.type,
          id: `${relPath}-${Date.now()}`,
          _isNew: true,
          _file: conflict.file,
          _uploadProgress: 0,
          _status: 'queued',
          _replaceExisting: true // Flag to indicate this should replace
        };
        filesToUpload.push(fileObj);
      } else if (resolution === 'keep-both') {
        // Add with versioned name
        let relPath = conflict.file.webkitRelativePath || conflict.file.name;
        if (topFolder && relPath.startsWith(topFolder + '/')) relPath = relPath.slice(topFolder.length + 1);
        if (topFolder && relPath.startsWith(topFolder + "\\")) relPath = relPath.slice(topFolder.length + 1);
        
        // Generate versioned filename
        const ext = conflict.file.name.split('.').pop();
        const baseName = conflict.file.name.slice(0, conflict.file.name.length - (ext ? ext.length + 1 : 0));
        const versionedName = `${baseName}-v2.${ext}`;
        const versionedPath = relPath.replace(conflict.file.name, versionedName);
        
        const fileObj: any = {
          name: versionedName,
          webkitRelativePath: versionedPath.replace(/\\/g, '/'),
          size: conflict.file.size,
          type: conflict.file.type,
          id: `${versionedPath}-${Date.now()}`,
          _isNew: true,
          _file: conflict.file,
          _uploadProgress: 0,
          _status: 'queued',
          _versionedUpload: true // Flag to indicate versioned upload
        };
        filesToUpload.push(fileObj);
      }
      // 'keep-existing' means do nothing - file is already filtered out
    }
    
    // Sort and update
    filesToUpload.sort((A, B) => {
      const aPath = (A.webkitRelativePath || A.name || '').replace(/\\/g, '/');
      const bPath = (B.webkitRelativePath || B.name || '').replace(/\\/g, '/');
      return naturalCompare(aPath, bPath);
    });
    
    // Recalculate total size
    const { totalValidSize } = preprocessFiles(filesToUpload);
    totalSize = totalValidSize;
    
    uploadSuccess = `Resolved ${pendingConflicts.length} conflict${pendingConflicts.length === 1 ? '' : 's'}. Ready to upload.`;
  }
  
  function handleConflictCancel() {
    showConflictModal = false;
    pendingConflicts = [];
    conflictResolutions = {};
    selectedFiles = [];
    filesToUpload = [];
    uploadError = 'Upload cancelled due to file conflicts.';
  }

  // Simplified upload: flatten all files into chapter-1/mobile
  async function handleFlattenedUpload() {
    if (!selectedFiles.length) return;
    
    // Check for conflicts first
    try {
      loadingExisting = true;
      const res = await fetch('/api/panels/list', { credentials: 'same-origin' });
      if (!res.ok) {
        uploadError = `Failed to fetch existing files: ${res.status}`;
        loadingExisting = false;
        return;
      }
      const existingFilesList = await res.json();
      loadingExisting = false;
      
      // Normalize existing files to forward slashes
      const normalizedExisting = existingFilesList.map((f: string) => f.replace(/\\/g, '/'));
      
      // Check for conflicts in chapter-1/mobile
      const flattenedConflicts = [];
      for (const file of selectedFiles) {
        const targetPath = `chapter-1/mobile/${file.name}`;
        
        if (normalizedExisting.includes(targetPath)) {
          // Found a conflict - get existing file size
          const existingFile = panelsFiles.find(pf => {
            const pfPath = (pf.webkitRelativePath || pf.name || '').replace(/\\/g, '/');
            return pfPath === targetPath || pfPath.endsWith(targetPath);
          });
          
          flattenedConflicts.push({
            file,
            existingPath: targetPath,
            size: file.size,
            existingSize: existingFile?.size
          });
        }
      }
      
      // If conflicts found, show modal
      if (flattenedConflicts.length > 0) {
        pendingConflicts = flattenedConflicts;
        conflictResolutions = {};
        conflictUploadMode = 'flattened';
        showConflictModal = true;
        return; // Wait for user resolution
      }
    } catch (e) {
      console.error('Failed to check conflicts:', e);
      uploadError = 'Failed to check for conflicts.';
      return;
    }
    
    // No conflicts, proceed with upload
    uploading = true; uploadError = ''; uploadSuccess = '';
    overallProgress = 1;
    filesCompletedSinceLastCalc = 0;
    uploadStartTime = null;
    lastUpdateTime = null;
    lastBytesSeen = 0;
    emaBytesPerSec = 0;
    bpsSamples = [];
    overallETA = -1;

    // Create file objects from selectedFiles for upload tracking
    const filesToProcess = selectedFiles.map((file, idx) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      _file: file,
      _uploadProgress: 0,
      _status: 'queued',
      id: `flattened-${idx}`
    }));

    let anyFailure = false;
    for (let i = 0; i < filesToProcess.length; i++) {
      const fileObj = filesToProcess[i];
      // Force all files into chapter-1/mobile, preserving only the filename
      const fileName = fileObj.name;
      const targetPath = `chapter-1/mobile/${fileName}`;
      
      fileObj._uploadProgress = 0;
      fileObj._status = 'queued';
      const ok = await uploadWithRetries(fileObj, targetPath, 3);
      if (!ok) {
        anyFailure = true;
        uploadError = uploadError ? uploadError : `Some files failed to upload.`;
      }
    }
    uploading = false;
    if (!anyFailure) {
      // Update _order.json with the newly uploaded files
      try {
        // Build a fake file list for chapter-1/mobile with proper structure
        const mockFiles = selectedFiles.map(f => ({
          name: f.name,
          size: f.size,
          webkitRelativePath: `chapter-1/mobile/${f.name}`
        }));
        
        const orders = buildOrdersFromFiles(mockFiles, '');
        if (Object.keys(orders).length > 0) {
          await saveFullOrder(orders, false);
        }
      } catch (e) {
        console.warn('Failed to update _order.json after flattened upload', e);
      }
      
      uploadSuccess = 'Upload complete! Files added to chapter-1/mobile.';
      overallProgress = 100;
      setTimeout(() => { overallProgress = 0; updateOverallProgress(); }, 1500);
      selectedFiles = [];
      filesToUpload = [];
      // Refresh the tree
      await fetchPanelsFiles();
    }
  }
</script>

<section class="prose upload-section">
  <h1>Upload New Panels</h1>
  
  <!-- Helpful Instructions -->
  <div class="help-card bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
    <div class="flex items-start gap-3">
      <svg class="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>
      <div class="text-sm text-blue-100">
        <div class="font-medium mb-1">How to organize files for upload:</div>
        <div class="text-blue-200/90"><strong>Best:</strong> Select your <code class="bg-blue-950/50 px-1 rounded">chapter-X</code> folder (contains both desktop & mobile subfolders)</div>
        <div class="text-blue-200/90 mt-1"><strong>Also works:</strong> Select <code class="bg-blue-950/50 px-1 rounded">desktop</code> or <code class="bg-blue-950/50 px-1 rounded">mobile</code> folder directly</div>
        <div class="text-blue-200/70 text-xs mt-2">Files will automatically be organized into the correct structure. If metadata isn't clear, you'll be prompted to clarify. You can still drag-and-drop files to reorganize after upload.</div>
      </div>
    </div>
  </div>
  
  <!-- File Selection Button -->
  <div class="file-selection-section">
    <label for="panel-folder-input" class="file-select-button">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
      </svg>
      Choose Chapter Folder
    </label>
    <input 
      id="panel-folder-input" 
      bind:this={panelInput} 
      type="file" 
      webkitdirectory 
      multiple 
      on:change={handleFileSelect} 
      class="file-input-hidden"
      accept=".jpg,.jpeg,.png,.gif,.webp,.webm,.mp4,.mov"
    />
    {#if selectedFiles.length > 0}
      <div class="files-selected-indicator">
        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
      </div>
    {/if}
  </div>
  
  <!-- File Selection -->
  <form class="upload-form" on:submit|preventDefault={handleUpload}>

    <!-- Overall progress bar -->
    {#if overallProgress > 0}
      <div class="overall-progress mt-3">
        <div class="overall-label text-sm text-slate-400">Overall upload progress</div>
        <div class="overall-bar" aria-hidden="true">
          <div class="overall-fill" style="width:{overallProgress}%"></div>
        </div>
        <div class="flex items-center gap-3 mt-1">
          <div class="overall-pct text-xs text-slate-400">{overallProgress}%</div>
          {#if overallETA >= 0}
            <div class="eta text-xs text-slate-400">ETA: {formatETA(overallETA)}</div>
          {/if}
        </div>
      </div>
    {/if}
    <div class="actions">
      <button class="btn btn-primary text-lg px-6 py-3 font-semibold" type="submit" disabled={uploading || !filesToUpload.length || conflicts.errors.length > 0}>
        {#if uploading}
          <svg class="w-5 h-5 mr-2 animate-spin inline-block" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Uploading...
        {:else}
          <svg class="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload All Files to Server
        {/if}
      </button>
      <button type="button" class="btn btn-secondary" style="margin-left:0.5rem" on:click={regeneratePanels} disabled={regenerating || ensuringYouTube}>
        {regenerating ? 'Processing...' : 'Regenerate panels'}
      </button>
    </div>
    {#if filesToUpload.length > 0 && !uploading}
      <div class="text-sm text-yellow-200 bg-yellow-900/30 border border-yellow-500/50 rounded p-3 mt-3">
        <strong>⚠ Note:</strong> Files appear in the tree below <em>after</em> you click "Upload All Files to Server". The "Save order" button in the tree only saves file ordering, it does not upload files.
      </div>
    {/if}
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
      on:insertYouTube={e => handleInsertYouTube(e.detail.chapter)}
      on:setPublishDate={e => handleTreeSetPublishDate(e.detail)}
    />
  {:else}
    <div class="text-slate-400 text-sm">Loading comic file tree...</div>
  {/if}

  {#if selectedFiles.length > 0}
    <!-- Validation Summary Card - Shows immediately after file selection -->
    {#if conflicts.errors.length > 0 || conflicts.warnings.length > 0 || conflicts.duplicates.length > 0}
      <div class="validation-summary bg-slate-800 border-2 border-yellow-500 rounded-lg p-4 mt-4 mb-4">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <h3 class="text-lg font-semibold text-yellow-400">File Analysis Results</h3>
        </div>
        
        {#if conflicts.errors.length > 0}
          <div class="mb-3 p-3 bg-red-900/30 border border-red-600 rounded">
            <div class="font-medium text-red-300 mb-2">⛔ {conflicts.errors.length} Error{conflicts.errors.length === 1 ? '' : 's'} Found</div>
            <div class="text-sm text-red-200">These must be fixed before upload:</div>
            <ul class="mt-2 text-sm text-red-100 space-y-1 list-disc list-inside">
              {#each conflicts.errors.slice(0, 5) as error}
                <li>{error}</li>
              {/each}
              {#if conflicts.errors.length > 5}
                <li class="text-red-300">...and {conflicts.errors.length - 5} more error{conflicts.errors.length - 5 === 1 ? '' : 's'}</li>
              {/if}
            </ul>
          </div>
        {/if}
        
        {#if conflicts.duplicates.length > 0}
          <div class="mb-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
            <div class="font-medium text-yellow-300 mb-1">⚠️ {conflicts.duplicates.length} Duplicate{conflicts.duplicates.length === 1 ? '' : 's'} Detected</div>
            <div class="text-sm text-yellow-200">Files that already exist - you'll be asked how to handle these.</div>
          </div>
        {/if}
        
        {#if conflicts.warnings.length > 0}
          <div class="p-3 bg-blue-900/30 border border-blue-600 rounded">
            <div class="font-medium text-blue-300 mb-1">ℹ️ {conflicts.warnings.length} Warning{conflicts.warnings.length === 1 ? '' : 's'}</div>
            <div class="text-sm text-blue-200">These won't prevent upload but should be reviewed:</div>
            <ul class="mt-2 text-sm text-blue-100 space-y-1 list-disc list-inside">
              {#each conflicts.warnings.slice(0, 3) as warning}
                <li>{warning}</li>
              {/each}
              {#if conflicts.warnings.length > 3}
                <li class="text-blue-300">...and {conflicts.warnings.length - 3} more warning{conflicts.warnings.length - 3 === 1 ? '' : 's'}</li>
              {/if}
            </ul>
          </div>
        {/if}
        
        {#if conflicts.errors.length === 0}
          <div class="mt-3 p-2 bg-green-900/30 border border-green-600 rounded text-center">
            <span class="text-green-300 font-medium">✓ Ready to upload {filesToUpload.length} file{filesToUpload.length === 1 ? '' : 's'}</span>
          </div>
        {/if}
      </div>
    {/if}
    
    <UploadSummary 
      files={selectedFiles} 
      {conflicts} 
      {inferredChapters} 
      {totalSize} 
      estimatedTime={overallETA}
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
        <div class="flex items-center gap-3">
          {#if selectedFilesForRemoval.size > 0}
            <button 
              type="button"
              class="btn btn-xs btn-error"
              on:click={() => {
                filesToUpload = filesToUpload.filter((_, idx) => !selectedFilesForRemoval.has(idx));
                selectedFilesForRemoval = new Set();
                // Reset file input so same folder can be re-selected
                if (panelInput) panelInput.value = '';
              }}
            >
              Remove {selectedFilesForRemoval.size} selected
            </button>
          {/if}
          <span class="text-sm text-slate-400">{filesToUpload.length} files</span>
        </div>
      </div>
      
      <!-- Upload Progress Counter (shows during upload) -->
      {#if uploading}
        {@const completedCount = filesToUpload.filter(f => f._status === 'done').length}
        {@const currentlyUploading = filesToUpload.find(f => f._status === 'uploading' || f._status?.includes('retrying'))}
        <div class="upload-progress-header bg-slate-900 border border-blue-500 rounded p-3 mb-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="spinner" aria-hidden="true"></span>
              <div>
                <div class="text-blue-300 font-medium">
                  Uploading file {completedCount + 1} of {filesToUpload.length}
                </div>
                {#if currentlyUploading}
                  <div class="text-xs text-slate-400 mt-1">
                    Current: {currentlyUploading.name}
                  </div>
                {/if}
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-blue-300">{overallProgress}%</div>
              <div class="text-xs text-slate-400">Complete</div>
            </div>
          </div>
        </div>
      {/if}
      
      {#if filesToUpload.length <= 6 || showAllFiles}
        <ul class="tight-list">
          {#each filesToUpload as file, idx}
            <li class="file-line {file._status === 'done' ? 'file-done' : ''} {file._status && file._status.startsWith('failed') ? 'file-failed' : ''}">
              <div class="flex items-center gap-2" style="flex: 1; min-width: 0;">
                <input 
                  type="checkbox" 
                  checked={selectedFilesForRemoval.has(idx)}
                  on:change={(e) => {
                    if (e.currentTarget.checked) {
                      selectedFilesForRemoval.add(idx);
                    } else {
                      selectedFilesForRemoval.delete(idx);
                    }
                    selectedFilesForRemoval = selectedFilesForRemoval;
                  }}
                  class="checkbox checkbox-sm flex-shrink-0"
                  disabled={uploading}
                />
                <span class="truncate" style="color: #cbd5e1;">{file.webkitRelativePath || file.name}</span>
              </div>
              <div class="file-right">
                            {#if ['uploading','retrying','chunking','attempting chunked upload','chunk-failed'].includes(String(file._status))}
                              <span class="spinner" aria-hidden="true"></span>
                            {/if}
                <span class="file-size">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <ul class="space-y-1">
          {#each filesToUpload.slice(0,3) as file, rawIdx}
            {@const idx = rawIdx}
            <li class="file-line {file._status === 'done' ? 'file-done' : ''} {file._status && file._status.startsWith('failed') ? 'file-failed' : ''}">
              <div class="flex items-center gap-2" style="flex: 1; min-width: 0;">
                <input 
                  type="checkbox" 
                  checked={selectedFilesForRemoval.has(idx)}
                  on:change={(e) => {
                    if (e.currentTarget.checked) {
                      selectedFilesForRemoval.add(idx);
                    } else {
                      selectedFilesForRemoval.delete(idx);
                    }
                    selectedFilesForRemoval = selectedFilesForRemoval;
                  }}
                  class="checkbox checkbox-sm flex-shrink-0"
                  disabled={uploading}
                />
                <span class="truncate" style="color: #cbd5e1;">{file.webkitRelativePath || file.name}</span>
              </div>
              <div class="file-right">
                {#if file._status !== 'done' && !file._status?.startsWith('failed')}
                  <span class="spinner" aria-hidden="true"></span>
                {/if}
                <span class="file-size">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            </li>
          {/each}
          <li class="text-slate-500 text-sm text-center py-1">
            ... {filesToUpload.length - 6} more files ...
          </li>
          {#each filesToUpload.slice(-3) as file, rawIdx}
            {@const idx = filesToUpload.length - 3 + rawIdx}
            <li class="file-line {file._status === 'done' ? 'file-done' : ''} {file._status && file._status.startsWith('failed') ? 'file-failed' : ''}">
              <div class="flex items-center gap-2" style="flex: 1; min-width: 0;">
                <input 
                  type="checkbox" 
                  checked={selectedFilesForRemoval.has(idx)}
                  on:change={(e) => {
                    if (e.currentTarget.checked) {
                      selectedFilesForRemoval.add(idx);
                    } else {
                      selectedFilesForRemoval.delete(idx);
                    }
                    selectedFilesForRemoval = selectedFilesForRemoval;
                  }}
                  class="checkbox checkbox-sm flex-shrink-0"
                  disabled={uploading}
                />
                <span class="truncate" style="color: #cbd5e1;">{file.webkitRelativePath || file.name}</span>
              </div>
              <div class="file-right">
                {#if file._status !== 'done' && !file._status?.startsWith('failed')}
                  <span class="spinner" aria-hidden="true"></span>
                {/if}
                <span class="file-size">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
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

<!-- Conflict Resolution Modal -->
<ConflictResolutionModal 
  bind:visible={showConflictModal}
  conflicts={pendingConflicts}
  on:resolve={handleConflictResolution}
  on:cancel={handleConflictCancel}
/>

<!-- Missing Metadata Modal -->
{#if showMissingMetadataModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div class="modal-overlay" on:click={handleMetadataCancel} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="modal-content missing-metadata-modal" on:click|stopPropagation role="document">
      <div class="modal-header">
        <h2>Specify Chapter and Device</h2>
        <p class="subtitle">We couldn't automatically detect all the information needed</p>
      </div>
      
      <div class="modal-body">
        <div class="detection-status bg-slate-900 border border-slate-700 rounded p-4 mb-4">
          <div class="text-sm text-slate-300 mb-3">
            <strong>What we found:</strong>
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <div class="text-xs text-slate-400 mb-1">Chapter:</div>
              {#if missingChapter}
                <span class="text-yellow-400">❌ Not detected</span>
              {:else}
                <span class="text-green-400">✓ Chapter {detectedChapter}</span>
              {/if}
            </div>
            <div class="flex-1">
              <div class="text-xs text-slate-400 mb-1">Device:</div>
              {#if missingDevice}
                <span class="text-yellow-400">❌ Not detected</span>
              {:else}
                <span class="text-green-400">✓ {detectedDevice}</span>
              {/if}
            </div>
          </div>
        </div>
        
        <div class="info-message bg-blue-900/30 border border-blue-600 rounded p-3 mb-4 text-sm text-blue-200">
          ℹ️ Please specify the missing information below. All {selectedFiles.length} files will be organized accordingly.
        </div>
        
        <div class="form-fields">
          {#if missingChapter}
            <div class="form-field">
              <label for="chapter-select" class="block text-sm font-medium text-slate-300 mb-2">
                Which chapter are these files for?
              </label>
              <select 
                id="chapter-select"
                bind:value={userSelectedChapter}
                class="select-input"
              >
                <option value="1">Chapter 1</option>
                <option value="2">Chapter 2</option>
                <option value="3">Chapter 3</option>
                <option value="4">Chapter 4</option>
                <option value="5">Chapter 5</option>
                <option value="6">Chapter 6</option>
                <option value="7">Chapter 7</option>
                <option value="8">Chapter 8</option>
                <option value="9">Chapter 9</option>
                <option value="10">Chapter 10</option>
              </select>
            </div>
          {/if}
          
          {#if missingDevice}
            <div class="form-field">
              <label for="device-select" class="block text-sm font-medium text-slate-300 mb-2">
                Which device type are these files for?
              </label>
              <select 
                id="device-select"
                bind:value={userSelectedDevice}
                class="select-input"
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          {/if}
        </div>
        
        <div class="preview-info bg-slate-900 border border-slate-700 rounded p-3 mt-4">
          <div class="text-xs text-slate-400 mb-2">Files will be uploaded to:</div>
          <div class="text-sm text-slate-200 font-mono">
            chapter-{missingChapter ? userSelectedChapter : detectedChapter}/{missingDevice ? userSelectedDevice : detectedDevice}/
          </div>
          <div class="text-xs text-slate-400 mt-2">
            Example: chapter-{missingChapter ? userSelectedChapter : detectedChapter}/{missingDevice ? userSelectedDevice : detectedDevice}/{selectedFiles[0]?.name || 'panel-001.jpg'}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleMetadataCancel}>
          Cancel Upload
        </button>
        <button class="btn btn-primary" on:click={handleMetadataConfirm}>
          Continue with Chapter {missingChapter ? userSelectedChapter : detectedChapter} / {missingDevice ? userSelectedDevice : detectedDevice}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
.upload-section { 
  max-width: 800px; 
  margin: auto;
  padding: 1rem;
}

/* Hide the native file input */
.file-input-hidden {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

/* File selection section */
.file-selection-section {
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

/* Styled file selection button */
.file-select-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

.file-select-button:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.file-select-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.3);
}

/* Files selected indicator */
.files-selected-indicator {
  color: #3b82f6;
  font-size: 0.95rem;
  font-weight: 500;
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

/* Overall progress */
.overall-progress .overall-bar {
  background: #0b1220;
  border-radius: 8px;
  height: 12px;
  overflow: hidden;
  margin-top: 6px;
}
.overall-progress .overall-fill {
  height: 100%;
  background: linear-gradient(90deg,#10b981,#06b6d4);
  transition: width 160ms linear;
}

/* Tight file list */
.tight-list { list-style: none; margin: 0; padding: 0; }
.file-line { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 0.92rem; }
.file-left { flex: 1 1 auto; margin-right: 0.5rem; color: #cbd5e1; }
.file-right { flex: 0 0 auto; display: flex; align-items: center; gap: 0.6rem; }
.file-size { color: #94a3b8; font-size: 0.85rem; white-space: nowrap; }
.spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.08); border-top-color: #10b981; animation: spin 900ms linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.file-done .file-left { color: #86efac; }
.file-failed .file-left { color: #ffc7c7; }

/* Smaller icons in validation block */
.validation-errors svg {
  width: 20px !important;
  height: 20px !important;
  max-width: 20px !important;
  max-height: 20px !important;
  vertical-align: middle;
  margin-right: 0.5rem;
  display: inline-block;
}
.validation-errors svg * { max-width: 20px !important; max-height: 20px !important; }

/* Force small inline SVGs within the upload UI (constrain any unexpectedly large icons) */
.upload-section svg, .upload-summary svg {
  width: 18px !important;
  height: 18px !important;
  max-width: 18px !important;
  max-height: 18px !important;
}

/* Exception: allow larger icons in help card and validation summary */
.help-card svg,
.validation-summary svg {
  width: 20px !important;
  height: 20px !important;
  max-width: 20px !important;
  max-height: 20px !important;
}

/* Validation summary specific styles */
.validation-summary code {
  background: rgba(59, 130, 246, 0.15);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: #93c5fd;
}

/* Upload progress header during upload */
.upload-progress-header .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
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
.btn-secondary:disabled {
  background-color: #4b5563;
  color: #9ca3af;
}
.btn-accent {
  background-color: #059669;
  color: white;
}
.btn-accent:hover {
  background-color: #047857;
}
.btn-accent:disabled {
  background-color: #4b5563;
  color: #9ca3af;
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

/* Modal shared styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: #1e293b;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #334155;
}

.missing-metadata-modal {
  max-width: 600px;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #334155;
}

.modal-header h2 {
  margin: 0;
  color: #f1f5f9;
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 0.5rem 0 0 0;
  color: #94a3b8;
  font-size: 0.875rem;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #334155;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.form-field {
  margin-bottom: 1rem;
}

.select-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 0.375rem;
  color: #f1f5f9;
  font-size: 0.875rem;
}

.select-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
</style>

