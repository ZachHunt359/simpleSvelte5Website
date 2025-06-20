<script>
    export let canGoBack = false;
    export let canGoForward = false;
    export let onBack = () => {};
    export let onForward = () => {};
    export let onFirst = () => {};
    export let show = false;
    export let isDesktop = false; // This will be isPointerDesktop from parent
    //export let onHover = () => {};
    //export let onUnhover = () => {};
    export let onChapterSelect = () => {};
    export let onSave = () => {};
    export let isSaved = false;
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
</script>

<nav
    class="bottom-nav"
    class:show={show}
    on:mouseenter={() => {
        if (isDesktop) {
            show = true;
            dispatch('show', true);
        }
    }}
    on:mouseleave={() => {
        if (isDesktop) {
            show = false;
            dispatch('show', false);
        }
    }}
    style="pointer-events: {show ? 'auto' : 'none'}"
>
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
            <button type="button" on:click={onChapterSelect} aria-label="Select Chapter">
                <!-- Chapter Select -->
                <iconify-icon icon="uil:books"></iconify-icon>
            </button>
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
                <!-- Save -->
            <button
                type="button"
                on:click={onSave}
                aria-label="Save Location"
                class:saved={isSaved}
                disabled={isSaved}
            >
                <iconify-icon icon="bi:floppy"></iconify-icon>
            </button>
        </li>
    </ul>
</nav>


<style>
    a.disabled, a[aria-disabled="true"] {
        color: #888;
        pointer-events: none;
        cursor: default;
        text-decoration: none;
        opacity: 0.5;
    }
    button {
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
    }
    button.saved {
        color: #888;
        opacity: 0.5;
        cursor: default;
    }
</style>
