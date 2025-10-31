<script lang="ts">
  import UploadSummary from '$lib/UploadSummary.svelte';
  import ThumbnailGallery from '$lib/ThumbnailGallery.svelte';
  import ChapterTree from '$lib/ChapterTree.svelte';
  import { analyzeConflicts, getExistingPanels, preprocessFiles, type ConflictAnalysis } from '$lib/uploadValidation';
  
  let selectedFiles: File[] = [];
  let filesToUpload: File[] = [];
  let existingFiles: string[] = [];
  let loadingExisting = false;
  let uploading = false;
  let uploadError = '';
  let uploadSuccess = '';
  let showAllFiles = false;
  let conflicts: ConflictAnalysis = { duplicates: [], missing: [], errors: [], warnings: [], mismatched: [] };
  let validationInProgress = false;
  let totalSize = 0;
  let inferredChapters: string[] = [];

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

  async function validateFiles() {
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
      
      // Filter files (remove duplicates)
      filesToUpload = selectedFiles.filter(file => {
        let relPath = file.webkitRelativePath || file.name;
        if (relPath.startsWith('panels/')) relPath = relPath.slice('panels/'.length);
        return !existingFiles.includes(relPath);
      });
      
      // Calculate total size and extract chapters
      const { totalValidSize } = preprocessFiles(filesToUpload);
      totalSize = totalValidSize;
      
      // Extract inferred chapters
      inferredChapters = [...new Set(
        selectedFiles.map(file => {
          const path = file.webkitRelativePath || file.name;
          const match = path.match(/chapter-(\d+)/i);
          return match ? `Chapter ${match[1]}` : null;
        }).filter((chapter): chapter is string => chapter !== null)
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
    for (const file of filesToUpload) {
      let relPath = file.webkitRelativePath || file.name;
      if (relPath.startsWith('panels/')) relPath = relPath.slice('panels/'.length);
      formData.append('files', file, relPath);
      formData.append('relativePaths', relPath);
    }
    const res = await fetch('/api/panels/upload', { method: 'POST', body: formData, credentials: 'same-origin'});
    uploading = false;
    if (!res.ok) { uploadError = `Upload failed: ${res.status}`; return; }
    const result = await res.json();
    if (result.success) { uploadSuccess = 'Upload complete!'; selectedFiles = []; filesToUpload = []; } else { uploadError = result.error || 'Upload failed.' }
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
      <button type="button" class="btn btn-secondary" style="margin-left:0.5rem" on:click={regeneratePanels} disabled={regenerating}>
        {regenerating ? 'Regenerating...' : 'Regenerate panels'}
      </button>
    </div>
  </form>
  
  <!-- Enhanced Upload Summary -->
  {#if selectedFiles.length > 0}
    <UploadSummary 
      files={selectedFiles} 
      {conflicts} 
      {inferredChapters} 
      {totalSize} 
    />
    <ChapterTree 
      files={selectedFiles} 
      {conflicts} 
      {inferredChapters} 
    />
    <!-- Thumbnail Gallery -->
    <ThumbnailGallery 
      files={selectedFiles}
      {conflicts}
      allowReorder={true}
      showChapterGroups={true}
      on:filesReordered={(e) => {
        console.log('Files reordered:', e.detail);
        // Handle file reordering if needed
      }}
    />
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

