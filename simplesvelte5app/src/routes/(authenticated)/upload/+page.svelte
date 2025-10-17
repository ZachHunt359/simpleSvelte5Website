<script lang="ts">
  let selectedFiles: File[] = [];
  let filesToUpload: File[] = [];
  let existingFiles: string[] = [];
  let loadingExisting = false;
  let uploading = false;
  let uploadError = '';
  let uploadSuccess = '';
  let showAllFiles = false;

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      selectedFiles = Array.from(input.files);
      uploadError = '';
      uploadSuccess = '';
      loadingExisting = true;
      const res = await fetch('/api/panels/list', { credentials: 'same-origin' });
      if (!res.ok) { loadingExisting = false; uploadError = `Failed to fetch existing files: ${res.status}`; return; }
      existingFiles = await res.json();
      loadingExisting = false;
      filesToUpload = selectedFiles.filter(file => {
        let relPath = file.webkitRelativePath || file.name;
        if (relPath.startsWith('panels/')) relPath = relPath.slice('panels/'.length);
        return !existingFiles.includes(relPath);
      });
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
  <form class="upload-form" on:submit|preventDefault={handleUpload}>
    <!-- visible chooser button + info area for folder selection -->
    <div class="chooser">
      <button type="button" class="btn btn-outline" on:click={openFolderPicker}>Choose Folder</button>
      <span class="chooser-info" aria-live="polite">{chooserInfo}</span>
      <input id="panel-folder-input" bind:this={panelInput} type="file" webkitdirectory multiple on:change={handleFileSelect} class="file-input" aria-hidden="true" />
    </div>

    <div class="actions">
      <button class="btn btn-primary" type="submit" disabled={uploading || !selectedFiles.length}>{uploading ? 'Uploading...' : 'Upload All'}</button>
      <button type="button" class="btn btn-secondary" style="margin-left:0.5rem" on:click={regeneratePanels} disabled={regenerating}>{regenerating ? 'Regenerating...' : 'Regenerate panels'}</button>
    </div>
  </form>
  {#if uploadError}<div class="error">{uploadError}</div>{/if}
  {#if uploadSuccess}<div class="success">{uploadSuccess}</div>{/if}
  {#if regenerateStatus}
    <div class="info" style="margin-top:0.5rem">{regenerateStatus}</div>
  {/if}
  {#if filesToUpload.length}
    <div class="file-list-preview">
      <strong>Files to upload (after removing duplicates):</strong>
      {#if filesToUpload.length <= 6 || showAllFiles}
        <ul>{#each filesToUpload as file}<li>{file.webkitRelativePath || file.name}</li>{/each}</ul>
      {:else}
        <ul>{#each filesToUpload.slice(0,3) as file}<li>{file.webkitRelativePath || file.name}</li>{/each}<li>…</li>{#each filesToUpload.slice(-3) as file}<li>{file.webkitRelativePath || file.name}</li>{/each}</ul>
        <button class="btn btn-xs" on:click={() => showAllFiles = true}>Show all {filesToUpload.length} files</button>
      {/if}
    </div>
  {/if}
</section>

<style>
.upload-section { max-width: 60%; margin: auto }
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
}
.actions {
  display: flex;
  align-items: center;
}
.chooser + .actions { margin-left: auto }

.error { color: #ff4d4f; margin-top: 0.5rem }
.success { color: #4caf50; margin-top: 0.5rem }
.info { color: #ccc; margin-top: 0.5rem }

.file-list-preview ul {
  margin: 0.5em 0 0.5em 1.5em;
  padding: 0;
  font-size: 0.95em;
  text-align: left;
}
.file-list-preview button {
  margin-top: 0.5em;
}
</style>
 
