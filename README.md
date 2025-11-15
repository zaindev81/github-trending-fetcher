# GitHub Trending Workspace

A modern workspace that tracks GitHub Trending data with a shared core and two backend options:

1. **Local file backend** – write slim repo data into `{YYYY-MM}.json` inside the workspace.
2. **Firebase backend** – schedule a Cloud Function job that writes the same slim data into Firestore and expose it via an HTTPS Function.

Both backends use the shared `@github-trending/core` package so that fetching logic, filters, and types stay perfectly aligned.

---

## Workspace Layout

| Package | Description |
| --- | --- |
| `@github-trending/core` | Shared fetcher, constants, and type definitions. Compiles to ESM in `dist/`. |
| `@github-trending/backend-file` | CLI for local runs. Uses the core package plus a file-based store. |
| `@github-trending/backend-firebase` | Firebase Functions entry. Includes a Firestore store, cron job, and HTTPS API. |
| `frontend` | SvelteKit dashboard with Google Sign-In that visualises snapshots via the HTTPS API. |

Install dependencies once at the root:

```sh
npm install
```

---

## Shared Concepts

* **Languages** – default to `typescript`, `go`, `rust`, `python`. Override via env or CLI.
* **Time range** – `daily`, `weekly`, or `monthly`.
* **Star thresholds** – see `packages/core/src/constants.ts` to adjust filtering for each language.
* **Slim repo payload** – a deduped object with URL, description, star counts, and `dateAdded` for storage-friendly snapshots.

---

## Local File Backend

1. Build the shared core once:
   ```sh
   npm run build:core
   ```
2. Run the CLI (arguments mirror the legacy script):
   ```sh
   npm run start:file -- --since=daily --lang=typescript
   ```

### CLI Flags

| Flag | Description |
| --- | --- |
| `--since` | Time range (`daily`, `weekly`, `monthly`). Defaults to `daily`. |
| `--lang` | Target language or `all`. Defaults to `null` (no fetch). |
| `--spoken` | Optional GitHub spoken language code. |

Results are appended to `./{YYYY-MM}.json` in the workspace root. Each invocation deduplicates entries by URL using the shared helper from the core package.

---

## Firebase Backend

### Build

Compile the functions bundle before deploying:

```sh
npm run build:firebase
```

The output lives in `packages/backend-firebase/dist` and can be deployed with the Firebase CLI (outside the scope of this repo).

### Cloud Scheduler Job

`syncTrendingJob` runs the fetcher within a Cloud Function and writes slim repos into Firestore (`trending/{language}`). Configure via environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SYNC_SCHEDULE` | `0 2 * * *` | Cron expression for the scheduler trigger. |
| `SYNC_TIMEZONE` | `Etc/UTC` | Timezone for the cron schedule. |
| `SYNC_SINCE` | `daily` | Which trending range to pull. Accepts `daily`, `weekly`, `monthly`. |
| `SYNC_LANGS` | `typescript,go,rust,python` | Comma‑separated list of languages to sync. |
| `SPOKEN_LANG` | _unset_ | Optional spoken language code passed to GitHub Trending. |

Each job run writes a daily snapshot document to the `trendingSnapshots` collection:

| Field | Example | Description |
| --- | --- | --- |
| `language` | `typescript` | GitHub language key. |
| `since` | `daily` | Trending window. |
| `month` | `2025-11` | Month bucket for easy querying. |
| `day` | `2025-11-14` | ISO date of the fetch job. |
| `items` | `[SlimRepo, ...]` | Array of slim repositories captured on that day. |
| `updatedAt` | server timestamp | Managed by Firestore. |

### HTTPS API

`getTrendingApi` is an HTTPS Function that reads the Firestore store:

```
GET https://<region>-<project>.cloudfunctions.net/getTrendingApi?language=typescript
```

The API supports filtering and grouping so consumers can view data for a month or a specific day:

| Query | Example | Description |
| --- | --- | --- |
| `language` | `language=rust` | Filter by GitHub language. |
| `since` | `since=weekly` | Filter by trending window. |
| `month` | `month=2025-11` | Narrow results to a specific month bucket. |
| `day` | `day=2025-11-14` | Fetch a single day snapshot. |
| `groupBy` | `groupBy=month` | Optional grouping (`month`, `day`). |

Example: `GET .../getTrendingApi?language=typescript&month=2025-11&groupBy=day` returns all TypeScript snapshots for November grouped by day, allowing clients to page through the buckets without manual aggregation.

Responses are cached for 60 seconds and include `Access-Control-Allow-Origin: *` by default.

---

## Development Tips

* The core package must be rebuilt whenever the shared code changes: `npm run build:core`.
* The file backend uses `tsx watch` for a quick feedback loop during development: `npm run dev:file -- --lang=typescript`.
* Firebase admin credentials come from the runtime environment (service account). Ensure your Functions project has Firestore enabled.

### Troubleshooting

**PostCSS/Tailwind CSS Error**: If you see an error about `tailwindcss` as a PostCSS plugin, ensure `postcss.config.cjs` uses `@tailwindcss/postcss`:

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
};
```

