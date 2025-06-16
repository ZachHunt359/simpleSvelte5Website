<script lang="ts">
    import TopNav from '$lib/TopNav.svelte';
    import BottomNav from '$lib/BottomNav.svelte';
    import ComicPanel from '$lib/ComicPanel.svelte';
    import { onMount, tick } from 'svelte';
    import { browser } from '$app/environment';


    let chapters = [];
    let panels = [];
    let currentChapter = 0;
    let currentPanel = 0;
    let isDesktop = false;

    


    
    let lastScroll = 0;

    let showTopNav = false;
    let showBottomNav = false;

    let navTimeout: ReturnType<typeof setTimeout> | null = null;
    let bottomNavTimeout: ReturnType<typeof setTimeout> | null = null;
    let topNavTimeout: ReturnType<typeof setTimeout> | null = null;

    let showChapterModal = false;

    // Fetch panels from the server
    onMount(() => {
        // Device detection
        updateIsDesktop();
        window.addEventListener('resize', updateIsDesktop);
        window.addEventListener('orientationchange', updateIsDesktop);

        // Fetch panels.json asynchronously
        (async () => {
            const res = await fetch('/panels.json');
            chapters = await res.json();
            //console.log('Fetched chapters:', chapters);
        })();

        // Cleanup listeners on destroy
        return () => {
            window.removeEventListener('resize', updateIsDesktop);
            window.removeEventListener('orientationchange', updateIsDesktop);
        };
    });

    $: panels = chapters.length > 0 
        ? (isDesktop
            ? chapters[currentChapter]?.desktop ?? []
            : chapters[currentChapter]?.mobile ?? [])
        : [];
    //$: console.log('Panels:', panels, 'CurrentPanel:', currentPanel);

    //Clamp currentPanel to valid range, in case Mobile or Desktop is shorter than the other
    $: {
        if (panels.length === 0) {
            currentPanel = 0;
        } else if (currentPanel < 0) {
            currentPanel = 0;
        } else if (currentPanel >= panels.length) {
            currentPanel = panels.length - 1;
        }
    }

    function updateIsDesktop() {
        isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 801px)').matches;
        console.log('isDesktop:', isDesktop);
    }

    
    function next() {
        if (currentPanel < (panels?.length ?? 0) - 1) {
            currentPanel += 1;
            //console.log('Panels:', panels, 'CurrentPanel:', currentPanel);
            lastScroll = window.scrollY;
            blurActiveElement();
            return true;
        }
        if (currentChapter < chapters.length - 1) {
            currentChapter += 1;
            currentPanel = 0;
            //console.log('Panels:', panels, 'CurrentPanel:', currentPanel);
            lastScroll = 0; // <-- Add this
            blurActiveElement();
            return true;
        }
        return false;
    }
    function prev() {
        if (currentPanel > 0) {
            currentPanel -= 1;
           // console.log('Panels:', panels, 'CurrentPanel:', currentPanel);
            lastScroll = window.scrollY;
            blurActiveElement();
            return true;
        }
        if (currentChapter > 0) {
            currentChapter -= 1;
            const prevPanels = isDesktop
                ? chapters[currentChapter]?.desktop ?? []
                : chapters[currentChapter]?.mobile ?? [];
            currentPanel = prevPanels.length - 1;
            //console.log('Panels:', panels, 'CurrentPanel:', currentPanel);
            lastScroll = 0; // <-- Or set to previous scroll if you want
            blurActiveElement();
            return true;
        }
        return false;
    }
    function first() {
        if (currentPanel !== 0) {
            currentPanel = 0;
            //console.log('Panels:', panels, 'CurrentPanel:', currentPanel);
            lastScroll = 0; // <-- Add this
            blurActiveElement();
            return true;
        }
        return false;
    }

    function showNav(setter: (v: boolean) => void, timeoutVar: 'bottom' | 'top') {
        setter(true);
        if (timeoutVar === 'bottom') {
            if (bottomNavTimeout) clearTimeout(bottomNavTimeout);
            bottomNavTimeout = setTimeout(() => {
                setter(false);
                const nav = document.querySelector('.bottom-nav.show');
                if (nav && nav.contains(document.activeElement)) {
                    (document.activeElement as HTMLElement).blur();
                }
                //('BottomNav auto-hid');
            }, 5000);
        } else {
            if (topNavTimeout) clearTimeout(topNavTimeout);
            topNavTimeout = setTimeout(() => {
                setter(false);
                const nav = document.querySelector('.top-nav.show');
                if (nav && nav.contains(document.activeElement)) {
                    (document.activeElement as HTMLElement).blur();
                }
                //console.log('TopNav auto-hid');
            }, 5000);
        }
    }

    // Swipe handlers for ComicPanel
    function handleSwipeUp() {
        showNav(v => showBottomNav = v, 'bottom');
    }
    function handleSwipeDown() {
        showNav(v => showTopNav = v, 'top');
    }
    function withNavTimer(fn: () => boolean, nav: 'top' | 'bottom') {
        return () => {
            const didChange = fn();
            if (didChange) {
                showNav(
                    nav === 'bottom' ? v => showBottomNav = v : v => showTopNav = v,
                    nav
                );
            }
        };
    }

    function selectChapter(index) {
      currentChapter = index;
      currentPanel = 0;
      lastScroll = 0; // <-- Add this
      showChapterModal = false;
    }

    $: isLastPanelOfLastChapter =
        currentChapter === chapters.length - 1 &&
        currentPanel === (panels?.length ?? 0) - 1;

    $: canGoForward = !isLastPanelOfLastChapter;

    //$: console.log('showBottomNav', showBottomNav);

    function blurActiveElement() {
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }

    let prevChapter = currentChapter;
    let prevPanel = currentPanel;

    $: (async () => {
        // Only scroll to top if chapter changed, or panel changed to 0
        if (
            (currentChapter !== prevChapter) ||
            (currentPanel === 0 && prevPanel !== 0)
        ) {
            if (typeof window !== 'undefined') {
                await tick();
                window.scrollTo(0, 0);
            }
        }
        prevChapter = currentChapter;
        prevPanel = currentPanel;
    })();
