<script>
    export let show = false;
    export let onHover = () => {};
    export let onUnhover = () => {};
</script>


<nav class="top-nav" class:show={show}>
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
            <a href="/#">
                <!-- PARANOiD (webcomic title, logo to come) -->
                 PARANOiD
            </a>
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
