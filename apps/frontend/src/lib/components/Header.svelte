<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { signInWithGoogle, signOutUser } from '$lib/firebase';
	import { Button } from './ui/button';

	const handleSignin = async () => {
		await signInWithGoogle();
	};

	const handleSignout = async () => {
		await signOutUser();
	};
</script>

<header class="flex flex-col gap-6 border-b border-border/70 pb-6 lg:flex-row lg:items-center">
	<div class="space-y-1">
		<p class="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">GitHub Trending</p>
		<h1 class="text-3xl font-semibold tracking-tight text-foreground">Workspace Dashboard</h1>
		<p class="text-base text-muted-foreground">
			View the latest Firestore snapshots straight from the scheduled sync.
		</p>
	</div>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:ml-auto">
		{#if $user}
			<div class="flex flex-1 items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 sm:flex-none">
				<img
					src={$user.photoURL ?? 'https://avatars.githubusercontent.com/u/0?v=4'}
					alt="Avatar"
					class="h-11 w-11 rounded-2xl border object-cover"
				/>
				<div class="space-y-0.5 text-sm">
					<p class="font-semibold text-foreground">{$user.displayName}</p>
					<p class="text-xs text-muted-foreground truncate max-w-[12rem]">{$user.email}</p>
				</div>
			</div>
			<Button variant="outline" class="w-full sm:w-auto" on:click={handleSignout}>Sign out</Button>
		{:else}
			<Button class="w-full sm:w-auto" on:click={handleSignin}>Sign in with Google</Button>
		{/if}
	</div>
</header>
