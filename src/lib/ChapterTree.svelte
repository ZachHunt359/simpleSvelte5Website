<script lang="ts">
  import { dndzone, dragHandleZone, dragHandle, setDebugMode, setFeatureFlag, FEATURE_FLAG_NAMES, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  // flatpickr styles (importing CSS so Vite bundles it)
  import 'flatpickr/dist/flatpickr.min.css';
  type DeviceType = 'desktop' | 'mobile' | 'other';
  
  // Props using Svelte 5 $props() rune
  let {
    existingFiles = [],
    newFiles = [],
    conflicts = { duplicates: [], missing: [], errors: [] },
    orderMap = {},
    debug = false
  }: {
    existingFiles?: Array<{ name: string; webkitRelativePath: string; size?: number; type?: string }>;
    newFiles?: Array<{ name: string; webkitRelativePath: string; size?: number; type?: string; id?: string }>;
    conflicts?: { duplicates: string[], missing: string[], errors: string[] };
    orderMap?: Record<string, any>;
    debug?: boolean;
  } = $props();

  // Multi-select state (Phase 1.5)
  let selectedItems = $state(new Set<string>()); // Stores file IDs
  let lastSelectedIndex = $state<{ chapter: string; device: DeviceType; index: number } | null>(null);
  
  // Expand/collapse state for device sections
  let expandedSections = $state(new Map<string, boolean>()); // key: "chapter::device"
  
  // Image preview modal state
  let previewImageSrc = $state<string | null>(null);
  let previewImageAlt = $state<string>('');
  
  function showImagePreview(src: string, alt: string) {
    previewImageSrc = src;
    previewImageAlt = alt;
  }
  
  function hideImagePreview() {
    previewImageSrc = null;
    previewImageAlt = '';
  }
  
  function getSectionKey(chapter: string, device: DeviceType): string {
    return `${chapter}::${device}`;
  }
  
  function isSectionExpanded(chapter: string, device: DeviceType): boolean {
    const key = getSectionKey(chapter, device);
    // Default to expanded if not set
    return expandedSections.get(key) ?? true;
  }
  
  function toggleSection(chapter: string, device: DeviceType) {
    const key = getSectionKey(chapter, device);
    const currentState = expandedSections.get(key) ?? true;
    expandedSections.set(key, !currentState);
    // Force reactivity
    expandedSections = new Map(expandedSections);
  }
  
  // Helper to generate unique key for selection tracking
  function getFileKey(file: any, chapter: string, device: DeviceType): string {
    // Strip any suffix that svelte-dnd-action might have added (e.g., '-1')
    const baseId = file.id.replace(/-\d+$/, '');
    return `${chapter}::${device}::${baseId}`;
  }

  // Get all files as a flat array for range selection
  function getDeviceFiles(chapter: string, device: DeviceType): any[] {
    return chapterMap[chapter]?.[device] || [];
  }

  // Handle row click with modifier key support
  function handleRowClick(file: any, chapter: string, device: DeviceType, index: number, event: MouseEvent) {
    // Prevent text selection during shift/ctrl clicks
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
    
    const fileKey = getFileKey(file, chapter, device);
    const files = getDeviceFiles(chapter, device);
    
    if (event.shiftKey && lastSelectedIndex && lastSelectedIndex.chapter === chapter && lastSelectedIndex.device === device) {
      // Range selection within same chapter/device
      const start = Math.min(lastSelectedIndex.index, index);
      const end = Math.max(lastSelectedIndex.index, index);
      const newSelection = new Set(selectedItems);
      for (let i = start; i <= end; i++) {
        if (files[i]) {
          newSelection.add(getFileKey(files[i], chapter, device));
        }
      }
      selectedItems = newSelection;
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle single item
      const newSelection = new Set(selectedItems);
      if (newSelection.has(fileKey)) {
        newSelection.delete(fileKey);
      } else {
        newSelection.add(fileKey);
      }
      selectedItems = newSelection;
    } else {
      // Normal click - select only this one
      selectedItems = new Set([fileKey]);
    }
    
    lastSelectedIndex = { chapter, device, index };
  }

  // Toggle checkbox (for direct checkbox clicks)
  function handleCheckboxToggle(file: any, chapter: string, device: DeviceType, index: number) {
    const fileKey = getFileKey(file, chapter, device);
    const newSelection = new Set(selectedItems);
    if (newSelection.has(fileKey)) {
      newSelection.delete(fileKey);
    } else {
      newSelection.add(fileKey);
    }
    selectedItems = newSelection;
    lastSelectedIndex = { chapter, device, index };
  }

  // Select all in chapter/device
  function selectAllInDevice(chapter: string, device: DeviceType) {
    const files = getDeviceFiles(chapter, device);
    const newSelection = new Set(selectedItems);
    files.forEach(file => {
      newSelection.add(getFileKey(file, chapter, device));
    });
    selectedItems = newSelection;
  }

  // Clear all selections
  function clearSelection() {
    selectedItems = new Set();
    lastSelectedIndex = null;
  }

  // Get selected files for batch operations
  function getSelectedFiles(): Array<{ file: any; chapter: string; device: DeviceType }> {
    const result: Array<{ file: any; chapter: string; device: DeviceType }> = [];
    for (const key of selectedItems) {
      const [chapter, device, fileId] = key.split('::');
      const files = getDeviceFiles(chapter, device as DeviceType);
      // Match by stripping the suffix from file.id (since getFileKey strips it when creating the selection key)
      const file = files.find(f => {
        const baseId = f.id.replace(/-\d+$/, '');
        return baseId === fileId;
      });
      if (file) {
        result.push({ file, chapter, device: device as DeviceType });
      }
    }
    return result;
  }

  // Batch delete selected panels
  async function handleBatchDelete() {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    if (!confirm(`Delete ${count} selected panel${count !== 1 ? 's' : ''}?`)) return;
    
    const selected = getSelectedFiles();
    // Dispatch batch delete event with all files at once to avoid race conditions
    dispatch('batchDelete', { files: selected.map(s => s.file) });
    clearSelection();
  }

  // Keyboard accessibility handler for panel rows
  function handleRowKeyDown(file: any, chapter: string, device: DeviceType, index: number, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Convert to MouseEvent-like object with modifier keys
      handleRowClick(file, chapter, device, index, event as any);
    }
  }

  // Debug: reactively log the full structure of newFiles whenever it changes (only when debug=true)
  $effect(() => {
    if (debug) console.log('[ChapterTree] newFiles prop (reactive):', newFiles);
  });

  // Shared chapter extraction function
  function extractChapter(path: string): string {
    // Robust: match chapter-N anywhere in the path
    const chapterMatch = path.match(/chapter-(\d+)/i);
    if (chapterMatch && chapterMatch[1]) return `Chapter ${chapterMatch[1]}`;
    return 'Uncategorized';
  }

  // Merge files by chapter/device, marking new files
  // Ensure newFiles have unique id for dndzone
  let newFilesWithId = $derived(newFiles.map((f, i) => ({ ...f, id: f.id || `${f.webkitRelativePath || f.name}-${i}` })));
  let chapterMap = $derived.by(() => {
    console.log('🔄 [TREE] chapterMap recalculating...', {
      existingFilesCount: existingFiles.length,
      newFilesCount: newFiles.length
    });
    
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
        // Respect explicit chapter placement (e.g., from _order.json), otherwise infer from path
        const chapter = file._chapter || extractChapter(path);
        // Respect explicit device placement (e.g., from _order.json), otherwise infer from path
        let device: DeviceType = file._device || 'other';
        if (!file._device) {
          // Look for "desktop" or "mobile" as whole words anywhere in path (case-insensitive)
          // This handles nested folders like "Chapter-1/Desktop/SUBFOLDER/Spread01/..."
          if (/\bdesktop\b/i.test(path)) device = 'desktop';
          else if (/\bmobile\b/i.test(path)) device = 'mobile';
        }
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
      
      console.log('✅ [TREE] chapterMap recalculated:', {
        chapters: Object.keys(newChapterMap),
        totalFiles: allFiles.length
      });
      
      return newChapterMap;
    }
    return {};
  });

  // Maintain an ordered list of chapters for dnd operations
  let chapterList = $derived(Object.keys(chapterMap || {}));

  // Build items array for the top-level chapter list (items must have `id`)
  let chapterItems = $derived(chapterList.map(c => ({ id: slugifyChapterKey(c), title: c, [SHADOW_ITEM_MARKER_PROPERTY_NAME]: false })));

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
  let isChapterDragging = $state(false);

  // Multi-select drag state (Phase 1.5)
  let draggedFileId = $state<string | null>(null);
  let dragContext = $state<{ chapter: string; device: DeviceType } | null>(null);
  let selectedItemsOriginalOrder = $state<string[] | null>(null); // Capture original order of IDs
  let selectedItemsSnapshot = $state<any[] | null>(null); // Capture actual item objects

  // Handler for consider/finalize events with multi-select support
  // STRATEGY (Option 5): Separate logic for during-drag vs on-drop
  // - During drag (onconsider): Return items unchanged, let svelte-dnd-action handle single item
  // - On drop (onfinalize): Reconstruct array with ALL selected items at drop position
  function handleConsiderWithSelection(
    chapter: string, 
    device: DeviceType, 
    items: any[],
    eventInfo?: any
  ): any[] {
    // Detect which item is being dragged
    const draggedId = eventInfo?.id || eventInfo?.info?.id;
    
    if (!draggedId) {
      return items; // No drag info, return unchanged
    }
    
    // Check if dragged item is part of a multi-selection
    const baseDraggedId = draggedId.replace(/-\d+$/, '');
    const fileKey = `${chapter}::${device}::${baseDraggedId}`;
    
    const selectedInThisDevice = Array.from(selectedItems).filter(key => 
      key.startsWith(`${chapter}::${device}::`)
    );
    
    if (selectedInThisDevice.length <= 1 || !selectedItems.has(fileKey)) {
      // Not a multi-select drag - reset tracking and return unchanged
      draggedFileId = null;
      dragContext = null;
      selectedItemsOriginalOrder = null;
      selectedItemsSnapshot = null;
      return items;
    }
    
    // Multi-select drag detected!
    const selectedIds = new Set(selectedInThisDevice.map(key => key.split('::')[2]));
    
    // On first drag event, capture the original selected items
    const isNewDrag = draggedFileId !== draggedId;
    if (isNewDrag) {
      draggedFileId = draggedId;
      dragContext = { chapter, device };
      
      // Capture ALL selected items from chapterMap (before any modifications)
      const originalFiles = chapterMap[chapter]?.[device] || [];
      selectedItemsSnapshot = originalFiles.filter(it => {
        const baseId = it.id.replace(/-\d+$/, '');
        return selectedIds.has(it.id) || selectedIds.has(baseId);
      });
      
      selectedItemsOriginalOrder = selectedItemsSnapshot.map(it => it.id.replace(/-\d+$/, ''));
    }
    
    // Check if we're on FINALIZE (no shadow item means drag ended)
    const shadowIndex = items.findIndex(it => it[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
    
    if (shadowIndex === -1) {
      // FINALIZE: Dragged item is back in the array, reconstruct with all selected items together
      // Find where the dragged item ended up
      const draggedItemIndex = items.findIndex(it => {
        const baseId = it.id.replace(/-\d+$/, '');
        return baseId === baseDraggedId || it.id === draggedId;
      });
      
      if (draggedItemIndex === -1 || !selectedItemsSnapshot) {
        console.warn('🎯 [MULTI-SELECT] Could not find dragged item on finalize');
        return items;
      }
      
      // Get the dragged item
      const draggedItem = items[draggedItemIndex];
      
      // Remove ALL selected items from the array (including dragged item)
      const unselectedItems = items.filter(it => {
        const baseId = it.id.replace(/-\d+$/, '');
        return !selectedIds.has(it.id) && !selectedIds.has(baseId);
      });
      
      // Calculate where to insert: count unselected items before where dragged item was
      let insertPosition = 0;
      for (let i = 0; i < draggedItemIndex; i++) {
        const baseId = items[i].id.replace(/-\d+$/, '');
        if (!selectedIds.has(items[i].id) && !selectedIds.has(baseId)) {
          insertPosition++;
        }
      }
      
      // Rebuild array with ALL selected items at the drop position, in original order
      const finalArray = [
        ...unselectedItems.slice(0, insertPosition),
        ...selectedItemsSnapshot, // All selected items in their original relative order
        ...unselectedItems.slice(insertPosition)
      ];
      
      return finalArray;
    }
    
    // DURING DRAG: Just return items unchanged
    // Let svelte-dnd-action handle the single-item drag visually
    // We'll consolidate everything on finalize
    return items;
  }

  // Reset drag tracking when drag ends
  function endDrag() {
    draggedFileId = null;
    dragContext = null;
    selectedItemsOriginalOrder = null;
    selectedItemsSnapshot = null;
  }

  onMount(() => {
    // Disable svelte-dnd-action debug to reduce console noise
    try {
      setDebugMode(false);
      // enable computed-style-based bounding rect as a fallback for some browsers/layouts
      try { setFeatureFlag(FEATURE_FLAG_NAMES.USE_COMPUTED_STYLE_INSTEAD_OF_BOUNDING_RECT, true); } catch (_) {}
    } catch (_) {}
  });

  // Date/time picker state
  let openPickerId = $state<string | null>(null);
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

  // Shared helper to map file entries for order saving
  // Preserves YouTube entries, published flags, and publishDate metadata
  // cleanPath: if true, remove /panels/ prefix and ?v= query params
  function mapOrderEntry(f: any, cleanPath = false) {
    // Handle YouTube entries specially
    if (f.type === 'youtube' && (f.youtubeId || f.id)) {
      return { type: 'youtube', id: f.youtubeId || f.id, title: f.title, published: f.published || false };
    }
    
    let path = (f.webkitRelativePath || f.name || '').toString();
    if (cleanPath) {
      path = path.replace(/^\/panels\//, '').replace(/\?v=.*$/, '');
    }
    
    // Check if there's any metadata to preserve
    const hasMeta = ('published' in f) || ('publishDate' in f);
    if (hasMeta) {
      const out: any = { path };
      if ('published' in f) out.published = !!f.published;
      if ('publishDate' in f && f.publishDate) out.publishDate = f.publishDate;
      return out;
    }
    
    // Otherwise save as string (existing files default to published in generation script)
    return path;
  }

  // Save full order: dispatch 'saveOrder' with normalized mapping
  function saveFullOrder() {
    const orders: Record<string, any> = {};
    Object.keys(chapterMap).forEach(ch => {
      const slug = slugifyChapterKey(ch);
      orders[slug] = {
        desktop: (chapterMap[ch].desktop || []).map(f => mapOrderEntry(f)),
        mobile: (chapterMap[ch].mobile || []).map(f => mapOrderEntry(f)),
        other: (chapterMap[ch].other || []).map(f => mapOrderEntry(f))
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
          const ordersForChapter = {
            [slug]: {
              desktop: (chapterMap[chapter].desktop || []).map(f => mapOrderEntry(f, true)),
              mobile: (chapterMap[chapter].mobile || []).map(f => mapOrderEntry(f, true)),
              other: (chapterMap[chapter].other || []).map(f => mapOrderEntry(f, true))
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
  let openChapters = $state<Record<string, boolean>>({});
  $effect(() => {
    Object.keys(chapterMap).forEach(ch => {
      const hasNew = (['desktop', 'mobile', 'other'] as Array<DeviceType>).some(dev => ((chapterMap[ch][dev] as any[]) || []).some((f: any) => f._isNew));
      if (openChapters[ch] === undefined) openChapters[ch] = hasNew;
    });
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
          const ordersForChapter: any = {
            [slug]: {
              desktop: (chapterMap[chapter].desktop || []).map(f => mapOrderEntry(f, true)),
              mobile: (chapterMap[chapter].mobile || []).map(f => mapOrderEntry(f, true)),
              other: (chapterMap[chapter].other || []).map(f => mapOrderEntry(f, true))
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
        const ordersForChapter: any = {
          [slug]: {
            desktop: (chapterMap[chapter].desktop || []).map(f => mapOrderEntry(f, true)),
            mobile: (chapterMap[chapter].mobile || []).map(f => mapOrderEntry(f, true)),
            other: (chapterMap[chapter].other || []).map(f => mapOrderEntry(f, true))
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
    <h3 class="text-white font-medium mb-4">Current Comic File Tree</h3>
    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;">
      <button class="btn btn-ghost btn-xs text-slate-300" onclick={saveFullOrder}>Save order</button>
      <span class="text-xs text-slate-400">(Saves file order only - does not upload files)</span>
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
  <div class="chapter-list" role="list" ondragover={(e) => e.preventDefault()} ondrop={handleChapterDropOnContainer}>
  {#each chapterItems as item, idx (item.id)}
        {#if chapterMap[item.title]}
          <div class="mb-3" role="listitem" data-item-id={item.id} data-is-dnd-shadow-item-hint={item[SHADOW_ITEM_MARKER_PROPERTY_NAME]} ondragover={(e) => { e.preventDefault(); chapterDragOver(e, idx); }} ondrop={(e) => chapterDrop(e, idx)}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
              <span class="chapter-drag-handle" draggable="true" ondragstart={(e) => chapterDragStart(e, idx)} ondragend={chapterDragEnd} style="cursor:grab;padding:0.25rem 0.5rem;user-select:none" aria-label="drag chapter" role="button" tabindex="0">☰</span>
              <button class="chapter-toggle text-left py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 flex items-center" onclick={() => toggleChapter(item.title)}>
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
                <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => handleTogglePublishChapter(item.title)}>{getChapterMeta(item.title).published ? 'Unpublish Chapter' : 'Publish Chapter'}</button>
                <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => openSchedulePickerChapter(item.title)}>Schedule Chapter</button>
                <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => dispatch('insertYouTube', { chapter: item.title })}>Insert YouTube</button>
                <button class="btn btn-ghost btn-xs text-red-500" onclick={() => handleDeleteChapter(item.title)}>Delete Chapter</button>
              </div>
              {#if openPickerId === `chapter-schedule-${slugifyChapterKey(item.title)}`}
                <input data-picker-id={`chapter-schedule-${slugifyChapterKey(item.title)}`} class="picker-input" placeholder="YYYY-MM-DD HH:mm" style="margin-left:0.5rem;padding:0.15rem 0.4rem;border-radius:4px;background:#111;color:#fff;border:1px solid #333;" />
              {/if}
            </div>
            {#if openChapters[item.title]}
              <div class="panel-list mt-2 ml-4">
                <!-- Multi-select controls (Phase 1.5) - Always visible -->
                <div class="selection-controls" style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:#1e293b;border-radius:0.5rem;margin-bottom:1rem;">
                  <span class="text-blue-300 font-semibold">
                    {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                  </span>
                  {#if selectedItems.size > 0}
                    <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => clearSelection()}>Clear Selection</button>
                    <button class="btn btn-ghost btn-xs text-red-500" onclick={() => handleBatchDelete()}>Delete Selected</button>
                  {/if}
                </div>
                
                {#if debug}
                <!-- DEBUG: Show device array lengths and samples -->
                <div class="debug-output bg-slate-800 text-xs text-yellow-300 p-2 mb-2 rounded">
                  <div><strong>Desktop files:</strong> {(chapterMap[item.title].desktop ?? []).length} | Sample: {JSON.stringify((chapterMap[item.title].desktop ?? []).slice(0,2))}</div>
                  <div><strong>Mobile files:</strong> {(chapterMap[item.title].mobile ?? []).length} | Sample: {JSON.stringify((chapterMap[item.title].mobile ?? []).slice(0,2))}</div>
                  <div><strong>Other files:</strong> {(chapterMap[item.title].other ?? []).length} | Sample: {JSON.stringify((chapterMap[item.title].other ?? []).slice(0,2))}</div>
                </div>
                {/if}
                <!-- Always show all device groups, even if empty -->
                <!-- Other Files section first for quick access -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <button 
                      class="btn btn-ghost btn-xs" 
                      onclick={() => toggleSection(item.title, 'other')}
                      aria-label={isSectionExpanded(item.title, 'other') ? 'Collapse other files' : 'Expand other files'}
                    >
                      {isSectionExpanded(item.title, 'other') ? '▼' : '▶'}
                    </button>
                    <div class="text-slate-400 text-xs">Other Files: ({(chapterMap[item.title].other ?? []).length})</div>
                  </div>
                  <button 
                    class="btn btn-ghost btn-xs text-blue-400" 
                    onclick={() => selectAllInDevice(item.title, 'other')}
                    disabled={(chapterMap[item.title].other ?? []).length === 0}
                  >
                    Select All Other
                  </button>
                </div>
                {#if isSectionExpanded(item.title, 'other')}
                <ul style="padding:0;list-style:none;margin:0;">
                  <li style="padding:0;margin:0;list-style:none;">
                    <div
                      use:dragHandleZone={{ items: (chapterMap[item.title].other ?? []), flipDurationMs: 150, morphDisabled: true, dragDisabled: isChapterDragging, dropFromOthersDisabled: isChapterDragging }}
                      onconsider={e => { 
                        const adjustedItems = handleConsiderWithSelection(item.title, 'other', e.detail.items, e.detail.info);
                        chapterMap[item.title].other = adjustedItems; 
                        chapterMap = { ...chapterMap }; 
                      }}
                      onfinalize={e => { 
                        console.log('🎯 [TREE] OTHER finalize START:', item.title);
                        const adjustedItems = handleConsiderWithSelection(item.title, 'other', e.detail.items, e.detail.info);
                        chapterMap[item.title].other = adjustedItems; 
                        chapterMap = { ...chapterMap }; 
                        const order = adjustedItems.map(f => mapOrderEntry(f));
                        console.log('📤 [TREE] Dispatching orderChange:', { chapter: item.title, device: 'other', orderLength: order.length });
                        dispatch('orderChange', { chapter: item.title, device: 'other', order }); 
                        endDrag();
                      }}
                      style="padding:0;margin:0;"
                    >
                      {#each (chapterMap[item.title].other ?? []) as file, fileIndex (file.id)}
                        <div 
                          role="button"
                          tabindex="0"
                          class="panel-item {getPanelStatus(file)} {isPanelOverride(file, item.title) ? 'override-unpublished' : ''} {selectedItems.has(getFileKey(file, item.title, 'other')) ? 'selected' : ''}" 
                          style="{getPanelStatus(file) === 'new' ? 'font-weight:bold;color:#22c55e;' : ''}display:flex;align-items:center;justify-content:space-between;padding:0.5rem;cursor:pointer;transition:background-color 0.15s;user-select:none;{selectedItems.has(getFileKey(file, item.title, 'other')) ? 'background-color:rgba(59, 130, 246, 0.2);' : ''}"
                          onclick={(e) => handleRowClick(file, item.title, 'other', fileIndex, e)}
                          onkeydown={(e) => handleRowKeyDown(file, item.title, 'other', fileIndex, e)}
                        >
                          <div style="display:flex;align-items:center;">
                            <input 
                              type="checkbox" 
                              checked={selectedItems.has(getFileKey(file, item.title, 'other'))}
                              onclick={(e) => { e.stopPropagation(); handleCheckboxToggle(file, item.title, 'other', fileIndex) }}
                              style="margin-right:0.5rem;cursor:pointer;width:16px;height:16px;"
                              aria-label="Select panel"
                            />
                            <span class="drag-handle" use:dragHandle style="cursor:grab;margin-right:0.5rem;opacity:0.9" aria-label="drag panel">☰</span>
                            {#if file.type === 'youtube' && (file.youtubeId || file.id)}
                              <span class="youtube-icon" style="display:inline-block;width:48px;height:48px;background:#ff0000;border-radius:4px;margin-right:0.5rem;text-align:center;line-height:48px;font-size:1.5em;color:#fff;">▶</span>
                              <div style="flex:1;">
                                <div style="color:#ef4444;font-weight:500;">{file.title || `YouTube: ${file.youtubeId || file.id}`}</div>
                                <div style="font-size:0.8em;color:#94a3b8;">https://youtube.com/watch?v={file.youtubeId || file.id}</div>
                              </div>
                            {:else if /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)}
                              {#if file._isNew && file.preview}
                                <img 
                                  src={file.preview} 
                                  alt={file.name} 
                                  class="panel-thumb" 
                                  style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;cursor:zoom-in;" 
                                  onmouseenter={() => showImagePreview(file.preview, file.name)}
                                  onmouseleave={() => hideImagePreview()}
                                />
                              {:else}
                                <img 
                                  src={"/panels/" + file.webkitRelativePath} 
                                  alt={file.name} 
                                  class="panel-thumb" 
                                  style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;cursor:zoom-in;" 
                                  onmouseenter={() => showImagePreview("/panels/" + file.webkitRelativePath, file.name)}
                                  onmouseleave={() => hideImagePreview()}
                                />
                              {/if}
                              <div>{file.name || file.webkitRelativePath || '[Unknown]'}</div>
                            {:else}
                              <span class="file-icon" style="display:inline-block;width:48px;height:48px;background:#222;border-radius:4px;margin-right:0.5rem;text-align:center;line-height:48px;font-size:1.5em;color:#888;">📄</span>
                              <div>{file.name || file.webkitRelativePath || '[Unknown]'}</div>
                            {/if}
                          </div>
                          <div style="display:flex;gap:0.5rem;align-items:center;">
                            {#if file.type === 'youtube' && (file.youtubeId || file.id)}
                              <button class="btn btn-ghost btn-xs text-blue-400" onclick={() => window.open(`https://youtube.com/watch?v=${file.youtubeId || file.id}`, '_blank')}>Preview</button>
                            {/if}
                            <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => handleTogglePublish(file)}>{getEffectivePublished(file, item.title) ? 'Unpublish' : 'Publish'}</button>
                            <button class="btn btn-ghost btn-xs text-red-500" onclick={() => handleDelete(file)}>Delete</button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </li>
                </ul>
                {/if}
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem;margin-bottom:0.5rem;">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <button 
                      class="btn btn-ghost btn-xs" 
                      onclick={() => toggleSection(item.title, 'desktop')}
                      aria-label={isSectionExpanded(item.title, 'desktop') ? 'Collapse desktop panels' : 'Expand desktop panels'}
                    >
                      {isSectionExpanded(item.title, 'desktop') ? '▼' : '▶'}
                    </button>
                    <div class="text-slate-400 text-xs">Desktop Panels: ({(chapterMap[item.title].desktop ?? []).length})</div>
                  </div>
                  <button 
                    class="btn btn-ghost btn-xs text-blue-400" 
                    onclick={() => selectAllInDevice(item.title, 'desktop')}
                    disabled={(chapterMap[item.title].desktop ?? []).length === 0}
                  >
                    Select All Desktop
                  </button>
                </div>
                {#if isSectionExpanded(item.title, 'desktop')}
                <ul style="padding:0;list-style:none;margin:0;">
                  <li style="padding:0;margin:0;list-style:none;">
                    <div
                      use:dragHandleZone={{ items: (chapterMap[item.title].desktop ?? []), flipDurationMs: 150, morphDisabled: true, dragDisabled: isChapterDragging, dropFromOthersDisabled: isChapterDragging }}
                      onconsider={e => { 
                        const adjustedItems = handleConsiderWithSelection(item.title, 'desktop', e.detail.items, e.detail.info);
                        chapterMap[item.title].desktop = adjustedItems; 
                        chapterMap = { ...chapterMap }; 
                      }}
                      onfinalize={e => { 
                        console.log('🎯 [TREE] DESKTOP finalize START:', item.title);
                        const adjustedItems = handleConsiderWithSelection(item.title, 'desktop', e.detail.items, e.detail.info);
                        chapterMap[item.title].desktop = adjustedItems; 
                        chapterMap = { ...chapterMap }; 
                        const order = adjustedItems.map(f => mapOrderEntry(f));
                        console.log('📤 [TREE] Dispatching orderChange:', { chapter: item.title, device: 'desktop', orderLength: order.length });
                        dispatch('orderChange', { chapter: item.title, device: 'desktop', order }); 
                        endDrag();
                      }}
                      style="padding:0;margin:0;"
                    >
                      {#each (chapterMap[item.title].desktop ?? []) as file, fileIndex (file.id)}
                        <div 
                          role="button"
                          tabindex="0"
                          class="panel-item {getPanelStatus(file)} {isPanelOverride(file, item.title) ? 'override-unpublished' : ''} {selectedItems.has(getFileKey(file, item.title, 'desktop')) ? 'selected' : ''}"
                          style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem;cursor:pointer;transition:background-color 0.15s;user-select:none;{selectedItems.has(getFileKey(file, item.title, 'desktop')) ? 'background-color:rgba(59, 130, 246, 0.2);' : ''}"
                          onclick={(e) => handleRowClick(file, item.title, 'desktop', fileIndex, e)}
                          onkeydown={(e) => handleRowKeyDown(file, item.title, 'desktop', fileIndex, e)}
                        >
                          <div style="display:flex;align-items:center;">
                            <input 
                              type="checkbox" 
                              checked={selectedItems.has(getFileKey(file, item.title, 'desktop'))}
                              onclick={(e) => { e.stopPropagation(); handleCheckboxToggle(file, item.title, 'desktop', fileIndex) }}
                              style="margin-right:0.5rem;cursor:pointer;width:16px;height:16px;"
                              aria-label="Select panel"
                            />
                            <span class="drag-handle" use:dragHandle style="cursor:grab;margin-right:0.5rem;opacity:0.9" aria-label="drag panel">☰</span>
                            {#if file.type === 'youtube' && (file.youtubeId || file.id)}
                              <span class="youtube-icon" style="display:inline-block;width:48px;height:48px;background:#ff0000;border-radius:4px;margin-right:0.5rem;text-align:center;line-height:48px;font-size:1.5em;color:#fff;">▶</span>
                              <div style="flex:1;">
                                <div style="color:#ef4444;font-weight:500;">{file.title || `YouTube: ${file.youtubeId || file.id}`}</div>
                                <div style="font-size:0.8em;color:#94a3b8;">https://youtube.com/watch?v={file.youtubeId || file.id}</div>
                              </div>
                            {:else if /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)}
                              {#if file._isNew && file.preview}
                                <img 
                                  src={file.preview} 
                                  alt={file.name} 
                                  class="panel-thumb" 
                                  style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;cursor:zoom-in;" 
                                  onmouseenter={() => showImagePreview(file.preview, file.name)}
                                  onmouseleave={() => hideImagePreview()}
                                />
                              {:else}
                                <img 
                                  src={"/panels/" + file.webkitRelativePath} 
                                  alt={file.name} 
                                  class="panel-thumb" 
                                  style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;cursor:zoom-in;" 
                                  onmouseenter={() => showImagePreview("/panels/" + file.webkitRelativePath, file.name)}
                                  onmouseleave={() => hideImagePreview()}
                                />
                              {/if}
                              <span>{file.name}</span>
                            {:else}
                              <span class="file-icon" style="display:inline-block;width:48px;height:48px;background:#222;border-radius:4px;margin-right:0.5rem;text-align:center;line-height:48px;font-size:1.5em;color:#888;">📄</span>
                              <span>{file.name}</span>
                            {/if}
                            {#if getPanelStatus(file) === 'duplicate'}<span class="badge badge-warning ml-2">Duplicate</span>{/if}
                            {#if getPanelStatus(file) === 'error'}<span class="badge badge-error ml-2">Error</span>{/if}
                          </div>
                                    <div style="display:flex;gap:0.5rem;align-items:center;">
                                      {#if file.type === 'youtube' && (file.youtubeId || file.id)}
                                        <button class="btn btn-ghost btn-xs text-blue-400" onclick={() => window.open(`https://youtube.com/watch?v=${file.youtubeId || file.id}`, '_blank')}>Preview</button>
                                      {/if}
                                      <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => handleTogglePublish(file)}>{getEffectivePublished(file, item.title) ? 'Unpublish' : 'Publish'}</button>
                                      <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => openSchedulePicker(file, item.title)}>Schedule</button>
                                        {#if openPickerId === file.id}
                                          <input data-picker-id={file.id} class="picker-input" placeholder="YYYY-MM-DD HH:mm" style="margin-left:0.5rem;padding:0.15rem 0.4rem;border-radius:4px;background:#111;color:#fff;border:1px solid #333;" />
                                        {/if}
                                      <button class="btn btn-ghost btn-xs text-red-500" onclick={() => handleDelete(file)}>Delete</button>
                                    </div>
                        </div>
                      {/each}
                    </div>
                  </li>
                </ul>
                {/if}
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem;margin-bottom:0.5rem;">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <button 
                      class="btn btn-ghost btn-xs" 
                      onclick={() => toggleSection(item.title, 'mobile')}
                      aria-label={isSectionExpanded(item.title, 'mobile') ? 'Collapse mobile panels' : 'Expand mobile panels'}
                    >
                      {isSectionExpanded(item.title, 'mobile') ? '▼' : '▶'}
                    </button>
                    <div class="text-slate-400 text-xs">Mobile Panels: ({(chapterMap[item.title].mobile ?? []).length})</div>
                  </div>
                  <button 
                    class="btn btn-ghost btn-xs text-blue-400" 
                    onclick={() => selectAllInDevice(item.title, 'mobile')}
                    disabled={(chapterMap[item.title].mobile ?? []).length === 0}
                  >
                    Select All Mobile
                  </button>
                </div>
                {#if isSectionExpanded(item.title, 'mobile')}
                <ul style="padding:0;list-style:none;margin:0;">
                  <li style="padding:0;margin:0;list-style:none;">
                    <div
                      use:dragHandleZone={{ items: (chapterMap[item.title].mobile ?? []), flipDurationMs: 150, morphDisabled: true, dragDisabled: isChapterDragging, dropFromOthersDisabled: isChapterDragging }}
                      onconsider={e => { 
                        const adjustedItems = handleConsiderWithSelection(item.title, 'mobile', e.detail.items, e.detail.info);
                        chapterMap[item.title].mobile = adjustedItems; 
                        chapterMap = { ...chapterMap }; 
                      }}
                      onfinalize={e => { 
                        console.log('🎯 [TREE] MOBILE finalize START:', item.title);
                        const adjustedItems = handleConsiderWithSelection(item.title, 'mobile', e.detail.items, e.detail.info);
                        chapterMap[item.title].mobile = adjustedItems; 
                        chapterMap = { ...chapterMap }; 
                        const order = adjustedItems.map(f => mapOrderEntry(f));
                        console.log('📤 [TREE] Dispatching orderChange:', { chapter: item.title, device: 'mobile', orderLength: order.length });
                        dispatch('orderChange', { chapter: item.title, device: 'mobile', order }); 
                        endDrag();
                      }}
                      style="padding:0;margin:0;"
                    >
                      {#each (chapterMap[item.title].mobile ?? []) as file, fileIndex (file.id)}
                        <div 
                          role="button"
                          tabindex="0"
                          class="panel-item {getPanelStatus(file)} {isPanelOverride(file, item.title) ? 'override-unpublished' : ''} {selectedItems.has(getFileKey(file, item.title, 'mobile')) ? 'selected' : ''}"
                          style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem;cursor:pointer;transition:background-color 0.15s;user-select:none;{selectedItems.has(getFileKey(file, item.title, 'mobile')) ? 'background-color:rgba(59, 130, 246, 0.2);' : ''}"
                          onclick={(e) => handleRowClick(file, item.title, 'mobile', fileIndex, e)}
                          onkeydown={(e) => handleRowKeyDown(file, item.title, 'mobile', fileIndex, e)}
                        >
                          <div style="display:flex;align-items:center;">
                            <input 
                              type="checkbox" 
                              checked={selectedItems.has(getFileKey(file, item.title, 'mobile'))}
                              onclick={(e) => { e.stopPropagation(); handleCheckboxToggle(file, item.title, 'mobile', fileIndex) }}
                              style="margin-right:0.5rem;cursor:pointer;width:16px;height:16px;"
                              aria-label="Select panel"
                            />
                            <span class="drag-handle" use:dragHandle style="cursor:grab;margin-right:0.5rem;opacity:0.9" aria-label="drag panel">☰</span>
                            {#if file.type === 'youtube' && (file.youtubeId || file.id)}
                              <span class="youtube-icon" style="display:inline-block;width:48px;height:48px;background:#ff0000;border-radius:4px;margin-right:0.5rem;text-align:center;line-height:48px;font-size:1.5em;color:#fff;">▶</span>
                              <div style="flex:1;">
                                <div style="color:#ef4444;font-weight:500;">{file.title || `YouTube: ${file.youtubeId || file.id}`}</div>
                                <div style="font-size:0.8em;color:#94a3b8;">https://youtube.com/watch?v={file.youtubeId || file.id}</div>
                              </div>
                            {:else if /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)}
                              {#if file._isNew && file.preview}
                                <img 
                                  src={file.preview} 
                                  alt={file.name} 
                                  class="panel-thumb" 
                                  style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;cursor:zoom-in;" 
                                  onmouseenter={() => showImagePreview(file.preview, file.name)}
                                  onmouseleave={() => hideImagePreview()}
                                />
                              {:else}
                                <img 
                                  src={"/panels/" + file.webkitRelativePath} 
                                  alt={file.name} 
                                  class="panel-thumb" 
                                  style="max-width:48px;max-height:48px;margin-right:0.5rem;border-radius:4px;object-fit:cover;vertical-align:middle;cursor:zoom-in;" 
                                  onmouseenter={() => showImagePreview("/panels/" + file.webkitRelativePath, file.name)}
                                  onmouseleave={() => hideImagePreview()}
                                />
                              {/if}
                              <span>{file.name}</span>
                            {:else}
                              <span class="file-icon" style="display:inline-block;width:48px;height:48px;background:#222;border-radius:4px;margin-right:0.5rem;text-align:center;line-height:48px;font-size:1.5em;color:#888;">📄</span>
                              <span>{file.name}</span>
                            {/if}
                            {#if getPanelStatus(file) === 'duplicate'}<span class="badge badge-warning ml-2">Duplicate</span>{/if}
                            {#if getPanelStatus(file) === 'error'}<span class="badge badge-error ml-2">Error</span>{/if}
                          </div>
                          <div style="display:flex;gap:0.5rem;align-items:center;">
                            {#if file.type === 'youtube' && (file.youtubeId || file.id)}
                              <button class="btn btn-ghost btn-xs text-blue-400" onclick={() => window.open(`https://youtube.com/watch?v=${file.youtubeId || file.id}`, '_blank')}>Preview</button>
                            {/if}
                            <button class="btn btn-ghost btn-xs text-slate-300" onclick={() => handleTogglePublish(file)}>{getEffectivePublished(file, item.title) ? 'Unpublish' : 'Publish'}</button>
                            <button class="btn btn-ghost btn-xs text-red-500" onclick={() => handleDelete(file)}>Delete</button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </li>
                </ul>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
      </div>
    {/if}
  </div>
  
  <!-- Image Preview Modal -->
  {#if previewImageSrc}
    <div 
      class="image-preview-modal"
      style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:none;"
    >
      <img 
        src={previewImageSrc} 
        alt={previewImageAlt} 
        style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 0 30px rgba(0,0,0,0.5);"
      />
    </div>
  {/if}
  

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

