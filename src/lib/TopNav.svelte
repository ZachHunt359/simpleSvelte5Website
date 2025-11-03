<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let show = false;
    export let isDesktop = false; // This will be isPointerDesktop from parent
    export let onChapterSelect = () => {};
    export let chaptersCount = 1;
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
            <a href="https://discord.gg/f6Y3ChGfTQ" aria-label="Discord link" target="_blank" rel="noopener noreferrer">
                <!-- Discord -->
                <iconify-icon icon="mdi:discord"></iconify-icon>
            </a>
        </li>
        <li>
            <a href="https://ko-fi.com/mikiib" aria-label="Ko-fi link" target="_blank" rel="noopener noreferrer">
                <!-- Ko-fi -->
                <iconify-icon icon="simple-icons:kofi"></iconify-icon>
            </a>
        </li>
        <li>
            <button
                class="logo"
                type="button"
                on:click={() => { if (chaptersCount > 1) onChapterSelect(); }}
                aria-label="Select Chapter"
                aria-disabled={chaptersCount <= 1}
                tabindex={chaptersCount > 1 ? 0 : -1}
            >
                <!-- PARANOiD (webcomic title, logo to come) -->
                PARANOiD
            </button>
        </li>
        <li>
            <!-- Notifs -->
            <button type="button" class:notify={hasUnreadReplies} on:click={() => hasUnreadReplies && dispatch('showNotifications')} aria-label="Notifications">
                <iconify-icon icon="mdi:bell-outline"></iconify-icon>
            </button>
        </li>
        <li>
            <button
                type="button"
                class:disabled={canGoForward}
                aria-disabled={canGoForward}
                tabindex={canGoForward ? -1 : 0}
                on:click={() => !canGoForward && onInquiry()}
                aria-label="Open inquiry dialog"
            >
                <iconify-icon icon="lineicons:question-mark"></iconify-icon>
            </button>
        </li>
    </ul>
</nav>
<style>
/* Top navigation layout */
.top-nav {
    display: block;
    /* add vertical padding so the nav doesn't look squished */
    padding: 0.5rem 0.75rem;
}
.top-nav ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.2rem;
    align-items: center;
    justify-content: center;
}

/* Increase gap on larger screens */
@media (min-width: 600px) {
    .top-nav ul {
        gap: 1rem;
    }
}

/* Make all interactive elements visually seamless like BottomNav */
button,
a {
    background: none;
    border: none;
    /* Reduced horizontal padding to keep icons closer together */
    padding: 0.45rem 0.3rem;
    margin: 0;
    color: inherit;
    cursor: pointer;
    font: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    text-decoration: none;
}

button:focus {
    outline: 2px solid rgba(144,202,249,0.2);
    outline-offset: 2px;
}

/* Logo styling */
button.logo {
    font-weight: 700;
    letter-spacing: 0.04em;
}

/* Notification wiggle animation (only notifications should wiggle) */
.notify iconify-icon {
    animation: wiggle 0.5s infinite alternate;
    color: gold;
}

/* Disabled state for buttons: visual hint but no animation */
button.disabled {
    color: #888;
    opacity: 0.5;
    cursor: default;
    pointer-events: none;
}

@keyframes wiggle {
    0% { transform: rotate(-10deg); }
    100% { transform: rotate(10deg); }
}
</style>