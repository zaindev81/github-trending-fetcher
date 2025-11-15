<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { signInWithGoogle, signOutUser } from '$lib/firebase';

	const handleSignin = async () => {
		await signInWithGoogle();
	};

	const handleSignout = async () => {
		await signOutUser();
	};
</script>

<header>
	<div>
		<p class="eyebrow">GitHub Trending</p>
		<h1>Workspace Dashboard</h1>
	</div>

	<div class="account">
		{#if $user}
			<div class="user-badge">
				<img src={$user.photoURL ?? 'https://avatars.githubusercontent.com/u/0?v=4'} alt="Avatar" />
				<div>
					<p>{$user.displayName}</p>
					<small>{$user.email}</small>
				</div>
			</div>
			<button class="ghost" on:click={handleSignout}>Sign out</button>
		{:else}
			<button on:click={handleSignin}>Sign in with Google</button>
		{/if}
	</div>
</header>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--surface-outline);
	}

	.eyebrow {
		font-size: 0.9rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin: 0;
	}

	h1 {
		margin: 0.2rem 0 0;
		font-size: clamp(1.5rem, 2vw, 2.5rem);
	}

	.account {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	button {
		border-radius: 999px;
		border: none;
		background: var(--accent);
		color: #0b1221;
		padding: 0.65rem 1.25rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 150ms ease, box-shadow 150ms ease;
	}

	button:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 20px rgb(0 0 0 / 0.15);
	}

	.ghost {
		background: transparent;
		color: var(--text-primary);
		border: 1px solid var(--surface-outline);
	}

	.user-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 12rem;
	}

	.user-badge img {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: 1px solid var(--surface-outline);
		object-fit: cover;
	}

	.user-badge p {
		margin: 0;
		font-weight: 600;
	}

	.user-badge small {
		color: var(--text-muted);
	}

	@media (max-width: 720px) {
		header {
			flex-direction: column;
			align-items: flex-start;
		}

		.account {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