This project uses Tailwind CSS v4, which requires `@tailwindcss/postcss` instead of the old `tailwindcss` plugin name.

---

## Svelte Frontend

`apps/frontend` contains a SvelteKit dashboard that authenticates with **Firebase Google Sign-In** and fetches snapshots from the deployed HTTPS Function. Users can filter by language, month, and exact day, then view grouped cards that highlight the hottest repositories. The UI only enables data fetching after a Google account is connected.

### Environment

Copy the example file and fill in your Firebase web app + Cloud Function endpoint:

```sh
cp apps/frontend/.env.example apps/frontend/.env
```

| Variable | Description |
| --- | --- |
| `PUBLIC_FIREBASE_API_KEY` | Firebase web app API key. |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (`project.firebaseapp.com`). |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project id. |
| `PUBLIC_FIREBASE_APP_ID` | Firebase web app id. |
| `PUBLIC_TRENDING_API_BASE_URL` | HTTPS Function URL (e.g. `https://<region>-<project>.cloudfunctions.net/getTrendingApi`). |

### Run locally

```sh
npm run dev:frontend
```

Open the printed URL (default `http://localhost:5173`) to sign in with Google and start exploring stored trends. The build step `npm run build:frontend` compiles the static and server bundles placed under `apps/frontend/.svelte-kit`.

---

## Local Firebase Development

To test Firebase Functions locally before deploying to production:

### Prerequisites

1. Install Firebase CLI globally (if not already installed):
   ```sh
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```sh
   firebase login
   ```

### Initial Setup (One-time)

The Firebase configuration is already set up in `packages/backend-firebase/`. The key files are:

- `firebase.json` - Firebase project configuration
- `.firebaserc` - Project alias configuration
- `firestore.rules` - Firestore security rules

### Running Locally

1. **Build the core package** (required first):
   ```sh
   npm run build:core
   ```

2. **Build the Firebase functions**:
   ```sh
   npm run build:firebase
   ```

3. **Navigate to the Firebase backend directory**:
   ```sh
   cd packages/backend-firebase
   ```

4. **Start the Firebase emulators**:
   ```sh
   firebase emulators:start --project=<project-id>
   ```

   This will start:
   - Functions emulator on `http://localhost:5001`
   - Firestore emulator on `http://localhost:8080`
   - Emulator UI on `http://localhost:4000`

### Testing Functions Locally

Once the emulators are running:

#### Test the HTTPS Function

```sh
# Get trending repos for a specific language
curl "http://localhost:5001/<project-id>/<region>/getTrendingApi?language=typescript"

# Get all languages
curl "http://localhost:5001/<project-id>/<region>/getTrendingApi"
```

#### Trigger the Scheduled Function

```sh
curl -X POST http://localhost:5001/<project-id>/<region>/syncTrendingJob-0
```

#### View Firestore Data

Open the Emulator UI at `http://localhost:4000` and navigate to the Firestore tab to see the stored data.

### Environment Variables for Local Development

Create a `.env.local` file in `packages/backend-firebase/` (optional):

```env
SYNC_SINCE=daily
SYNC_LANGS=typescript,go,rust,python
```

Note: Environment variables are primarily for production. For local testing, you can modify the code directly or use the defaults.

### Quick Test Workflow

```sh
# From the workspace root
npm run build:core
npm run build:firebase
cd packages/backend-firebase
firebase emulators:start --project=<project-id>

# In another terminal, test the function
curl -X POST http://localhost:5001/<project-id>/<region>/syncTrendingJob-0

# Then query the data
curl "http://localhost:5001/<project-id>/<region>/getTrendingApi?language=typescript"
```

The emulators use local storage, so all data is ephemeral and won't affect your production Firestore database.

---

## License

MIT
