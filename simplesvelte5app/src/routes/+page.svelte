<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    onMount(() => {
        // Change these to your actual first chapter/panel
        goto('/chapter-1/Story1', { replaceState: true });
    });
</script>

<p>Redirecting...</p>