<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount, tick } from 'svelte';

    onMount(async () => {
        if (typeof window !== 'undefined' && window.location.pathname === '/') {
            await tick(); // Wait for SvelteKit to finish initial setup
            const lastUrl = localStorage.getItem('comic-last-url');
            if (lastUrl && lastUrl !== '/') {
                console.log('[Homepage] Redirecting to saved URL:', lastUrl);
                goto(lastUrl, { replaceState: true });
            } else {
                // No saved location, so fetch panels.json to find the first panel
                try {
                    console.log('[Homepage] Fetching panels.json to find first panel...');
                    const resp = await fetch('/panels.json');
                    console.log('[Homepage] panels.json response status:', resp.status);
                    
                    if (resp.ok) {
                        const data = await resp.json();
                        console.log('[Homepage] panels.json data:', data);
                        
                        // panels.json is an array directly, not an object with chapters property
                        const chapters = Array.isArray(data) ? data : (data.chapters || []);
                        
                        if (chapters.length > 0) {
                            const firstChapter = chapters[0];
                            console.log('[Homepage] First chapter:', firstChapter);
                            
                            const firstPanel = firstChapter.mobile?.[0] || firstChapter.desktop?.[0];
                            console.log('[Homepage] First panel:', firstPanel);
                            
                            if (firstPanel) {
                                // Extract panel slug from path or use YouTube ID
                                let panelSlug;
                                if (typeof firstPanel === 'object' && firstPanel.type === 'youtube') {
                                    panelSlug = firstPanel.id;
                                    console.log('[Homepage] First panel is YouTube:', panelSlug);
                                } else if (typeof firstPanel === 'string') {
                                    const match = firstPanel.match(/\/([^/]+)\.(png|jpg|jpeg|gif|webm)/i);
                                    if (match) {
                                        panelSlug = match[1];
                                        console.log('[Homepage] First panel is image:', panelSlug);
                                    }
                                }
                                
                                if (panelSlug) {
                                    const chapterSlug = firstChapter.slug || firstChapter.chapter || 'chapter-1';
                                    const targetUrl = `/${chapterSlug}/${panelSlug}`;
                                    console.log('[Homepage] Redirecting to:', targetUrl);
                                    goto(targetUrl, { replaceState: true });
                                    return;
                                } else {
                                    console.warn('[Homepage] Could not extract panel slug from:', firstPanel);
                                }
                            } else {
                                console.warn('[Homepage] No panels found in first chapter');
                            }
                        } else {
                            console.warn('[Homepage] No chapters found in panels.json');
                        }
                    } else {
                        console.error('[Homepage] Failed to fetch panels.json, status:', resp.status);
                    }
                } catch (e) {
                    console.error('[Homepage] Error loading panels.json:', e);
                }
                
                // Fallback - only reached if everything above failed
                console.warn('[Homepage] Using fallback redirect to /chapter-1/Spread1.1.a');
                goto('/chapter-1/Spread1.1.a', { replaceState: true });
            }
        }
    });
</script>

<p>Redirecting...</p>