<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Uppy from '@uppy/core';
  import Dashboard from '@uppy/dashboard';
  import ThumbnailGenerator from '@uppy/thumbnail-generator';
  
  // Import Uppy styles
  import '@uppy/core/css/style.min.css';
  import '@uppy/dashboard/css/style.min.css';
  
  interface Props {
    disabled?: boolean;
    allowedFileTypes?: string[];
    maxFileSize?: number;
    note?: string;
    onfilesAdded?: (event: CustomEvent<{ files: File[] }>) => void;
    onfileRemoved?: (event: CustomEvent<{ file: File }>) => void;
    onuploadProgress?: (event: CustomEvent<any>) => void;
    onuploadSuccess?: (event: CustomEvent<any>) => void;
    onuploadError?: (event: CustomEvent<any>) => void;
    onuploadComplete?: (event: CustomEvent<any>) => void;
  }
  
  let {
    disabled = false,
    allowedFileTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4', '.mov'],
    maxFileSize = 100 * 1024 * 1024,
    note = 'Images and videos only, up to 100MB each',
    onfilesAdded,
    onfileRemoved,
    onuploadProgress,
    onuploadSuccess,
    onuploadError,
    onuploadComplete
  }: Props = $props();
  
  let dashboardContainer: HTMLElement | undefined = $state();
  let uppyInstance: Uppy | null = $state(null);
  
  onMount(() => {
    if (!dashboardContainer) return;
    
    uppyInstance = new Uppy({
      restrictions: {
        maxFileSize,
        allowedFileTypes
      },
      autoProceed: false,
      allowMultipleUploadBatches: true
    });
    
    // Thumbnail generation for visual feedback
    uppyInstance.use(ThumbnailGenerator, {
      thumbnailWidth: 200,
      thumbnailHeight: 200,
      thumbnailType: 'image/jpeg',
      waitForThumbnailsBeforeUpload: false
    });
    
    // Dashboard UI with dark theme
    uppyInstance.use(Dashboard, {
      target: dashboardContainer,
      inline: true,
      width: '100%',
      height: 500,
      theme: 'dark',
      proudlyDisplayPoweredByUppy: false,
      showProgressDetails: true,
      hideUploadButton: true,
      hideRetryButton: false,
      hidePauseResumeButton: false,
      hideCancelButton: false,
      showRemoveButtonAfterComplete: true,
      note,
      fileManagerSelectionType: 'both',
      browserBackButtonClose: false,
      disableLocalFiles: false,
      disableThumbnailGenerator: false
    });
    
    // Event handlers
    uppyInstance.on('files-added', (files) => {
      const fileArray = files.map(file => file.data as File);
      onfilesAdded?.(new CustomEvent('filesAdded', { detail: { files: fileArray } }));
    });
    
    uppyInstance.on('file-removed', (file) => {
      onfileRemoved?.(new CustomEvent('fileRemoved', { detail: { file: file.data } }));
    });
    
    uppyInstance.on('upload-progress', (file, progress) => {
      onuploadProgress?.(new CustomEvent('uploadProgress', { detail: { file, progress } }));
    });
    
    uppyInstance.on('upload-success', (file, response) => {
      onuploadSuccess?.(new CustomEvent('uploadSuccess', { detail: { file, response } }));
    });
    
    uppyInstance.on('upload-error', (file, error) => {
      onuploadError?.(new CustomEvent('uploadError', { detail: { file, error } }));
    });
    
    uppyInstance.on('complete', (result) => {
      onuploadComplete?.(new CustomEvent('uploadComplete', { detail: { result } }));
    });
  });
  
  onDestroy(() => {
    if (uppyInstance) {
      uppyInstance.close({ reason: 'unmount' });
      uppyInstance = null;
    }
  });
  
  // Public methods
  export function getFiles() {
    return uppyInstance ? uppyInstance.getFiles().map(f => f.data as File) : [];
  }
  
  export function clearFiles() {
    if (uppyInstance) {
      uppyInstance.cancelAll();
    }
  }
  
  export function removeFile(fileId: string) {
    if (uppyInstance) {
      uppyInstance.removeFile(fileId);
    }
  }
  
  export async function startUpload(customUploadFn?: (files: File[]) => Promise<void>) {
    if (!uppyInstance) return;
    
    const files = uppyInstance.getFiles().map(f => f.data as File);
    
    if (customUploadFn) {
      try {
        await customUploadFn(files);
        uppyInstance.cancelAll();
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }
</script>

<div class="uppy-wrapper">
  <div bind:this={dashboardContainer} class="uppy-dashboard-container"></div>
</div>

<style>
  .uppy-wrapper {
    width: 100%;
    margin: 1rem 0;
  }
  
  .uppy-dashboard-container :global(.uppy-Dashboard-inner) {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
  }
  
  .uppy-dashboard-container :global(.uppy-Dashboard-AddFiles-title) {
    color: #e2e8f0;
  }
  
  .uppy-dashboard-container :global(.uppy-Dashboard-note) {
    color: #94a3b8;
  }
  
  .uppy-dashboard-container :global(.uppy-DashboardItem-name) {
    color: #e2e8f0;
  }
  
  .uppy-dashboard-container :global(.uppy-DashboardItem-status) {
    color: #94a3b8;
  }
  
  /* Dark theme progress bar */
  .uppy-dashboard-container :global(.uppy-StatusBar) {
    background-color: #0f172a;
    border-top: 1px solid #334155;
  }
  
  .uppy-dashboard-container :global(.uppy-StatusBar-progress) {
    background-color: #3b82f6;
  }
  
  /* Button styling */
  .uppy-dashboard-container :global(.uppy-u-reset) {
    color: #e2e8f0;
  }
  
  .uppy-dashboard-container :global(.uppy-c-btn-primary) {
    background-color: #3b82f6;
  }
  
  .uppy-dashboard-container :global(.uppy-c-btn-primary:hover) {
    background-color: #2563eb;
  }
</style>
