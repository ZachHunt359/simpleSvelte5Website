<script>
    
    export let canGoBack = false;
    export let canGoForward = false;
    export let onBack = () => {};
    export let onForward = () => {};
    export let onFirst = () => {};
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
		<li>
            <a href="/#" on:click|preventDefault={onFirst}>
				<!-- Page 1 of Chapter -->
                <iconify-icon icon="icon-park-outline:to-left"></iconify-icon>
            </a>
        </li>
		<li>
			<a
				href="#"
				class:disabled={!canGoBack}
				on:click|preventDefault={() => canGoBack && onBack()}
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
				href="#"
				class:disabled={!canGoForward}
				on:click|preventDefault={() => canGoForward && onForward()}
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
    a.disabled, a[aria-disabled="true"] {
        color: #888;
        pointer-events: none;
        cursor: default;
        text-decoration: none;
        opacity: 0.5;
    }
</style>
