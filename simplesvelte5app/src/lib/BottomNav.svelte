<script>
	let show = false;
</script>

<!-- Hover zone at the bottom -->
<div
    class="nav-hover-zone bottom"
    on:mouseenter={() => show = true}
    on:mouseleave={() => show = false}
></div>

<nav class="bottom-nav" class:show={show}
    on:mouseenter={() => show = true}
    on:mouseleave={() => show = false}
>
	<ul>
		<li><a href="/#">Chapter Start</a></li>
		<li><a href="/#">Back 1 Step</a></li>
		<li><a href="/#">Chapter Select</a></li>
		<li><a href="/#">Forward 1 Step</a></li>
		<li><a href="/#">Save</a></li>
	</ul>
</nav>
