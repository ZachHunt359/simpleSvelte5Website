<script lang="ts">
    import '../styles/main.css';
    export let data;
    import { session } from "$lib/stores/session";
    $: session.user = data.user;
</script>


<slot />