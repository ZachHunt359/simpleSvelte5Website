<script lang="ts">
  export let files: File[] = [];
  export let conflicts: { duplicates: string[], missing: string[], errors: string[] } = { duplicates: [], missing: [], errors: [] };
  export let inferredChapters: string[] = [];
  export let totalSize = 0;
  export let estimatedTime = 0;
  export let showDetails = false;

  $: newFiles = files.filter(file => {
    const path = file.webkitRelativePath || file.name;
    return !conflicts.duplicates.some(dup => path.includes(dup));
  });

  $: existingCount = files.length - newFiles.length;

  // Calculate total size if not provided
  $: if (totalSize === 0 && files.length > 0) {
    totalSize = files.reduce((sum, file) => sum + file.size, 0);
  }

  // Format file size for display
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Format time estimate
  function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  // Detect chapters from file paths
  $: if (files.length > 0 && inferredChapters.length === 0) {
    const chapters = new Set<string>();
    files.forEach(file => {
      const path = file.webkitRelativePath || file.name;
      const match = path.match(/chapter-(\d+)/i);
      if (match) {
        chapters.add(`Chapter ${match[1]}`);
      }
    });
    inferredChapters = Array.from(chapters).sort();
  }

  // Simple upload time estimation (assumes 1MB/second)
  $: if (estimatedTime === 0 && totalSize > 0) {
    estimatedTime = totalSize / (1024 * 1024); // rough estimate in seconds
  }

  // Helper functions
  function getFileTypes(files: File[]) {
    const types: Record<string, number> = {};
    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'Unknown';
      types[ext] = (types[ext] || 0) + 1;
    });
    return types;
  }

  function getDesktopFiles(files: File[]) {
    return files.filter(file => {
      const path = file.webkitRelativePath || file.name;
      return path.includes('/desktop/') || path.includes('\\desktop\\');
    });
  }

  function getMobileFiles(files: File[]) {
    return files.filter(file => {
      const path = file.webkitRelativePath || file.name;
      return path.includes('/mobile/') || path.includes('\\mobile\\');
    });
  }
</script>

{#if files.length > 0}
  <div class="upload-summary bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- File count badge -->
        <div class="badge badge-primary">
          {files.length} file{files.length === 1 ? '' : 's'}
        </div>
        
        <!-- New vs existing -->
        {#if newFiles.length !== files.length}
          <div class="badge badge-success">
            {newFiles.length} new
          </div>
          <div class="badge badge-warning">
            {existingCount} existing (skipped)
          </div>
        {/if}
        
        <!-- Total size -->
        <div class="badge badge-info">
          {formatFileSize(totalSize)}
        </div>
        
        <!-- Estimated time -->
        {#if estimatedTime > 0}
          <div class="badge badge-secondary">
            ETA: {formatTime(estimatedTime)}
          </div>
        {/if}
      </div>

      <!-- Details toggle -->
      <button 
        class="btn btn-sm btn-ghost text-slate-400 hover:text-white"
        on:click={() => showDetails = !showDetails}
      >
        {showDetails ? 'Hide' : 'Show'} Details
      </button>
    </div>

    <!-- Inferred chapters -->
    {#if inferredChapters.length > 0}
      <div class="mt-2 flex items-center gap-2">
        <span class="text-sm text-slate-400">Chapters detected:</span>
        {#each inferredChapters as chapter}
          <div class="badge badge-outline">{chapter}</div>
        {/each}
      </div>
    {/if}

    <!-- Conflicts summary -->
    {#if conflicts.duplicates.length > 0 || conflicts.missing.length > 0 || conflicts.errors.length > 0}
      <div class="mt-3 p-3 bg-slate-900 rounded border border-yellow-600">
        <div class="flex items-center gap-2 text-yellow-400 text-sm font-medium">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          Issues Detected
        </div>
        
        {#if conflicts.duplicates.length > 0}
          <div class="mt-1 text-sm text-slate-300">
            {conflicts.duplicates.length} duplicate file{conflicts.duplicates.length === 1 ? '' : 's'}
          </div>
        {/if}
        
        {#if conflicts.missing.length > 0}
          <div class="mt-1 text-sm text-slate-300">
            {conflicts.missing.length} missing mobile/desktop counterpart{conflicts.missing.length === 1 ? '' : 's'}
          </div>
        {/if}
        
        {#if conflicts.errors.length > 0}
          <div class="mt-1 text-sm text-red-400">
            {conflicts.errors.length} error{conflicts.errors.length === 1 ? '' : 's'}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Detailed breakdown (expandable) -->
    {#if showDetails}
      <div class="mt-4 p-3 bg-slate-900 rounded text-sm">
        <h4 class="font-medium text-white mb-2">Upload Details</h4>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-slate-400 mb-1">File Types:</div>
            {#each Object.entries(getFileTypes(files)) as [type, count]}
              <div class="text-slate-300">{type}: {count}</div>
            {/each}
          </div>
          
          <div>
            <div class="text-slate-400 mb-1">Structure:</div>
            <div class="text-slate-300">Desktop: {getDesktopFiles(files).length}</div>
            <div class="text-slate-300">Mobile: {getMobileFiles(files).length}</div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .badge-primary {
    background-color: #1e3a8a;
    color: #dbeafe;
  }
  
  .badge-success {
    background-color: #14532d;
    color: #dcfce7;
  }
  
  .badge-warning {
    background-color: #92400e;
    color: #fef3c7;
  }
  
  .badge-info {
    background-color: #164e63;
    color: #cffafe;
  }
  
  .badge-secondary {
    background-color: #374151;
    color: #f1f5f9;
  }
  
  .badge-outline {
    background-color: transparent;
    border: 1px solid #4b5563;
    color: #d1d5db;
  }

  /* Ensure any inline SVGs inside the summary are small */
  .upload-summary svg {
    width: 16px !important;
    height: 16px !important;
    max-width: 16px !important;
    max-height: 16px !important;
  }
</style>