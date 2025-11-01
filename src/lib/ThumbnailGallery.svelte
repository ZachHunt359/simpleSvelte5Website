<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  
  // Import Uppy components
  import Uppy from '@uppy/core';
  import Dashboard from '@uppy/dashboard';
  import ThumbnailGenerator from '@uppy/thumbnail-generator';
  import XHRUpload from '@uppy/xhr-upload';
  
  export let files: File[] = [];
  export let conflicts: any = { duplicates: [], missing: [], errors: [] };
  export let allowReorder = true;
  export let showChapterGroups = true;
  
  const dispatch = createEventDispatcher();
  
  let uppyInstance: Uppy | null = null;
  let dashboardContainer: HTMLDivElement;
  let groupedFiles: Record<string, Array<{ file: File; thumbnail?: string; id: string }>> = {};
  let selectedChapter = 'all';
  let viewMode: 'grid' | 'list' = 'grid';
  
  onMount(() => {
    initializeUppy();
    organizeFiles();
  });
  
  onDestroy(() => {
    if (uppyInstance) {
      uppyInstance.destroy();
    }
  });
  
  function initializeUppy() {
    uppyInstance = new Uppy({
      restrictions: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov']
      },
      autoProceed: false
    });
    
    uppyInstance.use(ThumbnailGenerator, {
      thumbnailWidth: 200,
      thumbnailHeight: 200,
      thumbnailType: 'image/jpeg',
      waitForThumbnailsBeforeUpload: false
    });
    
    uppyInstance.use(Dashboard, {
      target: dashboardContainer,
      inline: true,
      width: '100%',
      height: 400,
      theme: 'dark',
      hideProgressDetails: false,
      showRemoveButtonAfterComplete: true,
      note: 'Images and videos only, up to 50MB each',
      proudlyDisplayPoweredByUppy: false,
      hideUploadButton: true,
      hideCancelButton: false
    });
    
    // Listen for thumbnail generation
    uppyInstance.on('thumbnail:generated', (file, preview) => {
      updateFileThumbnail(file.id, preview);
    });
    
    // Listen for file additions
    uppyInstance.on('file-added', (file) => {
      dispatch('fileAdded', { file });
    });
    
    // Listen for file removals
    uppyInstance.on('file-removed', (file) => {
      dispatch('fileRemoved', { file });
    });
    
    // Add files to Uppy
    files.forEach((file, index) => {
      const fileId = `file-${index}`;
      uppyInstance?.addFile({
        name: file.name,
        type: file.type,
        data: file,
        source: 'Local',
        isRemote: false
      });
    });
  }
  
  function updateFileThumbnail(fileId: string, preview: string) {
    // Update thumbnail in grouped files
    for (const chapter in groupedFiles) {
      const fileIndex = groupedFiles[chapter].findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        groupedFiles[chapter][fileIndex].thumbnail = preview;
        groupedFiles = { ...groupedFiles }; // Trigger reactivity
        break;
      }
    }
  }
  
  function organizeFiles() {
    groupedFiles = {};
    
    files.forEach((file, index) => {
      const path = file.webkitRelativePath || file.name;
      const chapterMatch = path.match(/chapter-(\d+)/i);
      const chapter = chapterMatch ? `Chapter ${chapterMatch[1]}` : 'Uncategorized';
      
      if (!groupedFiles[chapter]) {
        groupedFiles[chapter] = [];
      }
      
      const deviceType = path.includes('/desktop/') || path.includes('\\desktop\\') ? 'desktop' : 
                        path.includes('/mobile/') || path.includes('\\mobile\\') ? 'mobile' : 'unknown';
      
      const panelMatch = path.match(/(\d+)/);
      const panelNumber = panelMatch ? parseInt(panelMatch[1], 10) : 999;
      
      groupedFiles[chapter].push({
        file,
        id: `file-${index}`,
        thumbnail: undefined
      });
    });
    
    // Sort files within each chapter by panel number
    Object.keys(groupedFiles).forEach(chapter => {
      groupedFiles[chapter].sort((a, b) => {
        const aPath = a.file.webkitRelativePath || a.file.name;
        const bPath = b.file.webkitRelativePath || b.file.name;
        
        const aPanel = parseInt((aPath.match(/(\d+)/) || ['0'])[0], 10);
        const bPanel = parseInt((bPath.match(/(\d+)/) || ['0'])[0], 10);
        
        return aPanel - bPanel;
      });
    });
  }
  
  function handleReorder(chapter: string, fromIndex: number, toIndex: number) {
    if (!allowReorder) return;
    
    const chapterFiles = [...groupedFiles[chapter]];
    const [movedFile] = chapterFiles.splice(fromIndex, 1);
    chapterFiles.splice(toIndex, 0, movedFile);
    
    groupedFiles[chapter] = chapterFiles;
    groupedFiles = { ...groupedFiles };
    
    dispatch('filesReordered', { chapter, files: chapterFiles });
  }
  
  function getFileStatus(file: File) {
    const path = file.webkitRelativePath || file.name;
    
    if (conflicts.duplicates.some((dup: string) => path.includes(dup))) {
      return 'duplicate';
    }
    
    if (conflicts.errors.some((error: string) => error.includes(file.name))) {
      return 'error';
    }
    
    return 'ready';
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'duplicate': return 'border-yellow-500 bg-yellow-900';
      case 'error': return 'border-red-500 bg-red-900';
      default: return 'border-slate-600 bg-slate-800';
    }
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  $: if (files.length > 0) {
    organizeFiles();
  }
  
  $: chapters = Object.keys(groupedFiles).sort();
  $: visibleFiles = selectedChapter === 'all' 
    ? Object.values(groupedFiles).flat()
    : groupedFiles[selectedChapter] || [];
