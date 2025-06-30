<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let show = false;
    export let isDesktop = false; // This will be isPointerDesktop from parent
    export let onChapterSelect = () => {};
    export let canGoForward = false;
    export let onInquiry = () => {};
    export let hasUnreadReplies = false;
</script>


<nav
    class="top-nav"
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
            <a href="/#">
                <!-- Discord -->
                <iconify-icon icon="mdi:discord"></iconify-icon>
            </a>
        </li>
        <li>
            <a href="/#">
                <!-- Patreon -->
                <iconify-icon icon="simple-icons:patreon"></iconify-icon>
            </a>
        </li>
        <li>
            <button class="logo" type="button" on:click={onChapterSelect} aria-label="Select Chapter">
                <!-- PARANOiD (webcomic title, logo to come) -->
                PARANOiD
            </button>
        </li>
        <li>
            <!-- Notifs -->
            <a href="javascript:void(0)"
                class:notify={hasUnreadReplies}
                on:click={() => hasUnreadReplies && dispatch('showNotifications')}
                aria-label="Notifications">
                    <iconify-icon icon="mdi:bell-outline"></iconify-icon>
            </a>
        </li>
        <li>
            <a
                href="javascript:void(0)"
                class:disabled={canGoForward}
                aria-disabled={canGoForward}
                tabindex={canGoForward ? -1 : 0}
                on:click={() => !canGoForward && onInquiry()}
            >
                <!-- Inquiry -->
                <iconify-icon icon="lineicons:question-mark"></iconify-icon>
            </a>
        </li>
    </ul>
</nav>
<style>
.disabled,
a[aria-disabled="true"] {
    color: #888;
    pointer-events: none;
    cursor: default;
    opacity: 0.5;
}
.notify iconify-icon {
    animation: wiggle 0.5s infinite alternate;
    color: gold;
}
@keyframes wiggle {
    0% { transform: rotate(-10deg);}
    100% { transform: rotate(10deg);}
}
</style>