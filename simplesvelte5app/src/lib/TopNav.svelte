<script>
    export let show = false;
    export let isDesktop = false; // This will be isPointerDesktop from parent
    export let onChapterSelect = () => {};
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
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
            <a href="/#">
                <!-- Notifs -->
                <iconify-icon icon="mdi:bell-outline"></iconify-icon>
            </a>
        </li>
        <li>
            <a href="/#">
                <!-- Inquiry -->
                <iconify-icon icon="mdi:email-outline"></iconify-icon>
            </a>
        </li>
    </ul>
</nav>