</script>

<div class="thumbnail-gallery bg-slate-900 border border-slate-700 rounded-lg p-4">
  <!-- DEBUG: Gallery Rendered -->
  <div class="text-xs text-yellow-400 mb-2">[DEBUG] ThumbnailGallery rendered. files: {files.length}, chapters: {chapters.length}, showChapterGroups: {showChapterGroups ? 'true' : 'false'}</div>
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-white font-medium">File Preview</h3>
    
    <div class="flex items-center gap-3">
      <!-- Chapter filter -->
      {#if showChapterGroups && chapters.length > 1}
        <select bind:value={selectedChapter} class="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white">
          <option value="all">All Chapters</option>
          {#each chapters as chapter}
            <option value={chapter}>{chapter}</option>
          {/each}
        </select>
      {/if}
      
      <!-- View mode toggle -->
      <div class="flex bg-slate-700 rounded">
        <button 
          class="px-3 py-1 text-sm rounded-l {viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}"
          on:click={() => viewMode = 'grid'}
        >
          Grid
        </button>
        <button 
          class="px-3 py-1 text-sm rounded-r {viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}"
          on:click={() => viewMode = 'list'}
        >
          List
        </button>
      </div>
    </div>
  </div>
  
  <!-- Uppy Dashboard (hidden by default, can be toggled) -->
  <div class="hidden">
    <div bind:this={dashboardContainer}></div>
  </div>
  
  <!-- Custom thumbnail display -->
  {#if showChapterGroups}
    <!-- Drag-and-drop test button for debugging -->
    <button class="btn btn-xs btn-ghost mb-2" on:click={() => {
      const chapter = chapters[0];
      if (groupedFiles[chapter]?.length > 1) {
        const files = [...groupedFiles[chapter]];
        const moved = files.shift();
        if (moved) {
          files.push(moved);
          groupedFiles[chapter] = files;
          groupedFiles = { ...groupedFiles };
          dispatch('filesReordered', { chapter, files });
        }
      }
    }}>Simulate Drag: Move First to Last</button>
    <!-- Grouped by chapter -->
    {#each chapters as chapter}
      {#if selectedChapter === 'all' || selectedChapter === chapter}
        <div class="chapter-group mb-6">
          <h4 class="text-slate-200 font-medium mb-3 flex items-center gap-2">
            <span>{chapter}</span>
            <span class="text-slate-500 text-sm">({groupedFiles[chapter]?.length || 0} files)</span>
          </h4>
          
          <div class="files-container {viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-2'}"
            use:dndzone={{ items: groupedFiles[chapter] || [], flipDurationMs: 150 }}
            on:consider={e => {
              const { items } = e.detail;
              groupedFiles[chapter] = items;
              groupedFiles = { ...groupedFiles };
            }}
            on:finalize={e => {
              const { items } = e.detail;
              groupedFiles[chapter] = items;
              groupedFiles = { ...groupedFiles };
              dispatch('filesReordered', { chapter, files: items });
            }}>
            {#each groupedFiles[chapter] || [] as fileData, index}
              {@const status = getFileStatus(fileData.file)}
              {@const path = fileData.file.webkitRelativePath || fileData.file.name}
              {@const deviceType = path.includes('/desktop/') || path.includes('\\desktop\\') ? 'desktop' : path.includes('/mobile/') || path.includes('\\mobile\\') ? 'mobile' : 'unknown'}
              
              <div 
                class="file-item {getStatusColor(status)} border rounded-lg p-2 transition-all hover:border-slate-500 {viewMode === 'grid' ? '' : 'flex items-center gap-3'}"
                draggable={allowReorder}
                role="button"
                tabindex="0"
                on:dragstart={(e) => e.dataTransfer?.setData('text/plain', index.toString())}
                on:dragover|preventDefault
                on:drop|preventDefault={(e) => {
                  const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '0');
                  handleReorder(chapter, fromIndex, index);
                }}
              >
                {#if viewMode === 'grid'}
                  <!-- Grid view -->
                  <div class="aspect-square bg-slate-700 rounded mb-2 overflow-hidden">
                    {#if fileData.thumbnail}
                      <img src={fileData.thumbnail} alt={fileData.file.name} class="w-full h-full object-cover" />
                    {:else if fileData.file.type.startsWith('image/')}
                      <div class="w-full h-full flex items-center justify-center text-slate-400">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                        </svg>
                      </div>
                    {:else}
                      <div class="w-full h-full flex items-center justify-center text-slate-400">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                      </div>
                    {/if}
                  </div>
                  
                  <div class="text-xs">
                    <div class="text-slate-300 truncate mb-1" title={fileData.file.name}>
                      {fileData.file.name}
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-500">{formatFileSize(fileData.file.size)}</span>
                      <span class="px-1 py-0.5 rounded text-xs {deviceType === 'desktop' ? 'bg-blue-900 text-blue-100' : deviceType === 'mobile' ? 'bg-green-900 text-green-100' : 'bg-slate-700 text-slate-300'}">
                        {deviceType}
                      </span>
                    </div>
                    {#if status !== 'ready'}
                      <div class="mt-1 text-xs {status === 'duplicate' ? 'text-yellow-400' : 'text-red-400'}">
                        {status === 'duplicate' ? 'Duplicate' : 'Error'}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <!-- List view -->
                  <div class="flex-shrink-0">
                    {#if fileData.thumbnail}
                      <img src={fileData.thumbnail} alt={fileData.file.name} class="w-12 h-12 object-cover rounded" />
                    {:else}
                      <div class="w-12 h-12 bg-slate-700 rounded flex items-center justify-center">
                        <svg class="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                        </svg>
                      </div>
                    {/if}
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="text-slate-300 truncate" title={fileData.file.name}>
                      {fileData.file.name}
                    </div>
                    <div class="text-sm text-slate-500">
                      {formatFileSize(fileData.file.size)} • {deviceType}
                      {#if status !== 'ready'}
                        <span class="ml-2 {status === 'duplicate' ? 'text-yellow-400' : 'text-red-400'}">
                          • {status === 'duplicate' ? 'Duplicate' : 'Error'}
                        </span>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {:else}
    <!-- Single list view -->
    <div class="files-container {viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-2'}">
      {#each visibleFiles as fileData, index}
        {@const status = getFileStatus(fileData.file)}
        {@const path = fileData.file.webkitRelativePath || fileData.file.name}
        {@const deviceType = path.includes('/desktop/') || path.includes('\\desktop\\') ? 'desktop' : path.includes('/mobile/') || path.includes('\\mobile\\') ? 'mobile' : 'unknown'}
        
        <div class="file-item {getStatusColor(status)} border rounded-lg p-2 transition-all hover:border-slate-500 {viewMode === 'grid' ? '' : 'flex items-center gap-3'}">
          <!-- Same content as above but without chapter grouping -->
        </div>
      {/each}
    </div>
  {/if}
  
  {#if visibleFiles.length === 0}
    <div class="text-center py-8 text-slate-500">
      No files to display
    </div>
  {/if}
</div>

<style>
  .file-item {
    cursor: pointer;
    user-select: none;
  }
  
  .file-item:hover {
    transform: translateY(-1px);
  }
  
  .chapter-group:last-child {
    margin-bottom: 0;
  }
</style>