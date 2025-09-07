# GitHub Trending Fetcher

A simple CLI tool to fetch **trending repositories** from [GitHub Trending](https://github.com/trending).

## Features

* Fetch trending repositories for a specific language.
* Supports multiple time ranges (`daily`, `weekly`, `monthly`).
* Lightweight and easy to run using `tsx`.

---

## Installation


```sh
npm install
```

---

## Usage

### Fetch Trending Repositories

Run the following command to fetch trending repositories for a specific language:

```sh
npx tsx trending.ts --type=repositories --since=daily --lang=typescript
```

### Example Commands

```sh
# Fetch daily trending repositories for TypeScript
npx tsx trending.ts --type=repositories --since=daily --lang=typescript

# Fetch daily trending repositories for Go
npx tsx trending.ts --type=repositories --since=daily --lang=go

# Fetch daily trending repositories for Rust
npx tsx trending.ts --type=repositories --since=daily --lang=rust

# Fetch daily trending repositories for Python
npx tsx trending.ts --type=repositories --since=daily --lang=python
```

### Fetch All Languages

```sh
npx tsx trending.ts --type=repositories --since=daily --lang=all
```

---

## Language Limits

When fetching repositories, a maximum limit is applied for each language:

| Language   | Limit |
| ---------- | ----- |
| Go         | 50    |
| Rust       | 50    |
| Python     | 80    |
| TypeScript | 80    |

---

## Options

| Option    | Description                               | Example               |
| --------- | ----------------------------------------- | --------------------- |
| `--type`  | Data type to fetch (`repositories`)       | `--type=repositories` |
| `--since` | Time range (`daily`, `weekly`, `monthly`) | `--since=daily`       |
| `--lang`  | Programming language or `all`             | `--lang=typescript`   |

---

## Example Output

Example output for TypeScript trending:

```json
[
  {
    "owner": "vercel",
    "repo": "next.js",
    "url": "https://github.com/vercel/next.js",
    "description": "The React Framework for Production",
    "language": "TypeScript",
    "stars": 120000,
    "forks": 25000,
    "starsSince": 1500,
    "contributors": ["user1", "user2"]
  }
]
```

---

## License

MIT License