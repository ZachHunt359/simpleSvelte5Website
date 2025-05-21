<script>
    import TopNav from '$lib/TopNav.svelte';
    import BottomNav from '$lib/BottomNav.svelte';
    import ComicPanel from '$lib/ComicPanel.svelte';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let panels = [];
    let currentPanel = 0;
    let lastScroll = 0;

    // Fetch panels from the server
    onMount(async () => {
        if (browser) {
            const res = await fetch('/panels.json');
            panels = await res.json();
        }
    });

    function next() {
        lastScroll = window.scrollY;
        if (currentPanel < panels.length - 1) currentPanel += 1;
    }
    function prev() {
        lastScroll = window.scrollY;
        if (currentPanel > 0) currentPanel -= 1;
    }
    function first() {
        lastScroll = window.scrollY;
        currentPanel = 0;
    }
</script>

<TopNav />
<main>
    <ComicPanel {panels} bind:currentPanel {lastScroll} onNext={next} />
</main>
<BottomNav
    canGoBack={currentPanel > 0}
    canGoForward={currentPanel < panels.length - 1}
    onBack={prev}
    onForward={next}
    onFirst={first}
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