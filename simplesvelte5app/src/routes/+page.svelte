<script>
    import TopNav from '$lib/TopNav.svelte';
    import BottomNav from '$lib/BottomNav.svelte';
    import ComicPanel from '$lib/ComicPanel.svelte';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let panels = [];
    let currentPanel = 0;

    // Fetch panels from the server
    onMount(async () => {
        if (browser) {
            const res = await fetch('/api/panels');
            panels = await res.json();
        }
    });

    function next() {
        if (currentPanel < panels.length - 1) currentPanel += 1;
    }
    function prev() {
        if (currentPanel > 0) currentPanel -= 1;
    }
</script>

<TopNav />
<main>
    <ComicPanel {panels} bind:currentPanel />
</main>
<BottomNav
    canGoBack={currentPanel > 0}
    canGoForward={currentPanel < panels.length - 1}
    onBack={prev}
    onForward={next}
/>

<style>
    main {
        position: relative;
        min-height: 100vh;
        background: black;
        overflow-x: hidden;
        overflow-y: auto;
    }
</style>