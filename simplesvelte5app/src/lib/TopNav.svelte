<script>
    let show = false;
</script>

<!-- Hover zone at the top -->
<div
    class="nav-hover-zone top"
    on:mouseenter={() => show = true}
    on:mouseleave={() => show = false}
></div>

<nav class="top-nav" class:show={show}
    on:mouseenter={() => show = true}
    on:mouseleave={() => show = false}
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
