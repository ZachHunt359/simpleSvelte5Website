<script lang="ts">
  import { dndzone, dragHandleZone, dragHandle, setDebugMode, setFeatureFlag, FEATURE_FLAG_NAMES, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  // flatpickr styles (importing CSS so Vite bundles it)
  import 'flatpickr/dist/flatpickr.min.css';
  type DeviceType = 'desktop' | 'mobile' | 'other';
  // Accept separate arrays for existing and new files
  export let existingFiles: Array<{ name: string; webkitRelativePath: string; size?: number; type?: string }> = [];
  export let newFiles: Array<{ name: string; webkitRelativePath: string; size?: number; type?: string; id?: string }> = [];
  export let conflicts: { duplicates: string[], missing: string[], errors: string[] } = { duplicates: [], missing: [], errors: [] };
  export let orderMap: Record<string, any> = {};
  export const key: string = '';
  // When true show debug UI and console logs
  export let debug: boolean = false;

  // Debug: reactively log the full structure of newFiles whenever it changes (only when debug=true)
  $: if (debug) console.log('[ChapterTree] newFiles prop (reactive):', newFiles);

  // Shared chapter extraction function
  function extractChapter(path: string): string {
    // Robust: match chapter-N anywhere in the path
    const chapterMatch = path.match(/chapter-(\d+)/i);
    if (chapterMatch && chapterMatch[1]) return `Chapter ${chapterMatch[1]}`;
    return 'Uncategorized';
  }

  // Merge files by chapter/device, marking new files
  // Ensure newFiles have unique id for dndzone
  $: newFilesWithId = newFiles.map((f, i) => ({ ...f, id: f.id || `${f.webkitRelativePath || f.name}-${i}` }));
  $: chapterMap = (() => {
    type ChapterMap = Record<string, { desktop: any[]; mobile: any[]; other: any[] }>;
    const allFiles = [
      ...existingFiles.map(f => ({ ...f, _isNew: false })),
      ...newFilesWithId.map(f => ({ ...f, _isNew: true }))
    ];
    if (allFiles.length > 0) {
      const newChapterMap: ChapterMap = {};
      allFiles.forEach((file: any, idx: number) => {
        let path = (file.webkitRelativePath ?? file.name ?? '').toString();
        path = path.replace(/\\/g, '/');
        const chapter = extractChapter(path);
        let device: DeviceType = 'other';
        if (/\/desktop\//i.test(path)) device = 'desktop';
        else if (/\/mobile\//i.test(path)) device = 'mobile';
        let fileObj: any;
        if (device === 'other') {
          // Always copy all file properties for 'other' files
          fileObj = {
            name: file.name ?? path ?? `[Unknown file ${idx+1}]`,
            webkitRelativePath: file.webkitRelativePath ?? path ?? `[Unknown file ${idx+1}]`,
            id: file.id || `${path}-${idx}`,
            _isNew: file._isNew ?? false,
            size: file.size ?? 0,
            type: file.type ?? '',
            // Copy any additional properties
            ...file
          };
        } else {
          fileObj = {
            name: file.name,
            webkitRelativePath: file.webkitRelativePath,
            id: file.id || `${path}-${idx}`,
            _isNew: file._isNew ?? false,
            size: file.size ?? 0,
            type: file.type ?? '',
            ...file
          };
        }
        if (debug) console.log('[ChapterTree] file:', { path, chapter, device, fileObj });
        if (!newChapterMap[chapter]) newChapterMap[chapter] = { desktop: [], mobile: [], other: [] };
        (newChapterMap[chapter][device] as any[]).push(fileObj);
      });
      return newChapterMap;
    }
    return {};
  })();

  // Maintain an ordered list of chapters for dnd operations
  $: chapterList = Object.keys(chapterMap || {});

  // Build items array for the top-level chapter list (items must have `id`)
  $: chapterItems = chapterList.map(c => ({ id: slugifyChapterKey(c), title: c, [SHADOW_ITEM_MARKER_PROPERTY_NAME]: false }));

  // HTML5-based chapter drag state (fallback to avoid s-d-a keepOriginalElementInDom bug)
  let draggedChapterIndex: number | null = null;
  let dragOverChapterIndex: number | null = null;

  function chapterDragStart(e: DragEvent, idx: number) {
    draggedChapterIndex = idx;
    isChapterDragging = true;
    try { e.dataTransfer?.setData('text/plain', String(idx)); e.dataTransfer!.effectAllowed = 'move'; } catch (_) {}
    if (debug) console.log('[ChapterTree] chapterDragStart', idx);
  }

  function chapterDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    dragOverChapterIndex = idx;
    if (debug) console.log('[ChapterTree] chapterDragOver', idx);
  }

  function chapterDragEnd(e: DragEvent) {
    draggedChapterIndex = null;
    dragOverChapterIndex = null;
    isChapterDragging = false;
    if (debug) console.log('[ChapterTree] chapterDragEnd');
  }

  function handleChapterDropOnContainer(e: DragEvent) {
    // drop onto the container (end of list)
    chapterDrop(e, chapterItems.length);
  }

  function chapterDrop(e: DragEvent, targetIdx?: number) {
    e.preventDefault();
    const src = draggedChapterIndex ?? parseInt(e.dataTransfer?.getData('text/plain') || '-1');
    const dst = (typeof targetIdx === 'number') ? targetIdx : (dragOverChapterIndex ?? chapterItems.length);
    if (debug) console.log('[ChapterTree] chapterDrop src->dst', src, dst);
    if (src < 0 || dst < 0 || src === dst) {
      chapterDragEnd(e);
      return;
    }
    // build new chapter order and map
    const keys = chapterItems.map(it => it.title);
    const moved = keys.splice(src, 1)[0];
    keys.splice(dst > src ? dst - 1 : dst, 0, moved);
    const newMap: Record<string, any> = {};
    for (const k of keys) if (chapterMap[k]) newMap[k] = chapterMap[k];
    // Build orders payload
    const orders: Record<string, any> = {};
    Object.keys(newMap).forEach(ch => {
      const slug = slugifyChapterKey(ch);
      function mapEntry(f:any) {
        const rel = (f.webkitRelativePath || f.name || '').toString().replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
        const hasMeta = ('published' in f) || ('publishDate' in f);
        if (hasMeta) {
          const out: any = { path: rel };
          if ('published' in f) out.published = !!f.published;
          if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
          return out;
        }
        return rel;
      }
      orders[slug] = {
        desktop: (newMap[ch].desktop || []).map(mapEntry),
        mobile: (newMap[ch].mobile || []).map(mapEntry),
        other: (newMap[ch].other || []).map(mapEntry)
      };
    });
    // persist order and update UI
    dispatch('saveOrder', { orders });
    // apply immediately (no need to defer when not using the s-d-a top-level)
    chapterMap = { ...newMap };
    chapterDragEnd(e);
  }

  const dispatch = createEventDispatcher();

  // Prevent nested zones from handling while a chapter is being dragged
  let isChapterDragging = false;

  onMount(() => {
    // Enable internal library debug when component debug is enabled
    try {
      setDebugMode(true);
      // expose available feature flag names for debugging
      try { console.log('[ChapterTree] s-d-a FEATURE_FLAG_NAMES:', FEATURE_FLAG_NAMES); } catch (_) {}
      // enable computed-style-based bounding rect as a fallback for some browsers/layouts
      try { setFeatureFlag(FEATURE_FLAG_NAMES.USE_COMPUTED_STYLE_INSTEAD_OF_BOUNDING_RECT, true); } catch (_) {}
      console.warn('[ChapterTree] svelte-dnd-action debug and feature-flag enabled');
    } catch (_) {}
  });

  // Date/time picker state
  let openPickerId: string | null = null;
  const pickerInputs: Map<string, HTMLInputElement | null> = new Map();
  const fpInstances: Map<string, any> = new Map();

  onDestroy(() => {
    // destroy any remaining flatpickr instances
    for (const inst of fpInstances.values()) {
      try { inst.destroy(); } catch (_) {}
    }
    fpInstances.clear();
  });

  function slugifyChapterKey(key: string) {
    const m = key.match(/chapter\s*(\d+)/i);
    if (m && m[1]) return `chapter-${m[1]}`;
    return key.toLowerCase().replace(/\s+/g, '-');
  }

  // Helpers to read chapter-level metadata from orderMap
  function getChapterMeta(chapter: string) {
    const slug = slugifyChapterKey(chapter);
    return (orderMap && orderMap[slug]) || {};
  }

  function formatChapterSchedule(chapter: string) {
    const meta = getChapterMeta(chapter);
    if (!meta || !meta.publishDate) return null;
    try {
      const date = new Date(String(meta.publishDate));
      const tz = meta.publishTZ || undefined;
      // Use Intl to format in the saved timezone when available
      if (tz && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(date) + ` (${tz})`;
      }
      return date.toLocaleString();
    } catch (e) {
      return String(meta.publishDate);
    }
  }

  function isPanelOverride(file: any, chapter: string) {
    // If an individual panel is explicitly unpublished while the chapter is scheduled/published
    const meta = getChapterMeta(chapter);
    if (file && file.published === false) {
      if (meta && (meta.publishDate || meta.published)) return true;
    }
    return false;
  }

  // Compute the effective published state for a panel: explicit per-panel override wins,
  // then per-file publishDate if in the past, then chapter-level published/publishDate
  function getEffectivePublished(file: any, chapter: string) {
    if (!file) return false;
    if ('published' in file) return !!file.published;
    if (file.publishDate) {
      const pd = Date.parse(String(file.publishDate));
      if (!isNaN(pd) && pd <= Date.now()) return true;
      return false;
    }
    const meta = getChapterMeta(chapter) || {};
    if (meta && ('published' in meta) && meta.published === true) return true;
    if (meta && meta.publishDate) {
      const cp = Date.parse(String(meta.publishDate));
      if (!isNaN(cp) && cp <= Date.now()) return true;
    }
    return false;
  }

  function preventDragUnlessHandle(e: DragEvent) {
    try {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (!el.closest || !el.closest('.drag-handle') && !el.closest('.chapter-drag-handle')) {
        e.stopPropagation();
        e.preventDefault();
      }
    } catch (_) {}
  }

  // Save full order: dispatch 'saveOrder' with normalized mapping
  function saveFullOrder() {
    const orders: Record<string, any> = {};
    Object.keys(chapterMap).forEach(ch => {
      const slug = slugifyChapterKey(ch);
      // Preserve metadata if present (published/publishDate) by emitting objects for those entries
      function mapEntry(f:any) {
        const rel = (f.webkitRelativePath || f.name || '').toString().replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
        const hasMeta = ('published' in f) || ('publishDate' in f);
        if (hasMeta) {
          const out: any = { path: rel };
          if ('published' in f) out.published = !!f.published;
          if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
          return out;
        }
        return rel;
      }
      orders[slug] = {
        desktop: (chapterMap[ch].desktop || []).map(mapEntry),
        mobile: (chapterMap[ch].mobile || []).map(mapEntry),
        other: (chapterMap[ch].other || []).map(mapEntry)
      };
    });
    dispatch('saveOrder', { orders });
  }

  function handleDelete(file: any) {
    dispatch('delete', { file });
  }

  function handleTogglePublish(file: any) {
    dispatch('togglePublish', { file });
  }

  async function openSchedulePicker(file: any, chapter: string) {
    // Toggle same picker if already open
    if (openPickerId === file.id) {
      openPickerId = null;
      return;
    }
    openPickerId = file.id;
  await tick();
  // find the newly rendered input element by data attribute (avoids bind:this inline complications)
  const input = document.querySelector(`input[data-picker-id="${file.id}"]`) as HTMLInputElement | null;
  if (!input) return;
  pickerInputs.set(file.id, input);
    try {
      // @ts-ignore - dynamic import; flatpickr types may not be present at compile time
      const mod: any = await import('flatpickr');
      const flatpickr = mod && mod.default ? mod.default : mod;
      // ensure any previous instance is destroyed
      const prev = fpInstances.get(file.id);
      if (prev) { try { prev.destroy(); } catch (_) {} }
      const defaultDate = file.publishDate ? new Date(file.publishDate) : null;
  const inst = flatpickr(input, {
        enableTime: true,
        time_24hr: false,
        dateFormat: 'Y-m-d H:i',
        defaultDate,
        allowInput: true,
        onClose: (selectedDates: Date[], dateStr: string) => {
          // dateStr empty -> clear
          const publishDate = dateStr && dateStr.trim() ? new Date(dateStr).toISOString() : null;
          const publishTZ = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
          // dispatch with current chapter ordering so server can persist without losing order
          const slug = slugifyChapterKey(chapter);
          function mapEntryLocal(f:any) {
            const rel = (f.webkitRelativePath || f.name || '').toString().replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
            const hasMeta = ('published' in f) || ('publishDate' in f);
            if (hasMeta) {
              const out: any = { path: rel };
              if ('published' in f) out.published = !!f.published;
              if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
              return out;
            }
            return rel;
          }
          const ordersForChapter = {
            [slug]: {
              desktop: (chapterMap[chapter].desktop || []).map(mapEntryLocal),
              mobile: (chapterMap[chapter].mobile || []).map(mapEntryLocal),
              other: (chapterMap[chapter].other || []).map(mapEntryLocal)
            }
          };
          dispatch('setPublishDate', { file, publishDate, publishTZ, chapter, orders: ordersForChapter });
          openPickerId = null;
          try { inst.destroy(); } catch (_) {}
          fpInstances.delete(file.id);
        }
      });
      fpInstances.set(file.id, inst);
      // focus input for convenience
      input.focus();
    } catch (err) {
      console.warn('Failed to load flatpickr', err);
      // fallback to prompt
      const input = window.prompt('Publish date/time (ISO or local). Leave empty to clear.');
      if (input !== null) {
        const publishDate = input.trim() ? new Date(input).toISOString() : null;
        const publishTZ = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
        dispatch('setPublishDate', { file, publishDate, publishTZ, chapter });
      }
      openPickerId = null;
    }
  }

  function handleDeleteChapter(chapter: string) {
    dispatch('deleteChapter', { chapter });
  }

  function handleTogglePublishChapter(chapter: string) {
    dispatch('togglePublishChapter', { chapter });
  }

  // Collapsible state
  // Collapsible state: chapters with new files start expanded, others collapsed
  let openChapters: Record<string, boolean> = {};
  $: Object.keys(chapterMap).forEach(ch => {
    const hasNew = (['desktop', 'mobile', 'other'] as Array<DeviceType>).some(dev => ((chapterMap[ch][dev] as any[]) || []).some((f: any) => f._isNew));
    if (openChapters[ch] === undefined) openChapters[ch] = hasNew;
  });

  function toggleChapter(chapter: string) {
    openChapters[chapter] = !openChapters[chapter];
  }

  function getPanelStatus(file: any): string {
    const path = file.webkitRelativePath || file.name;
    if (conflicts.duplicates.some(dup => path.includes(dup))) return 'duplicate';
    if (conflicts.errors.some(err => err.includes(file.name))) return 'error';
    return file._isNew ? 'new' : 'ok';
  }

  // Chapter-level scheduling picker handling
  async function openSchedulePickerChapter(chapter: string) {
    const slug = slugifyChapterKey(chapter);
    const pickerId = `chapter-schedule-${slug}`;
    // Toggle
    if (openPickerId === pickerId) { openPickerId = null; return; }
    openPickerId = pickerId;
    await tick();
    const input = document.querySelector(`input[data-picker-id="${pickerId}"]`) as HTMLInputElement | null;
    if (!input) return;
    pickerInputs.set(pickerId, input);
    try {
      // @ts-ignore
      const mod: any = await import('flatpickr');
      const flatpickr = mod && mod.default ? mod.default : mod;
      const prev = fpInstances.get(pickerId);
      if (prev) { try { prev.destroy(); } catch (_) {} }
      const inst = flatpickr(input, {
        enableTime: true,
        time_24hr: false,
        dateFormat: 'Y-m-d H:i',
        allowInput: true,
        onClose: (selectedDates: Date[], dateStr: string) => {
          const publishDateIso = (selectedDates && selectedDates[0]) ? selectedDates[0].toISOString() : null;
          const publishTZ = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
          const slug = slugifyChapterKey(chapter);
          function mapEntryLocal(f:any) {
            const rel = (f.webkitRelativePath || f.name || '').toString().replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
            const hasMeta = ('published' in f) || ('publishDate' in f);
            if (hasMeta) {
              const out: any = { path: rel };
              if ('published' in f) out.published = !!f.published;
              if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
              return out;
            }
            return rel;
          }
          const ordersForChapter: any = {
            [slug]: {
              desktop: (chapterMap[chapter].desktop || []).map(mapEntryLocal),
              mobile: (chapterMap[chapter].mobile || []).map(mapEntryLocal),
              other: (chapterMap[chapter].other || []).map(mapEntryLocal)
            }
          };
          // Attach chapter-level publishDate/tz
          if (publishDateIso) {
            ordersForChapter[slug].publishDate = publishDateIso;
            if (publishTZ) ordersForChapter[slug].publishTZ = publishTZ;
          } else {
            // explicit clear
            ordersForChapter[slug].publishDate = null;
            ordersForChapter[slug].publishTZ = null;
          }
          dispatch('setPublishDate', { file: null, publishDate: publishDateIso, publishTZ, chapter, orders: ordersForChapter });
          openPickerId = null;
          try { inst.destroy(); } catch (_) {}
          fpInstances.delete(pickerId);
        }
      });
      fpInstances.set(pickerId, inst);
      input.focus();
    } catch (err) {
      console.warn('Failed to load flatpickr', err);
      const input = window.prompt('Publish date/time (ISO or local). Leave empty to clear.');
      if (input !== null) {
        const publishTZ = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
        const publishDateIso = input.trim() ? new Date(input).toISOString() : null;
        const slug = slugifyChapterKey(chapter);
        // local helper used in other branches; define here for the fallback path as well
        function mapEntryLocal(f:any) {
          const rel = (f.webkitRelativePath || f.name || '').toString().replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
          const hasMeta = ('published' in f) || ('publishDate' in f);
          if (hasMeta) {
            const out: any = { path: rel };
            if ('published' in f) out.published = !!f.published;
            if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
            return out;
          }
          return rel;
        }
        const ordersForChapter: any = {
          [slug]: {
            desktop: (chapterMap[chapter].desktop || []).map(mapEntryLocal),
            mobile: (chapterMap[chapter].mobile || []).map(mapEntryLocal),
            other: (chapterMap[chapter].other || []).map(mapEntryLocal)
          }
        };
        if (publishDateIso) { ordersForChapter[slug].publishDate = publishDateIso; ordersForChapter[slug].publishTZ = publishTZ; }
        dispatch('setPublishDate', { file: null, publishDate: publishDateIso, publishTZ, chapter, orders: ordersForChapter });
      }
      openPickerId = null;
    }
  }
</script>

  <div class="chapter-tree bg-slate-900 border border-slate-700 rounded-lg p-4">
    <h3 class="text-white font-medium mb-4">Upload Plan</h3>
    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;">
      <button class="btn btn-ghost btn-xs text-slate-300" on:click={saveFullOrder}>Save order</button>
    </div>
    <!-- Debug output for merged files and chapterMap -->
      {#if debug}
      <div class="debug-output bg-slate-800 text-xs text-slate-300 p-2 mb-2 rounded">
        <div><strong>existingFiles.length:</strong> {existingFiles.length}</div>
        <div><strong>newFiles.length:</strong> {newFiles.length}</div>
        <div><strong>existingFiles sample:</strong> {existingFiles.length > 0 ? JSON.stringify(existingFiles.slice(0,3), null, 2) : '[]'}</div>
        <div><strong>newFiles sample:</strong> {newFiles.length > 0 ? JSON.stringify(newFiles.slice(0,3), null, 2) : '[]'}</div>
        <div><strong>chapterMap keys:</strong> {Object.keys(chapterMap).join(', ')}</div>
        <div><strong>chapterMap sample:</strong> {Object.keys(chapterMap).length > 0 ? JSON.stringify(chapterMap, null, 2).slice(0, 400) + '...' : '{}'}</div>
      </div>
      {/if}
    {#if Object.keys(chapterMap).length === 0}
      <div class="text-slate-400 text-sm">No comic files found in /panels.</div>
    {:else}
  <div class="chapter-list" role="list" on:dragover|preventDefault on:drop={handleChapterDropOnContainer}>
  {#each chapterItems as item, idx (item.id)}
        {#if chapterMap[item.title]}
          <div class="mb-3" role="listitem" data-item-id={item.id} data-is-dnd-shadow-item-hint={item[SHADOW_ITEM_MARKER_PROPERTY_NAME]} on:dragover|preventDefault={(e) => chapterDragOver(e, idx)} on:drop={(e) => chapterDrop(e, idx)}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
              <span class="chapter-drag-handle" draggable="true" on:dragstart={(e) => chapterDragStart(e, idx)} on:dragend={chapterDragEnd} style="cursor:grab;padding:0.25rem 0.5rem;user-select:none" aria-label="drag chapter" role="button" tabindex="0">☰</span>
              <button class="chapter-toggle text-left py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 flex items-center" on:click={() => toggleChapter(item.title)}>
                <div style="display:flex;flex-direction:column;align-items:flex-start;">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="font-semibold text-lg text-slate-100">{item.title}</span>
                    {#if getChapterMeta(item.title).publishDate}
                      <span class="text-yellow-300 text-sm">Scheduled: {formatChapterSchedule(item.title)}</span>
                    {/if}
                    {#if getChapterMeta(item.title).published === false}
                      <span class="badge badge-error ml-2">Chapter Unpublished</span>
                    {:else if getChapterMeta(item.title).published}
                      <span class="badge badge-success ml-2">Chapter Published</span>
                    {/if}
                  </div>
                  <div class="text-slate-400 text-sm mt-1">{(chapterMap[item.title].desktop ?? []).length} desktop, {(chapterMap[item.title].mobile ?? []).length} mobile</div>
                </div>
                <span class="ml-2">{openChapters[item.title] ? '▼' : '▶'}</span>
              </button>
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <button class="btn btn-ghost btn-xs text-slate-300" on:click={() => handleTogglePublishChapter(item.title)}>{getChapterMeta(item.title).published ? 'Unpublish Chapter' : 'Publish Chapter'}</button>
                <button class="btn btn-ghost btn-xs text-slate-300" on:click={() => openSchedulePickerChapter(item.title)}>Schedule Chapter</button>
                <button class="btn btn-ghost btn-xs text-slate-300" on:click={() => dispatch('insertYouTube', { chapter: item.title })}>Insert YouTube</button>
                <button class="btn btn-ghost btn-xs text-red-500" on:click={() => handleDeleteChapter(item.title)}>Delete Chapter</button>
              </div>
              {#if openPickerId === `chapter-schedule-${slugifyChapterKey(item.title)}`}
                <input data-picker-id={`chapter-schedule-${slugifyChapterKey(item.title)}`} class="picker-input" placeholder="YYYY-MM-DD HH:mm" style="margin-left:0.5rem;padding:0.15rem 0.4rem;border-radius:4px;background:#111;color:#fff;border:1px solid #333;" />
              {/if}
            </div>
            {#if openChapters[item.title]}
              <div class="panel-list mt-2 ml-4">
                {#if debug}
                <!-- DEBUG: Show device array lengths and samples -->
                <div class="debug-output bg-slate-800 text-xs text-yellow-300 p-2 mb-2 rounded">
                  <div><strong>Desktop files:</strong> {(chapterMap[item.title].desktop ?? []).length} | Sample: {JSON.stringify((chapterMap[item.title].desktop ?? []).slice(0,2))}</div>
                  <div><strong>Mobile files:</strong> {(chapterMap[item.title].mobile ?? []).length} | Sample: {JSON.stringify((chapterMap[item.title].mobile ?? []).slice(0,2))}</div>
                  <div><strong>Other files:</strong> {(chapterMap[item.title].other ?? []).length} | Sample: {JSON.stringify((chapterMap[item.title].other ?? []).slice(0,2))}</div>
                </div>
                {/if}
                <!-- Always show all device groups, even if empty -->
                <div class="text-slate-400 text-xs mb-1">Desktop Panels:</div>
                <ul style="padding:0;list-style:none;margin:0;">
                  <li style="padding:0;margin:0;list-style:none;">
                    <div
                      use:dragHandleZone={{ items: (chapterMap[item.title].desktop ?? []), flipDurationMs: 150, morphDisabled: true, dragDisabled: isChapterDragging, dropFromOthersDisabled: isChapterDragging }}
                      on:consider={e => { chapterMap[item.title].desktop = e.detail.items; chapterMap = { ...chapterMap }; }}
                      on:finalize={e => { chapterMap[item.title].desktop = e.detail.items; chapterMap = { ...chapterMap }; dispatch('orderChange', { chapter: item.title, device: 'desktop', order: e.detail.items.map((f:any) => f.webkitRelativePath || f.name) }); }}
                      style="padding:0;margin:0;">
                      {#each (chapterMap[item.title].desktop ?? []) as file (file.id)}
                        <div class="panel-item {getPanelStatus(file)} {isPanelOverride(file, item.title) ? 'override-unpublished' : ''}" style="display:flex;align-items:center;justify-content:space-between;">
                          <div style="display:flex;align-items:center;">
                            <span class="drag-handle" use:dragHandle style="cursor:grab;margin-right:0.5rem;opacity:0.9" aria-label="drag panel">☰</span>
                            {#if /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)}
                              {#if file._isNew && file.preview}
                                <img src={file.preview} alt={file.name} class="panel-thumb" style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;" />
                              {:else}
                                <img src={"/panels/" + file.webkitRelativePath} alt={file.name} class="panel-thumb" style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;" />
                              {/if}
                            {:else}
                              <span class="file-icon" style="display:inline-block;width:48px;height:48px;background:#222;border-radius:4px;margin-right:0.5rem;text-align:center;line-height:48px;font-size:1.5em;color:#888;">📄</span>
                            {/if}
                            <span>{file.name}</span>
                            {#if getPanelStatus(file) === 'duplicate'}<span class="badge badge-warning ml-2">Duplicate</span>{/if}
                            {#if getPanelStatus(file) === 'error'}<span class="badge badge-error ml-2">Error</span>{/if}
                          </div>
                                    <div style="display:flex;gap:0.5rem;align-items:center;">
                                      <button class="btn btn-ghost btn-xs text-slate-300" on:click={() => handleTogglePublish(file)}>{getEffectivePublished(file, item.title) ? 'Unpublish' : 'Publish'}</button>
                                      <button class="btn btn-ghost btn-xs text-slate-300" on:click={() => openSchedulePicker(file, item.title)}>Schedule</button>
                                        {#if openPickerId === file.id}
                                          <input data-picker-id={file.id} class="picker-input" placeholder="YYYY-MM-DD HH:mm" style="margin-left:0.5rem;padding:0.15rem 0.4rem;border-radius:4px;background:#111;color:#fff;border:1px solid #333;" />
                                        {/if}
                                      <button class="btn btn-ghost btn-xs text-red-500" on:click={() => handleDelete(file)}>Delete</button>
                                    </div>
                        </div>
                      {/each}
                    </div>
                  </li>
                </ul>
                <div class="text-slate-400 text-xs mb-1 mt-2">Mobile Panels:</div>
                <ul style="padding:0;list-style:none;margin:0;">
                  <li style="padding:0;margin:0;list-style:none;">
                    <div
                      use:dragHandleZone={{ items: (chapterMap[item.title].mobile ?? []), flipDurationMs: 150, morphDisabled: true, dragDisabled: isChapterDragging, dropFromOthersDisabled: isChapterDragging }}
                      on:consider={e => { chapterMap[item.title].mobile = e.detail.items; chapterMap = { ...chapterMap }; }}
                      on:finalize={e => { chapterMap[item.title].mobile = e.detail.items; chapterMap = { ...chapterMap }; dispatch('orderChange', { chapter: item.title, device: 'mobile', order: e.detail.items.map((f:any) => f.webkitRelativePath || f.name) }); }}
                      style="padding:0;margin:0;">
                      {#each (chapterMap[item.title].mobile ?? []) as file (file.id)}
                        <div class="panel-item {getPanelStatus(file)} {isPanelOverride(file, item.title) ? 'override-unpublished' : ''}" style="display:flex;align-items:center;justify-content:space-between;">
                          <div style="display:flex;align-items:center;">
                            <span class="drag-handle" use:dragHandle style="cursor:grab;margin-right:0.5rem;opacity:0.9" aria-label="drag panel">☰</span>
                            <span>{file.name}</span>
                            {#if getPanelStatus(file) === 'duplicate'}<span class="badge badge-warning ml-2">Duplicate</span>{/if}
                            {#if getPanelStatus(file) === 'error'}<span class="badge badge-error ml-2">Error</span>{/if}
                          </div>
                          <div style="display:flex;gap:0.5rem;align-items:center;">
                            <button class="btn btn-ghost btn-xs text-slate-300" on:click={() => handleTogglePublish(file)}>{getEffectivePublished(file, item.title) ? 'Unpublish' : 'Publish'}</button>
                            <button class="btn btn-ghost btn-xs text-red-500" on:click={() => handleDelete(file)}>Delete</button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </li>
                </ul>
                <div class="text-slate-400 text-xs mb-1 mt-2">Other Files:</div>
                <ul style="padding:0;list-style:none;margin:0;">
                  <li style="padding:0;margin:0;list-style:none;">
                    <div
                      use:dragHandleZone={{ items: (chapterMap[item.title].other ?? []), flipDurationMs: 150, morphDisabled: true, dragDisabled: isChapterDragging, dropFromOthersDisabled: isChapterDragging }}
                      on:consider={e => { chapterMap[item.title].other = e.detail.items; chapterMap = { ...chapterMap }; }}
                      on:finalize={e => { chapterMap[item.title].other = e.detail.items; chapterMap = { ...chapterMap }; dispatch('orderChange', { chapter: item.title, device: 'other', order: e.detail.items.map((f:any) => f.webkitRelativePath || f.name) }); }}
                      style="padding:0;margin:0;">
                      {#each (chapterMap[item.title].other ?? []) as file (file.id)}
                        <div class="panel-item {getPanelStatus(file)} {isPanelOverride(file, item.title) ? 'override-unpublished' : ''}" style={getPanelStatus(file) === 'new' ? 'font-weight:bold;color:#22c55e;display:flex;align-items:center;justify-content:space-between;' : 'display:flex;align-items:center;justify-content:space-between;'}>
                          <div style="display:flex;align-items:center;">
                            <span class="drag-handle" use:dragHandle style="cursor:grab;margin-right:0.5rem;opacity:0.9" aria-label="drag panel">☰</span>
                            <div>{file.name || file.webkitRelativePath || '[Unknown]'}</div>
                          </div>
                          <div style="display:flex;gap:0.5rem;align-items:center;">
                            <button class="btn btn-ghost btn-xs text-slate-300" on:click={() => handleTogglePublish(file)}>{getEffectivePublished(file, item.title) ? 'Unpublish' : 'Publish'}</button>
                            <button class="btn btn-ghost btn-xs text-red-500" on:click={() => handleDelete(file)}>Delete</button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </li>
                </ul>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
      </div>
    {/if}
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
.override-unpublished {
  border-left: 3px solid #f87171;
  background: rgba(248,113,113,0.05);
}
.drag-handle {
  user-select: none;
}
.badge-warning {
  background: #fbbf24;
  color: #92400e;
}
.badge-error {
  background: #f87171;
  color: #7f1d1d;
}
.badge-success {
  background: #22c55e;
  color: #fff;
}
</style>
