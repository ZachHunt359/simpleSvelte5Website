<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { env } from '$env/dynamic/public';
  
  const dispatch = createEventDispatcher();
  
  // Asset base path - use environment variable or default to /panels
  const ASSET_BASE = env.PUBLIC_STATIC_ASSET_BASE || '/panels';
  
  export let conflicts: Array<{
    file: File;
    existingPath: string;
    size: number;
    existingSize?: number;
  }> = [];
  
  export let visible = false;
  
  type ResolutionChoice = 'keep-existing' | 'replace' | 'keep-both' | 'skip';
  
  // Track resolution choice for each file
  let resolutions: Record<string, ResolutionChoice> = {};
  
  // Track preview URLs for new files (client-side)
  let newFilePreviews: Record<string, string> = {};
  
  // Track preview URLs for existing files (from server)
  let existingFilePreviews: Record<string, string> = {};
  
  // Track if we've initialized for the current set of conflicts
  let initializedForConflicts = '';
  
  // Initialize with default choice (skip individual files, user must choose)
  $: {
    // Create a unique key for the current conflicts to prevent re-initialization
    const conflictsKey = conflicts.map(c => c.existingPath).join('|');
    
    if (conflicts.length > 0 && conflictsKey !== initializedForConflicts) {
      initializedForConflicts = conflictsKey;
      resolutions = {};
      newFilePreviews = {};
      existingFilePreviews = {};
      
      conflicts.forEach(c => {
        const key = c.existingPath;
        resolutions[key] = 'skip';
        
        // Create preview URL for new file if it's an image
        if (c.file.type.startsWith('image/')) {
          newFilePreviews[key] = URL.createObjectURL(c.file);
        }
        
        // Construct preview URL for existing file (served from static/panels)
        // Check if it's an image type by extension
        const ext = c.existingPath.split('.').pop()?.toLowerCase();
        if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          // Add timestamp to bust browser cache
          existingFilePreviews[key] = `${ASSET_BASE}/${c.existingPath}?t=${Date.now()}`;
        }
      });
    }
  }
  
  // Cleanup preview URLs when modal closes
  $: if (!visible && Object.keys(newFilePreviews).length > 0) {
    Object.values(newFilePreviews).forEach(url => URL.revokeObjectURL(url));
    newFilePreviews = {};
  }
  
  // Apply choice to all conflicts
  function applyToAll(choice: ResolutionChoice) {
    conflicts.forEach(c => {
      resolutions[c.existingPath] = choice;
    });
    resolutions = { ...resolutions }; // Trigger reactivity
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
  
  function handleConfirm() {
    dispatch('resolve', { resolutions });
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  // Count how many of each choice
  $: counts = {
    'keep-existing': Object.values(resolutions).filter(r => r === 'keep-existing').length,
    'replace': Object.values(resolutions).filter(r => r === 'replace').length,
    'keep-both': Object.values(resolutions).filter(r => r === 'keep-both').length,
    'skip': Object.values(resolutions).filter(r => r === 'skip').length
  };
  
  $: canConfirm = counts.skip === 0; // Can only confirm if no files are left as 'skip'
</script>

{#if visible}
  <div class="modal-overlay" on:click={handleCancel} role="dialog" aria-modal="true">
    <div class="modal-content" on:click|stopPropagation role="document">
      <div class="modal-header">
        <h2>File Conflicts Detected</h2>
        <p class="subtitle">{conflicts.length} file{conflicts.length === 1 ? '' : 's'} already exist{conflicts.length === 1 ? 's' : ''}</p>
      </div>
      
      <div class="modal-body">
        <div class="quick-actions">
          <p class="quick-label">Apply to all:</p>
          <button class="btn btn-sm" on:click={() => applyToAll('keep-existing')}>Keep Existing</button>
          <button class="btn btn-sm" on:click={() => applyToAll('replace')}>Replace All</button>
          <button class="btn btn-sm" on:click={() => applyToAll('keep-both')}>Keep Both</button>
        </div>
        
        <div class="conflicts-list">
          {#each conflicts as conflict}
            {@const key = conflict.existingPath}
            {@const fileName = conflict.file.name}
            <div class="conflict-item">
              <div class="file-info">
                <div class="file-name">{fileName}</div>
                <div class="file-details">
                  <span class="detail">Existing: {conflict.existingSize ? formatBytes(conflict.existingSize) : 'unknown size'}</span>
                  <span class="detail-sep">•</span>
                  <span class="detail">New: {formatBytes(conflict.file.size)}</span>
                </div>
              </div>
              
              <!-- Preview Images -->
              {#if existingFilePreviews[key] || newFilePreviews[key]}
                <div class="preview-container">
                  {#if existingFilePreviews[key]}
                    <div class="preview-box">
                      <div class="preview-label">Existing</div>
                      <img src={existingFilePreviews[key]} alt="Existing {fileName}" class="preview-image" />
                    </div>
                  {/if}
                  {#if newFilePreviews[key]}
                    <div class="preview-box">
                      <div class="preview-label">New</div>
                      <img src={newFilePreviews[key]} alt="New {fileName}" class="preview-image" />
                    </div>
                  {/if}
                </div>
              {/if}
              
              <div class="resolution-choices">
                <label class="radio-label">
                  <input 
                    type="radio" 
                    name="resolution-{key}" 
                    value="keep-existing" 
                    checked={resolutions[key] === 'keep-existing'}
                    on:change={() => { resolutions[key] = 'keep-existing'; resolutions = {...resolutions}; }}
                  />
                  <span>Keep Existing</span>
                </label>
                <label class="radio-label">
                  <input 
                    type="radio" 
                    name="resolution-{key}" 
                    value="replace" 
                    checked={resolutions[key] === 'replace'}
                    on:change={() => { resolutions[key] = 'replace'; resolutions = {...resolutions}; }}
                  />
                  <span>Replace</span>
                </label>
                <label class="radio-label">
                  <input 
                    type="radio" 
                    name="resolution-{key}" 
                    value="keep-both" 
                    checked={resolutions[key] === 'keep-both'}
                    on:change={() => { resolutions[key] = 'keep-both'; resolutions = {...resolutions}; }}
                  />
                  <span>Keep Both</span>
                </label>
              </div>
            </div>
          {/each}
        </div>
        
        {#if !canConfirm}
          <div class="warning-message">
            ⚠️ Please choose an action for all files before continuing ({counts.skip} remaining)
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleCancel}>Cancel Upload</button>
        <button class="btn btn-primary" on:click={handleConfirm} disabled={!canConfirm}>
          Continue ({counts['keep-existing']} keep, {counts.replace} replace, {counts['keep-both']} both)
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    max-width: 700px;
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    border: 1px solid #334155;
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
  
  .quick-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #0f172a;
    border-radius: 0.5rem;
    flex-wrap: wrap;
  }
  
  .quick-label {
    margin: 0;
    color: #cbd5e1;
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .conflicts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .conflict-item {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1rem;
  }
  
  .file-info {
    margin-bottom: 0.75rem;
  }
  
  .file-name {
    color: #f1f5f9;
    font-weight: 500;
    margin-bottom: 0.25rem;
    word-break: break-word;
  }
  
  .file-details {
    color: #94a3b8;
    font-size: 0.813rem;
  }
  
  .detail-sep {
    margin: 0 0.5rem;
    opacity: 0.5;
  }
  
  .preview-container {
    display: flex;
    gap: 1rem;
    margin: 0.75rem 0;
    flex-wrap: wrap;
  }
  
  .preview-box {
    flex: 1;
    min-width: 150px;
    max-width: 250px;
  }
  
  .preview-label {
    color: #94a3b8;
    font-size: 0.75rem;
    font-weight: 500;
    margin-bottom: 0.375rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .preview-image {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: contain;
    border-radius: 0.375rem;
    border: 1px solid #334155;
    background: #0f172a;
    display: block;
  }
  
  .resolution-choices {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #cbd5e1;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .radio-label input[type="radio"] {
    cursor: pointer;
  }
  
  .radio-label:hover span {
    color: #f1f5f9;
  }
  
  .warning-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #7c2d12;
    border: 1px solid #ea580c;
    border-radius: 0.5rem;
    color: #fed7aa;
    font-size: 0.875rem;
  }
  
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #334155;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    transition: all 0.15s ease;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.813rem;
  }
  
  .btn-primary {
    background: #2563eb;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }
  
  .btn-primary:disabled {
    background: #475569;
    color: #94a3b8;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    background: #475569;
    color: #e2e8f0;
  }
  
  .btn-secondary:hover {
    background: #334155;
  }
  
  @media (max-width: 640px) {
    .modal-content {
      max-height: 95vh;
    }
    
    .quick-actions {
      flex-direction: column;
      align-items: stretch;
    }
    
    .quick-label {
      width: 100%;
    }
    
    .resolution-choices {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .modal-footer {
      flex-direction: column-reverse;
    }
    
    .btn {
      width: 100%;
    }
  }
</style>