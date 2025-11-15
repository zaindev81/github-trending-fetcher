<script lang="ts">
	import {
		fetchTrendingSnapshots,
		type TrendGroupKey,
		type TrendingSnapshot
	} from '$lib/api';
	import { loadingUser, user } from '$lib/stores/auth';

	type Status = 'idle' | 'loading' | 'success' | 'error';

	const languages = ['typescript', 'go', 'rust', 'python'];
	const sinceOptions: Array<{ label: string; value: 'daily' | 'weekly' | 'monthly' }> = [
		{ label: 'Daily', value: 'daily' },
		{ label: 'Weekly', value: 'weekly' },
		{ label: 'Monthly', value: 'monthly' }
	];
	const groupOptions: Array<{ label: string; value: TrendGroupKey }> = [
		{ label: 'By Day', value: 'day' },
		{ label: 'By Month', value: 'month' }
	];

	const now = new Date();
	const defaultMonth = now.toISOString().slice(0, 7);

	let selectedLanguage = 'typescript';
	let selectedSince: 'daily' | 'weekly' | 'monthly' = 'daily';
	let selectedMonth: string = defaultMonth;
	let selectedDay: string = '';
let selectedGroup: TrendGroupKey = 'day';

	let status: Status = 'idle';
	let errorMessage = '';
	let lastFetchedAt = '';
	let snapshots: TrendingSnapshot[] = [];
	let groupedResult: Record<string, TrendingSnapshot[]> | null = null;

	function handleDayChange(value: string) {
		selectedDay = value;
		if (value) {
			selectedMonth = value.slice(0, 7);
		}
	}

	async function refreshData() {
		if (!$user) {
			errorMessage = 'Sign in to load data.';
			return;
		}
		status = 'loading';
		errorMessage = '';

		try {
			const response = await fetchTrendingSnapshots({
				language: selectedLanguage,
				since: selectedSince,
				month: selectedMonth || undefined,
				day: selectedDay || undefined,
				groupBy: selectedGroup
			});

			snapshots = response.data;
			groupedResult = response.groupedBy && response.groups ? response.groups : null;
			status = 'success';
			lastFetchedAt = new Date().toLocaleString();
		} catch (error) {
			status = 'error';
			errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to fetch trending data. Please try again.';
		}
	}

	function handleFormSubmit(event: SubmitEvent) {
		event.preventDefault();
		void refreshData();
	}

	$: isLoading = status === 'loading';
</script>

<svelte:head>
	<title>Trending Workspace</title>
	<meta name="description" content="View and explore GitHub trending snapshots stored in Firebase." />
</svelte:head>

