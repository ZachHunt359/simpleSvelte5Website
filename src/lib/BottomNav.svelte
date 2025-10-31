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
    export let chaptersCount = 1;
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
    
>
    <ul>
        <li>
            <button type="button" on:click={(event) => { onFirst(); event.currentTarget.blur(); }} aria-label="Go to first panel">
                <iconify-icon icon="icon-park-outline:to-left"></iconify-icon>
            </button>
        </li>
        <li>
            <button
                type="button"
                class:disabled={!canGoBack}
                on:click={(event) => { if (canGoBack) onBack(); event.currentTarget.blur(); }}
                aria-disabled={!canGoBack}
                tabindex={canGoBack ? 0 : -1}
                aria-label="Back one panel"
            >
                <iconify-icon icon="icon-park-outline:left-two"></iconify-icon>
            </button>
        </li>
        <li>
            <button
                type="button"
                class:disabled={chaptersCount <= 1}
                on:click={(event) => { if (chaptersCount > 1) { onChapterSelect(); } event.currentTarget.blur(); }}
                aria-disabled={chaptersCount <= 1}
                tabindex={chaptersCount > 1 ? 0 : -1}
                aria-label="Select Chapter"
            >
                <!-- Chapter Select -->
                <iconify-icon icon="uil:books"></iconify-icon>
            </button>
        </li>
        <li>
            <button
                type="button"
                class:disabled={!canGoForward}
                on:click={(event) => { if (canGoForward) onForward(); event.currentTarget.blur(); }}
                aria-disabled={!canGoForward}
                tabindex={canGoForward ? 0 : -1}
                aria-label="Forward one panel"
            >
                <iconify-icon icon="icon-park-outline:right-two"></iconify-icon>
            </button>
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
    :global(.bottom-nav a.disabled), :global(.bottom-nav a[aria-disabled="true"]) {
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
