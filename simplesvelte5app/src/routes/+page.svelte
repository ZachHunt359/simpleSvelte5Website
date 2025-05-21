<script>
	import TopNav from '$lib/TopNav.svelte';
	import BottomNav from '$lib/BottomNav.svelte';
	import ComicPanel from '$lib/ComicPanel.svelte';
</script>

<TopNav />
<main>
	<ComicPanel />
</main>
<BottomNav />

<style>
	main {
	position: relative;
	min-height: 100vh;
	background: black;
	overflow-x: hidden;
	overflow-y: auto;
}
</style>