{#if $loadingUser}
	<section class="panel">
		<p class="muted">Connecting to Firebase auth…</p>
	</section>
{:else}
	{#if !$user}
		<section class="panel">
			<h2>Authenticate to continue</h2>
			<p class="muted">
				Sign in with your Google account to fetch the latest trending snapshots from Firebase.
			</p>
		</section>
	{/if}

	<section class="panel">
		<form class="filters" on:submit={handleFormSubmit}>
			<div class="field-grid">
				<label>
					<span>Language</span>
					<select bind:value={selectedLanguage}>
						{#each languages as lang}
							<option value={lang}>{lang}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Trending Window</span>
					<select bind:value={selectedSince}>
						{#each sinceOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Month</span>
					<input type="month" bind:value={selectedMonth} max={defaultMonth} />
				</label>

				<label>
					<span>Specific day (optional)</span>
					<input type="date" bind:value={selectedDay} on:change={(event) => handleDayChange(event.currentTarget.value)} />
				</label>

				<label>
					<span>Group results</span>
					<select bind:value={selectedGroup}>
						{#each groupOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="filters__actions">
				<button type="submit" disabled={isLoading || !$user}>
					{#if isLoading}
						Loading…
					{:else}
						Fetch snapshots
					{/if}
				</button>
				{#if lastFetchedAt}
					<span class="muted">
						Last synced: {lastFetchedAt}
					</span>
				{/if}
			</div>
		</form>

		{#if !$user}
			<p class="muted small">Sign in to enable the fetch button.</p>
		{/if}

		{#if status === 'error'}
			<div class="error-banner">
				<p>{errorMessage}</p>
			</div>
		{/if}
	</section>

	<section class="panel">
		{#if isLoading}
			<p class="muted">Gathering the latest trending data…</p>
		{:else if snapshots.length === 0}
			<p class="muted">No snapshots yet. Adjust filters and click “Fetch snapshots”.</p>
		{:else}
			{#if groupedResult}
				{#each Object.entries(groupedResult) as [groupKey, groupSnapshots]}
					<article class="snapshot-group">
						<header>
							<span class="eyebrow">Group</span>
							<h2>{groupKey}</h2>
							<p>{groupSnapshots.length} snapshot{groupSnapshots.length > 1 ? 's' : ''}</p>
						</header>

						<div class="snapshot-grid">
							{#each groupSnapshots as snapshot}
								{@const topItems = snapshot.items.slice(0, 5)}
								<div class="snapshot-card">
									<div class="snapshot-meta">
										<p class="eyebrow">{snapshot.day}</p>
										<h3>{snapshot.language}</h3>
										<p class="muted">
											Trending repositories · {snapshot.since} · {snapshot.items.length} repos
										</p>
									</div>
									<ul>
										{#if topItems.length === 0}
											<li class="muted">No repositories matched the thresholds.</li>
										{:else}
											{#each topItems as repo}
												<li>
													<div>
														<a href={repo.url ?? '#'} target="_blank" rel="noreferrer">
															{repo.url ?? 'Unknown repo'}
														</a>
														<p class="muted">{repo.description ?? 'No description'}</p>
													</div>
													<span>{repo.starsSince ?? 0}★</span>
												</li>
											{/each}
										{/if}
									</ul>
								</div>
							{/each}
						</div>
					</article>
				{/each}
			{:else}
				<article class="snapshot-group">
					<header>
						<span class="eyebrow">Results</span>
						<h2>{snapshots.length} snapshot{snapshots.length > 1 ? 's' : ''}</h2>
					</header>
					<div class="snapshot-grid">
						{#each snapshots as snapshot}
							<div class="snapshot-card">
								<div class="snapshot-meta">
									<p class="eyebrow">{snapshot.day}</p>
									<h3>{snapshot.language}</h3>
									<p class="muted">
										Trending repositories · {snapshot.since} · {snapshot.items.length} repos
									</p>
								</div>
								<ul>
									{#each snapshot.items.slice(0, 5) as repo}
										<li>
											<div>
												<a href={repo.url ?? '#'} target="_blank" rel="noreferrer">
													{repo.url ?? 'Unknown repo'}
												</a>
												<p class="muted">{repo.description ?? 'No description'}</p>
											</div>
											<span>{repo.starsSince ?? 0}★</span>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				</article>
			{/if}
		{/if}
	</section>
{/if}

<style>
	.panel {
		background: var(--surface);
		border: 1px solid var(--surface-outline);
		border-radius: 24px;
		padding: 1.5rem;
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.02);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.9rem;
	}

	select,
	input {
		border-radius: 14px;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--surface-outline);
		background: var(--surface-alt);
		color: var(--text-primary);
	}

	.filters__actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	button {
		border: none;
		background: linear-gradient(120deg, #4cf4c6, #2fe6ff);
		color: #05060d;
		font-weight: 600;
		padding: 0.8rem 1.5rem;
		border-radius: 999px;
		cursor: pointer;
		min-width: 180px;
		box-shadow: 0 8px 25px rgb(76 244 198 / 0.35);
		transition: transform 150ms ease;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	button:not(:disabled):hover {
		transform: translateY(-1px);
	}

	.muted {
		color: var(--text-muted);
	}

	.muted.small {
		font-size: 0.85rem;
	}

	.error-banner {
		margin-top: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 16px;
		background: rgba(255, 107, 107, 0.12);
		border: 1px solid rgba(255, 107, 107, 0.35);
		color: var(--danger);
	}

	.snapshot-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--surface-outline);
	}

	.snapshot-group:last-child {
		border-bottom: none;
	}

	.snapshot-group header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.snapshot-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.snapshot-card {
		background: var(--surface-alt);
		border-radius: 18px;
		padding: 1rem;
		border: 1px solid var(--surface-outline);
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.snapshot-meta h3 {
		margin: 0.2rem 0;
		font-size: 1.05rem;
	}

	.eyebrow {
		text-transform: uppercase;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		color: var(--text-muted);
	}

	.snapshot-card ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.snapshot-card li {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		border-bottom: 1px solid rgb(255 255 255 / 0.08);
		padding-bottom: 0.5rem;
	}

	.snapshot-card li:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.snapshot-card a {
		color: var(--text-primary);
		font-weight: 600;
		word-break: break-all;
	}

	.snapshot-card span {
		font-weight: 700;
		color: var(--accent);
		white-space: nowrap;
		min-width: 3rem;
		text-align: right;
	}
</style>
