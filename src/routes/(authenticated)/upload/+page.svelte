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
    const res = await fetch('/api/panels/list', { credentials: 'same-origin' });
    if (!res.ok) return;
    const fileList: string[] = await res.json();
    // Always assign a new array to trigger Svelte reactivity
    panelsFiles = fileList.map(path => ({
      name: path.split('/').pop() || path,
      webkitRelativePath: path,
      size: 0,
      type: '',
    }));
    panelsFiles = [...panelsFiles]; // Force Svelte reactivity
    panelsFilesKey = panelsFiles.length > 0
      ? panelsFiles.map(f => f.webkitRelativePath || f.name || '').join('|')
      : 'empty';
    // Analyze for tree display
  panelsTreeConflicts = { duplicates: [], missing: [], errors: [], warnings: [], mismatched: [] };
    panelsInferredChapters = [...new Set(
      panelsFiles.map(file => extractChapter(file.webkitRelativePath || file.name)).filter((chapter): chapter is string => chapter !== null)
    )].sort();
    // Attempt to fetch _order.json so we can display chapter-level metadata (publishDate/publishTZ/published)
    try {
      const orderRes = await fetch('/panels/_order.json', { credentials: 'same-origin' });
      if (orderRes.ok) {
        panelsOrderMap = await orderRes.json();
      } else {
        panelsOrderMap = {};
      }
    } catch (e) {
      panelsOrderMap = {};
    }
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
          _file: file
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

  async function handleUpload() {
    if (!filesToUpload.length) return;
    uploading = true; uploadError = ''; uploadSuccess = '';
    const formData = new FormData();
    // Determine the selected folder name (top-level)
    let topFolder = '';
    if (filesToUpload.length > 0) {
      const firstPath = filesToUpload[0].webkitRelativePath || filesToUpload[0].name;
      const parts = firstPath.split(/\\|\//);
      if (parts.length > 1) topFolder = parts[0];
    }
    for (const file of filesToUpload) {
      let relPath = file.webkitRelativePath || file.name;
      // Remove the top-level folder from the relative path
      if (topFolder && relPath.startsWith(topFolder + '/')) relPath = relPath.slice(topFolder.length + 1);
      if (topFolder && relPath.startsWith(topFolder + "\\")) relPath = relPath.slice(topFolder.length + 1);
      // Use the original File/Blob if available (mapped objects store it in _file).
      const blobOrFile = (file as any)._file || file;
      formData.append('files', blobOrFile, relPath);
      formData.append('relativePaths', relPath);
    }
    const res = await fetch('/api/panels/upload', { method: 'POST', body: formData, credentials: 'same-origin'});
    uploading = false;
    if (!res.ok) { uploadError = `Upload failed: ${res.status}`; return; }
    const result = await res.json();
    if (result.success) { uploadSuccess = 'Upload complete!'; selectedFiles = []; filesToUpload = []; } else { uploadError = result.error || 'Upload failed.' }
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
  async function saveFullOrder(orders: Record<string, any>) {
    try {
      const payload = { orders };
      const res = await fetch('/api/admin/panels/order', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) {
        console.warn('Failed to save full panels order:', res.status);
      }
    } catch (err) {
      console.warn('Error saving full panels order', err);
    }
  }

  // Handler wrapper that serializes save-order operations and exposes a saving flag
  async function handleSaveOrderAndWait(orders: Record<string, any>) {
    savingOrder = true;
    try {
      await saveFullOrder(orders);
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

  function handleTreeTogglePublish(file: any) {
    if (file._isNew) {
      filesToUpload = filesToUpload.map(f => ({ ...(f as any), ...(f.id === file.id ? { published: !(f as any).published } : {}) }));
    } else {
      panelsFiles = panelsFiles.map(f => ((f.webkitRelativePath || f.name) === (file.webkitRelativePath || file.name) ? { ...f, published: !((f as any).published) } : f));
    }
  }

  function handleTreeDeleteChapter(chapter: string) {
    panelsFiles = panelsFiles.filter(f => extractChapter(f.webkitRelativePath || f.name) !== chapter);
    filesToUpload = filesToUpload.filter(f => extractChapter((f as any).webkitRelativePath || f.name) !== chapter);
  }

  function handleTreeTogglePublishChapter(chapter: string) {
    panelsFiles = panelsFiles.map(f => (extractChapter(f.webkitRelativePath || f.name) === chapter ? { ...f, published: !((f as any).published) } : f));
    filesToUpload = filesToUpload.map(f => (extractChapter((f as any).webkitRelativePath || f.name) === chapter ? { ...(f as any), published: !((f as any).published) } : f));
    // Persist chapter-level published flag in _order.json so chapter-level publish/unpublish is respected
    const slug = slugifyChapterKey(chapter);
    // Determine desired state: if any file in the chapter is published then consider chapter published
    const desired = !!(panelsFiles.find(f => extractChapter(f.webkitRelativePath || f.name) === chapter && f.published));
    const payload = { orders: { [slug]: { published: desired } } };
    try { fetch('/api/admin/panels/order', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' }); } catch (e) { console.warn('Failed to persist chapter publish flag', e); }
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
            <li class="text-slate-300 text-sm flex items-center justify-between">
              <span class="truncate">{file.webkitRelativePath || file.name}</span>
              <span class="text-slate-500 text-xs ml-2 flex-shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)}MB
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <ul class="space-y-1">
          {#each filesToUpload.slice(0,3) as file}
            <li class="text-slate-300 text-sm flex items-center justify-between">
              <span class="truncate">{file.webkitRelativePath || file.name}</span>
              <span class="text-slate-500 text-xs ml-2 flex-shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)}MB
              </span>
            </li>
          {/each}
          <li class="text-slate-500 text-sm text-center py-1">
            ... {filesToUpload.length - 6} more files ...
          </li>
          {#each filesToUpload.slice(-3) as file}
            <li class="text-slate-300 text-sm flex items-center justify-between">
              <span class="truncate">{file.webkitRelativePath || file.name}</span>
              <span class="text-slate-500 text-xs ml-2 flex-shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)}MB
              </span>
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