</script>

{#if isDesktop}
    <div
        class="nav-hover-zone top"
        role="presentation"
        on:mouseenter={() => showTopNav = true}
        on:mouseleave={() => showTopNav = false}
    >
        <TopNav bind:show={showTopNav} />
    </div>
{:else}
    <TopNav bind:show={showTopNav} />
{/if}

<main>
    {#if panels.length > 0}
        <ComicPanel
            {panels}
            {currentPanel}
            {lastScroll}
            onNext={next}
            onSwipeUp={handleSwipeUp}
            onSwipeDown={handleSwipeDown}
        />
    {:else}
        <div class="loading"><p>Loading...</p></div>
    {/if}
</main>

{#if isDesktop}
    <div
        class="nav-hover-zone bottom"
        role="presentation"
        on:mouseenter={() => showBottomNav = true}
        on:mouseleave={() => showBottomNav = false}
    >
        <BottomNav
            bind:show={showBottomNav}
            canGoBack={currentPanel > 0 || currentChapter > 0}
            canGoForward={currentPanel < panels.length - 1 || currentChapter < chapters.length - 1}
            onFirst={withNavTimer(first, 'bottom')}
            onBack={withNavTimer(prev, 'bottom')}
            onForward={withNavTimer(next, 'bottom')}
            onChapterSelect={() => showChapterModal = true}
        />
    </div>
{:else}
    <BottomNav
        bind:show={showBottomNav}
        canGoBack={currentPanel > 0 || currentChapter > 0}
        canGoForward={currentPanel < panels.length - 1 || currentChapter < chapters.length - 1}
        onFirst={withNavTimer(first, 'bottom')}
        onBack={withNavTimer(prev, 'bottom')}
        onForward={withNavTimer(next, 'bottom')}
        onChapterSelect={() => showChapterModal = true}
    />
{/if}

{#if showChapterModal}
    <div class="chapter-modal-backdrop" on:click={() => showChapterModal = false}>
        <div class="chapter-modal" on:click|stopPropagation>
            <h2>Select Chapter</h2>
            <div class="chapter-thumbnails">
                {#each chapters as chapter, idx}
                    <figure class="chapter-thumb" on:click={() => { selectChapter(idx); showChapterModal = false; }}>
                        <img
                            src={chapter.thumbnail}
                            alt={chapter.title}
                        />
                        <figcaption>{chapter.title}</figcaption>
                    </figure>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    main {
        position: relative;
        min-height: 100vh;
        background: black;
        overflow-x: hidden;
        overflow-y: auto;
    }
    .chapter-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .chapter-modal {
        background: #222;
        padding: 2rem;
        border-radius: 1rem;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
    }
    .chapter-modal h2 {
        text-align: center;
        color: yellow;
        margin-bottom: 1rem;
    }
    .chapter-thumbnails {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
    }
    .chapter-thumb {
        width: 100px;
        cursor: pointer;
        background: #111;
        border-radius: 0.5rem;
        overflow: hidden;
        text-align: center;
        transition: box-shadow 0.2s;
    }
    .chapter-thumb:hover {
        box-shadow: 0 0 0 2px #fff;
    }
    .chapter-thumb img {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
        display: block;
    }
    .chapter-thumb figcaption {
        font-size: 0.8rem;
        color: #fff;
        padding: 0.25rem 0.5rem;
        background: rgba(0,0,0,0.5);
    }
</style>

