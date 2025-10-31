<script lang="ts">
  export let files: File[] = [];
  export let conflicts: { duplicates: string[], missing: string[], errors: string[] } = { duplicates: [], missing: [], errors: [] };
  export let inferredChapters: string[] = [];

  // Organize files by chapter and device
  $: chapterMap = {};
  files.forEach(file => {
    const path = file.webkitRelativePath || file.name;
    const chapterMatch = path.match(/chapter-(\d+)/i);
    const chapter = chapterMatch ? `Chapter ${chapterMatch[1]}` : 'Uncategorized';
    const device = path.includes('/desktop/') || path.includes('\\desktop\\') ? 'desktop'
      : path.includes('/mobile/') || path.includes('\\mobile\\') ? 'mobile' : 'other';
    if (!chapterMap[chapter]) chapterMap[chapter] = { desktop: [], mobile: [], other: [] };
    chapterMap[chapter][device].push(file);
  });

  // Collapsible state
  let openChapters: Record<string, boolean> = {};
  $: inferredChapters.forEach(ch => { if (openChapters[ch] === undefined) openChapters[ch] = true; });

  function toggleChapter(chapter: string) {
    openChapters[chapter] = !openChapters[chapter];
  }

  function getPanelStatus(file: File) {
    const path = file.webkitRelativePath || file.name;
    if (conflicts.duplicates.some(dup => path.includes(dup))) return 'duplicate';
    if (conflicts.errors.some(err => err.includes(file.name))) return 'error';
    return 'ok';
  }
</script>

<div class="chapter-tree bg-slate-900 border border-slate-700 rounded-lg p-4">
  <h3 class="text-white font-medium mb-4">Upload Plan</h3>
  {#each Object.keys(chapterMap) as chapter}
    <div class="mb-3">
      <button class="chapter-toggle w-full text-left py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-between" on:click={() => toggleChapter(chapter)}>
        <span class="font-semibold text-lg text-slate-100">{chapter}</span>
        <span class="text-slate-400 text-sm">{chapterMap[chapter].desktop.length} desktop, {chapterMap[chapter].mobile.length} mobile</span>
        <span class="ml-2">{openChapters[chapter] ? '▼' : '▶'}</span>
      </button>
      {#if openChapters[chapter]}
        <div class="panel-list mt-2 ml-4">
          <div class="text-slate-400 text-xs mb-1">Desktop Panels:</div>
          <ul>
            {#each chapterMap[chapter].desktop as file}
              <li class="panel-item {getPanelStatus(file)}">
                <span>{file.name}</span>
                {#if getPanelStatus(file) === 'duplicate'}<span class="badge badge-warning ml-2">Duplicate</span>{/if}
                {#if getPanelStatus(file) === 'error'}<span class="badge badge-error ml-2">Error</span>{/if}
              </li>
            {/each}
          </ul>
          <div class="text-slate-400 text-xs mt-2 mb-1">Mobile Panels:</div>
          <ul>
            {#each chapterMap[chapter].mobile as file}
              <li class="panel-item {getPanelStatus(file)}">
                <span>{file.name}</span>
                {#if getPanelStatus(file) === 'duplicate'}<span class="badge badge-warning ml-2">Duplicate</span>{/if}
                {#if getPanelStatus(file) === 'error'}<span class="badge badge-error ml-2">Error</span>{/if}
              </li>
            {/each}
          </ul>
          {#if conflicts.missing.length > 0}
            <div class="mt-2 text-yellow-400 text-xs">
              {#each conflicts.missing.filter(m => m.includes(chapter)) as miss}
                <div>⚠ {miss}</div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
.chapter-tree {
  margin-bottom: 2rem;
}
.chapter-toggle {
  cursor: pointer;
  transition: background 0.15s;
}
.panel-list ul {
  list-style: none;
  padding-left: 0;
}
.panel-item {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  margin-bottom: 2px;
  color: #d1d5db;
  background: #1e293b;
  font-size: 0.95em;
  display: flex;
  align-items: center;
}
.panel-item.duplicate {
  background: #92400e22;
  color: #fbbf24;
}
.panel-item.error {
  background: #7f1d1d22;
  color: #f87171;
}
.badge {
  display: inline-block;
  padding: 0.1em 0.6em;
  border-radius: 9999px;
  font-size: 0.75em;
  font-weight: 500;
  margin-left: 0.5em;
}
.badge-warning {
  background: #fbbf24;
  color: #92400e;
}
.badge-error {
  background: #f87171;
  color: #7f1d1d;
}
</style>
