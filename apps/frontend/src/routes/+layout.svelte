<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
	<div
		class="mx-auto max-w-5xl rounded-[32px] border bg-card/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur lg:p-8">
		<Header />
		<main class="space-y-8 pt-6">{@render children()}</main>
	</div>
</div>
