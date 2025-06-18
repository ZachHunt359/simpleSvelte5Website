<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    onMount(() => {
        if (typeof window !== 'undefined' && window.location.pathname === '/') {
            const lastUrl = localStorage.getItem('comic-last-url');
            if (lastUrl && lastUrl !== '/') {
                goto(lastUrl, { replaceState: true });
            } else {
                // No saved location, so redirect to the first chapter/panel
                goto('/chapter-1/Story1', { replaceState: true });
            }
        }
    });
</script>

<p>Redirecting...</p>