<script lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "$lib/components/ui/card";
import { Label } from "$lib/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
import { RangeCalendar } from "$lib/components/ui/range-calendar";
import { cn } from "$lib/utils";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import {
  fetchTrendingSnapshots,
    type TrendingSnapshot
} from "$lib/api";
import { loadingUser, user } from "$lib/stores/auth";
import { signInWithGoogle } from "$lib/firebase";

  type Status = "idle" | "loading" | "success" | "error";

  const languages = ["typescript", "go", "rust", "python"];
  const sinceOptions: Array<{ label: string; value: "daily" | "weekly" | "monthly" }> = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" }
  ];

  const statusCopy: Record<Status, string> = {
    idle: "Waiting for filters",
    loading: "Fetching snapshots…",
    success: "Results ready",
    error: "Unable to fetch"
  };

  const statusClasses: Record<Status, string> = {
    idle: "bg-muted text-muted-foreground",
    loading: "bg-primary/15 text-primary",
    success: "bg-emerald-50 text-emerald-700",
    error: "bg-destructive/15 text-destructive"
  };

const timezone = getLocalTimeZone();
const initialDate = today(timezone);
const initialIso = initialDate.toString();

let selectedLanguage = "typescript";
let selectedSince: "daily" | "weekly" | "monthly" = "daily";
let selectedMonth: string = initialIso.slice(0, 7);
let selectedDay: string = initialIso;
let calendarValue: { start: DateValue; end: DateValue } | undefined = {
  start: initialDate,
  end: initialDate
};

  let status: Status = "idle";
  let errorMessage = "";
  let lastFetchedAt = "";
  let snapshots: TrendingSnapshot[] = [];

function handleLanguageTab(language: string): void {
  selectedLanguage = language;
}

async function refreshData(): Promise<void> {
  if (!$user) {
    errorMessage = "Sign in to load data.";
      status = "error";
      return;
    }
    status = "loading";
    errorMessage = "";

    try {
      const response = await fetchTrendingSnapshots({
        language: selectedLanguage,
        since: selectedSince,
        month: selectedMonth || undefined,
        day: selectedDay || undefined
      });

      snapshots = response.data;
      status = "success";
      lastFetchedAt = new Date().toLocaleString();
    } catch (error) {
      status = "error";
      errorMessage =
        error instanceof Error ? error.message : "Failed to fetch trending data. Please try again.";
    }
  }

function handleFormSubmit(event: SubmitEvent): void {
  event.preventDefault();
}

async function handleInlineSignIn(): Promise<void> {
  await signInWithGoogle();
}

$: {
  const activeDate = calendarValue?.end ?? calendarValue?.start ?? null;
  if (activeDate) {
    const iso = activeDate.toString();
    selectedDay = iso;
    selectedMonth = iso.slice(0, 7);
  }
}

$: isLoading = status === "loading";
$: disableFetch = !$user || isLoading;

// Auto-fetch when user is signed in and filter changes
$: if ($user && !$loadingUser) {
  void refreshData();
}
</script>

<svelte:head>
  <title>Trending Workspace</title>
  <meta name="description" content="View and explore GitHub trending snapshots stored in Firebase." />
</svelte:head>

<Card class="bg-card/80 shadow-lg">
  <CardHeader class="space-y-3">
    <CardTitle>Snapshot filters</CardTitle>
    <CardDescription>
      Pick a language, time range, and optional date constraints before fetching Firestore snapshots.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form class="space-y-6" on:submit={handleFormSubmit}>
      <div class="space-y-2">
        <Label for="language-tabs">Language</Label>
        <div
          id="language-tabs"
          class="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/30 p-2"
          role="tablist"
        >
          {#each languages as lang}
            {@const isActive = selectedLanguage === lang}
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              class={cn(
                "rounded-xl px-4 py-2 text-sm font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              on:click={() => handleLanguageTab(lang)}
            >
              {lang}
            </button>
          {/each}
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="since-select">Trending window</Label>
          <Select
            type="single"
            bind:value={selectedSince}
            items={sinceOptions}
          >
            <SelectTrigger id="since-select" class="w-full justify-between">
              <span class="text-sm capitalize" data-slot="select-value">
                {sinceOptions.find(option => option.value === selectedSince)?.label ?? "Choose window"}
              </span>
            </SelectTrigger>
            <SelectContent class="w-full min-w-[220px]">
              {#each sinceOptions as option}
                <SelectItem value={option.value}>{option.label}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="calendar" class="mb-1 block">Snapshot day</Label>
        <div id="calendar" class="inline-block rounded-xl border border-border/70 bg-card/80 p-2">
          <RangeCalendar
            bind:value={calendarValue}
            buttonVariant="ghost"
            captionLayout="dropdown-months"
            weekdayFormat="short"
          />
        </div>
        <p class="text-xs text-muted-foreground">Selected date: {selectedDay}</p>
      </div>

      <div class="flex flex-col gap-4 border-t border-dashed border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-2">
          <span class={`w-max rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}>
            {statusCopy[status]}
          </span>
          {#if lastFetchedAt}
            <p class="text-xs text-muted-foreground">Last synced: {lastFetchedAt}</p>
          {/if}
        </div>
      </div>

      {#if status === "error" && errorMessage}
        <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      {/if}
    </form>
  </CardContent>
</Card>

<Card class="bg-card/70">
  <CardHeader class="space-y-2">
    <CardTitle>Snapshot results</CardTitle>
    <CardDescription>
      {selectedLanguage} · {selectedSince}
    </CardDescription>
  </CardHeader>
  <CardContent class="space-y-6">
    {#if $loadingUser}
      <div class="rounded-3xl border border-border/70 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
        Connecting to Firebase auth…
      </div>
    {:else if !$user}
      <div class="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Authenticate above to view stored snapshots.
      </div>
    {:else if isLoading}
      <div class="animate-pulse rounded-3xl border border-border/70 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
        Gathering the latest trending data…
      </div>
    {:else if snapshots.length === 0}
      <div class="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        No snapshots yet. Adjust filters and click “Fetch snapshots”.
      </div>
    {:else}
      <div class="grid gap-4 md:grid-cols-2">
        {#each snapshots as snapshot}
          {@const topItems = snapshot.items.slice(0, 5)}
          <div class="rounded-2xl border border-border/60 bg-white/90 p-4 shadow-sm">
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {snapshot.day}
              </p>
              <h4 class="text-lg font-semibold capitalize">{snapshot.language}</h4>
              <p class="text-sm text-muted-foreground">
                Trending repositories · {snapshot.since} · {snapshot.items.length} repos
              </p>
            </div>
            <ul class="mt-4 space-y-3 text-sm">
              {#if topItems.length === 0}
                <li class="text-muted-foreground">No repositories matched the thresholds.</li>
              {:else}
                {#each topItems as repo}
                  <li class="flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-muted/10 p-3">
                    <div class="space-y-1">
                      <a
                        href={repo.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        class="font-medium text-primary hover:underline"
                      >
                        {repo.url ?? "Unknown repo"}
                      </a>
                      <p class="text-xs text-muted-foreground">{repo.description ?? "No description"}</p>
                    </div>
                    <span class="text-xs font-semibold text-muted-foreground">
                      {(repo.starsSince ?? 0).toLocaleString()}★
                    </span>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>
        {/each}
      </div>
    {/if}
  </CardContent>
</Card>
