<script>
    export let canGoBack = false;
    export let canGoForward = false;
    export let onBack = () => {};
    export let onForward = () => {};
    export let onFirst = () => {};
    export let show = false;
    export let onHover = () => {};
    export let onUnhover = () => {};
</script>

<nav class="bottom-nav" class:show={show}>
    <ul>
        <li>
            <a
                on:click|preventDefault={(event) => { onFirst(); event.currentTarget.blur(); }}
            >
                <!-- Page 1 of Chapter -->
                <iconify-icon icon="icon-park-outline:to-left"></iconify-icon>
            </a>
        </li>
        <li>
            <a
                class:disabled={!canGoBack}
                on:click|preventDefault={(event) => { if (canGoBack) onBack(); event.currentTarget.blur(); }}
                aria-disabled={!canGoBack}
                tabindex={canGoBack ? 0 : -1}
            >
                <!-- Back 1 Step -->
                <iconify-icon icon="icon-park-outline:left-two"></iconify-icon>
            </a>
        </li>
        <li>
            <a href="/#">
                <!-- Chapter Select -->
                <iconify-icon icon="uil:books"></iconify-icon>
            </a>
        </li>
        <li>
            <a
                class:disabled={!canGoForward}
                on:click|preventDefault={(event) => { if (canGoForward) onForward(); event.currentTarget.blur(); }}
                aria-disabled={!canGoForward}
                tabindex={canGoForward ? 0 : -1}
            >
                <!-- Forward 1 Step -->
                <iconify-icon icon="icon-park-outline:right-two"></iconify-icon>
            </a>
        </li>
        <li>
            <a href="/#">
                <!-- Save -->
                <iconify-icon icon="bi:floppy"></iconify-icon>
            </a>
        </li>
    </ul>
</nav>


<style>
    .nav-hover-zone.bottom {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 128px; /* nav height + extra hover area */
        z-index: 100;
        /* Optionally add background: transparent; */
    }
    .bottom-nav {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 64px; /* nav height */
        z-index: 101;
        pointer-events: auto;
    }
    a.disabled, a[aria-disabled="true"] {
        color: #888;
        pointer-events: none;
        cursor: default;
        text-decoration: none;
        opacity: 0.5;
    }
</style>
