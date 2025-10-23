<script>
// @ts-nocheck

    import { onMount, tick } from 'svelte';
    import { browser } from '$app/environment';

    export let panels = [];
    export let currentPanel = 0;
    export let lastScroll = 0;
    export let onNext = () => {};

    //console.log('ComicPanel received panels:', panels, 'currentPanel:', currentPanel);

    // The panel currently displayed in the DOM
    let displayedPanelIndex = currentPanel;
    let preloading = false;

    let lastPanelHeight = null;
    let panelEl;

    // Flicker-free display: only update displayedPanelIndex after image/video is ready
    $: if (
        panels.length > 0 &&
        currentPanel !== displayedPanelIndex &&
        panels[currentPanel]
    ) {
        const url = panels[currentPanel];
        preloading = true;

        if (/\.(webm)$/i.test(url)) {
            // For video, swap immediately (preloading is unreliable for videos)
            displayedPanelIndex = currentPanel;
            preloading = false;
        } else {
            // For images, preload before swapping
            const img = new window.Image();
            img.onload = () => {
                displayedPanelIndex = currentPanel;
                preloading = false;
            };
            img.src = url;
        }
    }

    // Preload images/videos for the next panels (1 behind, 3 ahead)
    function preloadImages(currentPanel) {
        if (!browser || panels.length === 0) return;
        for (let i = currentPanel - 1; i < currentPanel + 3 && i < panels.length; i++) {
            const url = panels[i];
            if (/\.(webm)$/i.test(url)) {
                // Preload video (not always effective, but doesn't hurt)
                const video = document.createElement('video');
                video.src = url;
                video.preload = 'auto';
            } else {
                // Preload image
                const img = new Image();
                img.src = url;
            }
        }
    }

    $: preloadImages(currentPanel);

    /* let displayedPanelIndex = currentPanel;
    let preloadedUrl = null;
    // Preload the next panel's image/video
    $: if (panels.length > 0 && currentPanel !== displayedPanelIndex) {
        const url = panels[currentPanel];
        if (/\.(webm)$/i.test(url)) {
            // Preload video (optional, browsers may not fully preload)
            preloadedUrl = url;
            displayedPanelIndex = currentPanel; // For videos, swap immediately
        } else {
            // Preload image
            const img = new window.Image();
            img.onload = () => {
                preloadedUrl = url;
                displayedPanelIndex = currentPanel;
            };
            img.src = url;
        }
    } */

    //let imageLoaded = true;

    async function handleMediaLoad() {
        //console.log('handleMediaLoad', { currentPanel, lastScroll, scrollY: window.scrollY });
        await tick();
        if (panelEl) {//Holding space for the next panel
            lastPanelHeight = panelEl.offsetHeight;
        }
        if (typeof window !== 'undefined') {
            // Only scroll if not already at the desired position
            if (lastScroll && window.scrollY !== lastScroll) {
                window.scrollTo({ top: lastScroll });
            }
        }
    }

    /* $: if (panels.length > 0 && !/\.(webm)$/i.test(panels[currentPanel])) {
        //imageLoaded = false;
    } */

    /**
     * @param {{ target: { closest: (arg0: string) => any; }; }} event
     */
    function handleClick(event) {
        if (event.target.closest('nav')) return;
        onNext();
    }

    export let onSwipeUp = () => {};
    export let onSwipeDown = () => {};

    let touchStartY = null;

    function handleTouchStart(e) {
        touchStartY = e.touches[0].clientY;
    }
    function handleTouchEnd(e) {
        if (touchStartY === null) return;
        const touchEndY = e.changedTouches[0].clientY;
        if (touchStartY - touchEndY > 40) {
            // Swipe up
            onSwipeUp();
        } else if (touchEndY - touchStartY > 40) {
            // Swipe down
            onSwipeDown();
        }
        touchStartY = null;
    }

    

    
</script>

<button 
    class="comic-area"
    type="button"
    style="min-height: {lastPanelHeight ? `${lastPanelHeight}px` : 'auto'}"
    on:click={handleClick}
    disabled={preloading}
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}>
    {#if panels.length > 0 && displayedPanelIndex >= 0 && displayedPanelIndex < panels.length}
        {#if /\.(webm)$/i.test(panels[displayedPanelIndex])}
            <!-- decorative animated panel: mark as non-interactive for assistive tech -->
            <video
                src={panels[displayedPanelIndex]}
                autoplay
                loop
                playsinline
                aria-hidden="true"
                tabindex="-1"
                on:loadeddata={handleMediaLoad}
            ></video>
        {:else}
            <img
            src={panels[displayedPanelIndex]}
            alt="Comic Panel"
            draggable="false"
            on:load={handleMediaLoad}
            />
        {/if}
    {/if}

    
</button>

<style>
    .comic-area {
        width: 100%;
        min-height: 400px;
        display: grid; /* Use grid for overlap */
        align-items: center;
        justify-items: center;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        /* Mobile tap/click highlight suppression */
        -webkit-tap-highlight-color: transparent;
        /* Avoid accidental text/image selection highlighting */
        -webkit-user-select: none;
        user-select: none;
        /* iOS callout on long-press */
        -webkit-touch-callout: none;
        /* Normalize button appearance across browsers */
        -webkit-appearance: none;
        appearance: none;
    }

    .comic-area img,
    .comic-area video {
        width: 90vw;
        max-height: 100vh;
        display: block;
        margin: 0;
        object-fit: contain;
        border: none;
        box-sizing: border-box;
        transition: opacity 0.2s;
        grid-area: 1 / 1 / 2 / 2; /* Overlap both elements */
        /* Prevent selection/blue highlight on media elements too */
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
    }

    :global(.active) {
        opacity: 1;
        pointer-events: auto;
        visibility: visible;
    }

    :global(.inactive) {
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
    }

    /* Hide focus ring for mouse/touch interactions only; keep it for keyboard users */
    .comic-area:focus:not(:focus-visible) {
        outline: none;
        box-shadow: none;
        background-color: transparent;
    }
    .comic-area::-moz-focus-inner {
        border: 0;
    }
</style>