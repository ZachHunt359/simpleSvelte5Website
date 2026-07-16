<script lang="ts">
  import { onMount } from 'svelte';
  
  let imageServingMode = 'auto';
  let status: string | null = null;
  let loading = true;
  
  onMount(async () => {
    await loadSettings();
  });
  
  async function loadSettings() {
    try {
      loading = true;
      const res = await fetch('/api/admin/settings', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        imageServingMode = data.imageServingMode || 'auto';
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
      status = 'Failed to load settings';
    } finally {
      loading = false;
    }
  }
  
  async function saveSettings() {
    try {
      status = 'Saving...';
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageServingMode })
      });
      
      if (res.ok) {
        status = 'Settings saved successfully! Users will see the new mode when they reload.';
        setTimeout(() => status = null, 5000);
      } else {
        const data = await res.json();
        status = `Error: ${data.error || 'Failed to save settings'}`;
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
      status = 'Failed to save settings';
    }
  }
</script>

<section class="max-w-2xl mx-auto p-4">
  <h2>Site Settings</h2>
  
  {#if loading}
    <p>Loading settings...</p>
  {:else}
    <div class="settings-section">
      <h3>Image Serving Mode</h3>
      <p class="description">
        Control which panel images are served to users. This affects all visitors to the comic reader.
      </p>
      
      <div class="radio-group">
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={imageServingMode} 
            value="auto" 
            name="imageServingMode"
          />
          <div class="radio-content">
            <strong>Auto (Device-based)</strong>
            <span class="radio-description">Serve desktop images on wide screens, mobile images on narrow screens</span>
          </div>
        </label>
        
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={imageServingMode} 
            value="desktop-only" 
            name="imageServingMode"
          />
          <div class="radio-content">
            <strong>Desktop Only</strong>
            <span class="radio-description">Serve desktop images to all users, regardless of device</span>
          </div>
        </label>
        
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={imageServingMode} 
            value="mobile-only" 
            name="imageServingMode"
          />
          <div class="radio-content">
            <strong>Mobile Only</strong>
            <span class="radio-description">Serve mobile images to all users, regardless of device</span>
          </div>
        </label>
      </div>
      
      <button class="save-button" on:click={saveSettings}>Save Settings</button>
      
      {#if status}
        <p class="status" class:error={status.includes('Error') || status.includes('Failed')}>{status}</p>
      {/if}
    </div>
  {/if}
</section>

<style>
  section {
    padding: 2rem;
  }
  
  h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
  }
  
  h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
  
  .description {
    color: #666;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
  }
  
  .settings-section {
    background: #f9f9f9;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #ddd;
  }
  
  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border: 2px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .radio-option:hover {
    border-color: #999;
    background: #fafafa;
  }
  
  .radio-option:has(input:checked) {
    border-color: #007bff;
    background: #f0f8ff;
  }
  
  .radio-option input[type="radio"] {
    margin-top: 0.25rem;
    cursor: pointer;
  }
  
  .radio-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }
  
  .radio-content strong {
    font-size: 1rem;
    color: #333;
  }
  
  .radio-description {
    font-size: 0.875rem;
    color: #666;
  }
  
  .save-button {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .save-button:hover {
    background: #0056b3;
  }
  
  .status {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 6px;
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .status.error {
    background: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }
</style>
