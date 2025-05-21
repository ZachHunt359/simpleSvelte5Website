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
        <li><a href="/#">Discord</a></li>
        <li><a href="/#">Patreon</a></li>
        <li><a href="/#">PARANOiD</a></li>
        <li><a href="/#">Notifs</a></li>
        <li><a href="/#">Inquiry</a></li>
    </ul>
</nav>
