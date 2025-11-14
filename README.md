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
   npm run start:file -- --type=repositories --since=daily --lang=typescript
   ```

### CLI Flags

| Flag | Description |
| --- | --- |
| `--type` | Trending type (`repositories` or `developers`). Defaults to `repositories`. |
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
| `SYNC_TYPE` | `repositories` | GitHub Trending type. |
| `SYNC_LANGS` | `typescript,go,rust,python` | Comma‑separated list of languages to sync. |
| `SPOKEN_LANG` | _unset_ | Optional spoken language code passed to GitHub Trending. |

Each job run writes `items` (array of slim repos) and `updatedAt` into the Firestore document keyed by language.

### HTTPS API

`getTrendingApi` is an HTTPS Function that reads the Firestore store:

```
GET https://<region>-<project>.cloudfunctions.net/getTrendingApi?language=typescript
```

* Omit `language` to retrieve all stored languages.
* Responses are cached for 60 seconds and include `Access-Control-Allow-Origin: *` by default.

---

## Development Tips

* The core package must be rebuilt whenever the shared code changes: `npm run build:core`.
* The file backend uses `tsx watch` for a quick feedback loop during development: `npm run dev:file -- --lang=typescript`.
* Firebase admin credentials come from the runtime environment (service account). Ensure your Functions project has Firestore enabled.

---

## Local Firebase Development

To test Firebase Functions locally before deploying to production:

### Prerequisites

1. Install Firebase CLI globally:
   ```sh
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```sh
   firebase login
   ```

3. Install Firebase emulators (first time only):
   ```sh
   firebase init emulators
   ```
   Select **Functions** and **Firestore** emulators.

### Running Locally

1. Build the Firebase backend:
   ```sh
   npm run build:firebase
   ```

2. Start the Firebase emulators:
   ```sh
   cd packages/backend-firebase
   firebase emulators:start
   ```

3. Access the emulator UI at `http://localhost:4000`

### Testing Functions Locally

* **Scheduled Function**: Trigger manually via the Functions emulator UI or using:
  ```sh
  curl http://localhost:5001/<project-id>/<region>/syncTrendingJob
  ```

* **HTTPS Function**: Test the API endpoint:
  ```sh
  curl "http://localhost:5001/<project-id>/<region>/getTrendingApi?language=typescript"
  ```

* **Firestore Data**: View stored data in the Firestore emulator at `http://localhost:4000/firestore`

### Environment Variables for Local Development

Create a `.env` file in `packages/backend-firebase/` with your configuration:

```env
SYNC_SCHEDULE=0 2 * * *
SYNC_TIMEZONE=Etc/UTC
SYNC_SINCE=daily
SYNC_TYPE=repositories
SYNC_LANGS=typescript,go,rust,python
```

The emulators use local storage, so all data is ephemeral and won't affect your production Firestore database.

---

## License

MIT
