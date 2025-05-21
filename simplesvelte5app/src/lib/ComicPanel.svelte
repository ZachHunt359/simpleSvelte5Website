<script>
// @ts-nocheck

    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    export let panels = [];
    export let currentPanel = 0;
    export let lastScroll = 0;
    export let onNext = () => {};

    // Preload images/videos for the next panels
    function preloadImages(currentPanel) {
        if (!browser || panels.length === 0) return;
        for (let i = currentPanel; i < currentPanel + 3 && i < panels.length; i++) {
            const url = panels[i];
            if (/\.(webm)$/i.test(url)) {
                // Preload video
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

    let imageLoaded = true;

    function handleImageLoad() {
        imageLoaded = true;
        setTimeout(() => window.scrollTo({ top: lastScroll }), 0);
    }

    function handleVideoLoaded() {
        setTimeout(() => window.scrollTo({ top: lastScroll }), 0);
    }

    $: if (panels.length > 0 && !/\.(webm)$/i.test(panels[currentPanel])) {
        imageLoaded = false;
    }

    /**
     * @param {{ target: { closest: (arg0: string) => any; }; }} event
     */
    function handleClick(event) {
        if (event.target.closest('nav')) return;
        onNext();
    }
</script>

<button class="comic-area" type="button" on:click={handleClick} disabled={panels.length === 0 || !imageLoaded}>
    {#if panels.length > 0}
        <img
            src={panels[currentPanel]}
            alt="Comic Panel"
            class:active={!/\.(webm)$/i.test(panels[currentPanel]) && imageLoaded}
            class:inactive={/\.(webm)$/i.test(panels[currentPanel]) || !imageLoaded}
            on:load={handleImageLoad}
        />
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
            src={panels[currentPanel]}
            autoplay
            loop
            playsinline
            controls
            class:active={/\.(webm)$/i.test(panels[currentPanel])}
            class:inactive={!/\.(webm)$/i.test(panels[currentPanel])}
            on:loadeddata={handleVideoLoaded}
        ></video>
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
    }

    .comic-area img,
    .comic-area video {
        width: 90vw;
        display: block;
        margin: 0;
        object-fit: contain;
        border: none;
        box-sizing: border-box;
        transition: opacity 0.2s;
        grid-area: 1 / 1 / 2 / 2; /* Overlap both elements */
    }

    .active {
        opacity: 1;
        pointer-events: auto;
        visibility: visible;
    }

    .inactive {
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
    }
</style>