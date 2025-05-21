<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    
    /**
	 * @type {string | any[]}
	 */
    let panels = [];
    let currentPanel = 0;

    // Fetch panels from the server
    onMount(async () => {
        if (browser) {
            const res = await fetch('/api/panels');
            panels = await res.json();
        }
    });

    /**
     * Preload images for the next panels
	 * @param {number} currentPanel
	 */
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

    function next() {
        // Save the current scroll position
        lastScroll = window.scrollY;
        if (currentPanel < panels.length - 1) currentPanel += 1;
    }

    /**
	 * @param {{ target: { closest: (arg0: string) => any; }; }} event
	 */
    function handleClick(event) {
        if (event.target.closest('nav')) return;
        next();
    }

    
    let lastScroll = 0;

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
        border: solid 1px red;
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