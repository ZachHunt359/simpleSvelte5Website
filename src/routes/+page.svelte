<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount, tick } from 'svelte';

    onMount(async () => {
        if (typeof window !== 'undefined' && window.location.pathname === '/') {
            await tick(); // Wait for SvelteKit to finish initial setup
            const lastUrl = localStorage.getItem('comic-last-url');
            if (lastUrl && lastUrl !== '/') {
                goto(lastUrl, { replaceState: true });
            } else {
                // No saved location, so fetch panels.json to find the first panel
                try {
                    const resp = await fetch('/panels.json');
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.chapters && data.chapters.length > 0) {
                            const firstChapter = data.chapters[0];
                            const firstPanel = firstChapter.mobile?.[0] || firstChapter.desktop?.[0];
                            if (firstPanel) {
                                // Extract panel slug from path or use YouTube ID
                                let panelSlug = 'Story1'; // fallback
                                if (typeof firstPanel === 'object' && firstPanel.type === 'youtube') {
                                    panelSlug = firstPanel.id;
                                } else if (typeof firstPanel === 'string') {
                                    const match = firstPanel.match(/\/([^/]+)\.(png|jpg|jpeg|gif|webm)/i);
                                    if (match) panelSlug = match[1];
                                }
                                goto(`/${firstChapter.chapter}/${panelSlug}`, { replaceState: true });
                                return;
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to load panels.json:', e);
                }
                // Fallback if panels.json fails
                goto('/chapter-1/Story1', { replaceState: true });
            }
        }
    });
</script>

<p>Redirecting...</p>