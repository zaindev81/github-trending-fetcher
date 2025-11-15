<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<div class="app-shell">
	<div class="content">
		<Header />
		<main>{@render children()}</main>
	</div>
</div>
