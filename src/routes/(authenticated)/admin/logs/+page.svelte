<script lang="ts">
  import { onMount } from 'svelte';
  let lines: string[] = [];
  let query = '';
  let filtered: string[] = [];
  let rawMode = false;
  let status: string | null = null;
  let linesCount = 200;

  async function fetchLogs() {
    try {
      const res = await fetch(`/api/admin/logs?lines=${linesCount}`, { credentials: 'same-origin' });
      if (!res.ok) {
        status = 'Failed to fetch logs';
        return;
      }
      const text = await res.text();
      // if returned JSON, parse
      try {
        const obj = JSON.parse(text);
        if (obj?.lines) {
          lines = obj.lines;
        } else {
          lines = (text || '').split(/\r?\n/).filter(Boolean);
        }
      } catch (e) {
        lines = (text || '').split(/\r?\n/).filter(Boolean);
      }
      applyFilter();
    } catch (e) {
      status = 'Error fetching logs';
    }
  }

  function applyFilter() {
    if (!query) {
      filtered = lines.slice();
      return;
    }
    const q = query.toLowerCase();
    filtered = lines.filter((l) => l.toLowerCase().includes(q));
  }

  function downloadText() {
    const blob = new Blob([filtered.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'server.log.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  onMount(fetchLogs);

  // structured log renderer with safe HTML escaping and search highlighting
  function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (c: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c as keyof Record<string,string>] ?? c));
  }

  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function markMatch(s: string, q: string) {
    if (!q) return s;
    try {
      const re = new RegExp(escapeRegExp(q), 'ig');
      return s.replace(re, (m) => `<mark>${escapeHtml(m)}</mark>`);
    } catch (e) {
      return s; // fallback
    }
  }

  function renderLine(line: string, q: string) {
    // try to parse JSON lines produced by the server logger
    try {
      const obj = JSON.parse(line);
      const ts = escapeHtml(obj.ts ?? '');
      const level = String(obj.level ?? '').toLowerCase();
      const msg = escapeHtml(obj.msg ?? '');
      let meta = '';
      if (obj.meta !== undefined) {
        try {
          meta = escapeHtml(typeof obj.meta === 'string' ? obj.meta : JSON.stringify(obj.meta));
        } catch (e) {
          meta = escapeHtml(String(obj.meta));
        }
      }

      const tsHtml = `<span class="ts">${markMatch(ts, q)}</span>`;
      const levelClass = `level level-${escapeHtml(level.replace(/[^a-z0-9_-]/g, ''))}`;
      const levelHtml = `<span class="${levelClass}">${markMatch(escapeHtml(level), q)}</span>`;
      const msgHtml = `<span class="msg">${markMatch(msg, q)}</span>`;
      const metaHtml = meta ? `<span class="meta"> ${markMatch(meta, q)}</span>` : '';

      return `${tsHtml} ${levelHtml} ${msgHtml}${metaHtml}`;
    } catch (e) {
      // not JSON — just escape and mark
      return markMatch(escapeHtml(line), q);
    }
  }

  function selectAllLogs() {
    const el = document.querySelector('.log-list') as HTMLElement | null;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  // expansion state for individual lines tracked by content hash
  let expanded = new Set<string>();
  let parsedObj: Record<string, any | null> = {};
  let viewModeObj: Record<string, 'pretty' | 'meta'> = {};

  function hashLine(s: string) {
    // djb2
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i);
    }
    // return hex string
    return (h >>> 0).toString(16);
  }

  function toggleExpandedByLine(line: string) {
    const h = hashLine(line);
    if (expanded.has(h)) {
      expanded.delete(h);
    } else {
      expanded.add(h);
      // parse and cache JSON if possible
      if (parsedObj[h] === undefined) {
        try {
          parsedObj[h] = JSON.parse(line);
        } catch (e) {
          parsedObj[h] = null;
        }
        parsedObj = { ...parsedObj };
      }
      if (viewModeObj[h] === undefined) {
        viewModeObj = { ...viewModeObj, [h]: 'pretty' };
      }
    }
    expanded = new Set(expanded);
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // small feedback could be added
    } catch (e) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function toggleViewModeForLine(line: string) {
    const h = hashLine(line);
    // ensure parsed is available so view change has effect
    if (parsedObj[h] === undefined) {
      try {
        parsedObj[h] = JSON.parse(line);
      } catch (e) {
        parsedObj[h] = null;
      }
      parsedObj = { ...parsedObj };
    }
    const cur = viewModeObj[h] ?? 'pretty';
    viewModeObj = { ...viewModeObj, [h]: cur === 'pretty' ? 'meta' : 'pretty' };
  }

  async function regeneratePanels() {
    status = 'Regenerating panels...';
    try {
      const res = await fetch('/api/admin/panels/regenerate', { method: 'POST', credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        status = 'Panels regenerated';
      } else {
        status = `Failed: ${data?.message ?? data?.error ?? res.statusText}`;
      }
    } catch (e: any) {
      status = `Error: ${String(e?.message ?? e)}`;
    }
    setTimeout(() => status = null, 4000);
  }
</script>

<section>
  <h2>Server logs</h2>
  <div style="margin-bottom:0.5rem">
    <label>Lines: <input type="number" bind:value={linesCount} min={10} max={2000} style="width:6rem" /></label>
    <button on:click={fetchLogs}>Refresh</button>
    <button on:click={downloadText}>Download</button>
  <!-- Regenerate panels button removed from Logs page (now on Upload page only) -->
    <button on:click={selectAllLogs} style="margin-left:0.5rem">Select all</button>
    <label style="margin-left:1rem">Search: <input bind:value={query} on:input={applyFilter} placeholder="text to highlight" /></label>
    <label style="margin-left:1rem"><input type="checkbox" bind:checked={rawMode} /> Raw textarea</label>
  </div>
  {#if status}
    <div class="status">{status}</div>
  {/if}

  {#if rawMode}
    <textarea rows="20" style="width:100%">{filtered.join('\n')}</textarea>
  {:else}
    <div class="log-list-outer">
      <div
        class="log-list"
        role="list"
      >
        {#each filtered as line}
        {@const h = hashLine(line)}
        <div class="log-entry" role="listitem">
          <div class="log-entry-button" role="button" tabindex="0" aria-expanded={expanded.has(h)} on:click={() => toggleExpandedByLine(line)} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleExpandedByLine(line)}>
          {#if expanded.has(h)}
            <div class="log-line expanded">
              {@html renderLine(line, query)}
              <div class="expanded-controls">
                <button on:click|stopPropagation={() => copyToClipboard(JSON.stringify(parsedObj[h] ?? line, null, 2))}>Copy JSON</button>
                <button on:click|stopPropagation={() => toggleViewModeForLine(line)}>{viewModeObj[h] === 'meta' ? 'Show Full' : 'Show Meta'}</button>
              </div>
              {#if viewModeObj[h] === 'pretty' && parsedObj[h]}
                <pre class="json">{JSON.stringify(parsedObj[h], null, 2)}</pre>
              {:else if viewModeObj[h] === 'meta' && parsedObj[h]}
                <pre class="json">{JSON.stringify(parsedObj[h].meta ?? parsedObj[h], null, 2)}</pre>
              {:else}
                <!-- fallback: raw line -->
                <pre class="json">{line}</pre>
              {/if}
            </div>
          {:else}
            <div class="log-line">{@html renderLine(line, query)}</div>
          {/if}
          </div>
        </div>
      {/each}
      </div>
    </div>
  {/if}
</section>

<!-- merged helper functions into the main script -->

<style>
  .log-list-outer { max-height:60vh; overflow:auto; }
  .log-list{overflow:auto;border:1px solid #ccc;padding:0.5rem;background:#0f0f10;color:#e6e6e6}
  .log-list .log-line{white-space:pre-wrap;margin:0;padding:0.1rem 0;color:#cfd8dc !important}
  :global(.log-list .log-line mark){background:gold !important;color:#000 !important;padding:0 0.15rem;border-radius:2px}

  /* structured parts (global because markup is generated via {@html}) */
  :global(.log-list .log-line .ts){color:#90caf9;margin-right:0.5rem}
  :global(.log-list .log-line .level){font-weight:700;margin-right:0.5rem;padding:0.08rem 0.25rem;border-radius:3px}
  :global(.log-list .log-line .level-level-error){background:#b71c1c;color:#fff}
  :global(.log-list .log-line .level-level-warn){background:#ff8f00;color:#000}
  :global(.log-list .log-line .level-level-info){background:#1e88e5;color:#fff}
  :global(.log-list .log-line .level-level-debug){background:#6a1b9a;color:#fff}
  :global(.log-list .log-line .msg){color:#e0e0e0}
  :global(.log-list .log-line .meta){color:#b0bec5;font-style:italic;margin-left:0.5rem}
  .status{color:crimson}

  .log-entry{padding:0.05rem 0;border-radius:3px}
  .log-entry-button{cursor:pointer}
  .log-entry-button:hover{background:rgba(255,255,255,0.02)}
  .log-entry-button:focus{outline:2px solid rgba(144,202,249,0.2)}
  .log-line.expanded{display:block}
  .expanded-controls{margin-top:0.25rem;display:flex;gap:0.5rem}
  .expanded-controls button{background:transparent;border:1px solid rgba(255,255,255,0.06);color:#cfd8dc;padding:0.25rem 0.5rem;border-radius:3px}
  .expanded-controls button:hover{border-color:rgba(255,255,255,0.12)}
  :global(.log-list .log-line .json){
    background:#071018;
    color:#bcd;
    display:block;
    padding:0.5rem;
    margin-top:0.25rem;
    border-left:3px solid rgba(255,255,255,0.04);
    white-space:pre-wrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace;
    font-size:0.85rem;
  }

</style>
