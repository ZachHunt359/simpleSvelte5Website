<script lang="ts">
    import TopNav from '$lib/TopNav.svelte';
    import BottomNav from '$lib/BottomNav.svelte';
    import ComicPanel from '$lib/ComicPanel.svelte';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let panels = [];
    let currentPanel = 0;
    let lastScroll = 0;

    let showTopNav = false;
    let showBottomNav = false;

    let navTimeout: ReturnType<typeof setTimeout> | null = null;
    let bottomNavTimeout: ReturnType<typeof setTimeout> | null = null;
    let topNavTimeout: ReturnType<typeof setTimeout> | null = null;

    let isDesktop = false;

    // Fetch panels from the server
    onMount(async () => {
        if (browser) {
            const res = await fetch('/panels.json');
            panels = await res.json();
        }
        isDesktop = typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches;
    });

    function next() {
        lastScroll = window.scrollY;
        if (currentPanel < panels.length - 1) {
            currentPanel += 1;
            return true;
        }
        return false;
    }
    function prev() {
        lastScroll = window.scrollY;
        if (currentPanel > 0) {
            currentPanel -= 1;
            return true;
        }
        return false;
    }
    function first() {
        lastScroll = window.scrollY;
        if (currentPanel !== 0) {
            currentPanel = 0;
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
                console.log('BottomNav auto-hid');
            }, 5000);
        } else {
            if (topNavTimeout) clearTimeout(topNavTimeout);
            topNavTimeout = setTimeout(() => {
                setter(false);
                const nav = document.querySelector('.top-nav.show');
                if (nav && nav.contains(document.activeElement)) {
                    (document.activeElement as HTMLElement).blur();
                }
                console.log('TopNav auto-hid');
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

    $: console.log('showBottomNav', showBottomNav);
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
    <ComicPanel
        {panels}
        bind:currentPanel
        {lastScroll}
        onNext={next}
        onSwipeUp={handleSwipeUp}
        onSwipeDown={handleSwipeDown}
    />
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
            canGoBack={currentPanel > 0}
            canGoForward={currentPanel < panels.length - 1}
            onFirst={withNavTimer(first, 'bottom')}
            onBack={withNavTimer(prev, 'bottom')}
            onForward={withNavTimer(next, 'bottom')}
        />
    </div>
{:else}
    <BottomNav
        bind:show={showBottomNav}
        canGoBack={currentPanel > 0}
        canGoForward={currentPanel < panels.length - 1}
        onFirst={withNavTimer(first, 'bottom')}
        onBack={withNavTimer(prev, 'bottom')}
        onForward={withNavTimer(next, 'bottom')}
    />
{/if}

<style>
    main {
        position: relative;
        min-height: 100vh;
        background: black;
        overflow-x: hidden;
        overflow-y: auto;
    }
</style>