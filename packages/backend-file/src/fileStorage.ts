import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  type ExistingData,
  type TrendingSnapshot,
  type TrendingStore,
  type TrendingQuery,
  type SlimRepo,
  getYearMonth
} from "@github-trending/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = process.env.FILE_BACKEND_DATA_DIR
  ? path.resolve(process.env.FILE_BACKEND_DATA_DIR)
  : path.resolve(__dirname, "../../..");

function createDefaultData(): ExistingData {
  return {
    rust: [],
    typescript: [],
    python: [],
    go: []
  };
}

export function resolveWorkspaceFile(): string {
  const yearMonth = getYearMonth();
  return path.resolve(DEFAULT_DATA_DIR, `${yearMonth}.json`);
}

function getMonthFromFilePath(filePath: string): string | null {
  const filename = path.basename(filePath, ".json");
  return /^\d{4}-\d{2}$/.test(filename) ? filename : null;
}

function normalizeData(parsed: any, filePath: string): ExistingData {
  const defaultData = createDefaultData();
  if (!parsed || typeof parsed !== "object") return defaultData;
  const monthFromFile = getMonthFromFilePath(filePath) ?? getYearMonth();

  const result: ExistingData = { ...defaultData };
  for (const [language, value] of Object.entries(parsed)) {
    if (!Array.isArray(value)) {
      result[language] = [];
      continue;
    }

    if (value.some(item => item && typeof item === "object" && "items" in item)) {
      // Already in snapshot format
      result[language] = value as TrendingSnapshot[];
    } else {
      // Legacy format: array of SlimRepo entries
      result[language] = [
        {
          language,
          type: "repositories",
          since: "daily",
          month: monthFromFile,
          day: `${monthFromFile}-01`,
          items: value as SlimRepo[]
        }
      ];
    }
  }
  return result;
}

function readFile(filePath: string): ExistingData {
  if (!fs.existsSync(filePath)) {
    return createDefaultData();
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw);
    return normalizeData(parsed, filePath);
  } catch (e) {
    console.error("Failed to read existing JSON:", e);
    return createDefaultData();
  }
}

function writeFile(filePath: string, data: ExistingData): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Saved results: ${filePath}`);
}

function matchesQuery(snapshot: TrendingSnapshot, query: TrendingQuery): boolean {
  if (query.language && snapshot.language !== query.language) return false;
  if (query.type && snapshot.type !== query.type) return false;
  if (query.since && snapshot.since !== query.since) return false;
  if (query.month && snapshot.month !== query.month) return false;
  if (query.day && snapshot.day !== query.day) return false;
  return true;
}

export class FileTrendingStore implements TrendingStore {
  constructor(private readonly filePath: string = resolveWorkspaceFile()) {}

  async upsert(snapshot: TrendingSnapshot): Promise<void> {
    const data = readFile(this.filePath);
    const languageEntries = data[snapshot.language] ?? [];

    const idx = languageEntries.findIndex(
      entry =>
        entry.day === snapshot.day &&
        entry.type === snapshot.type &&
        entry.since === snapshot.since
    );

    if (idx >= 0) {
      languageEntries[idx] = snapshot;
    } else {
      languageEntries.push(snapshot);
    }

    data[snapshot.language] = languageEntries;
    writeFile(this.filePath, data);
  }

  async read(query: TrendingQuery = {}): Promise<TrendingSnapshot[]> {
    const data = readFile(this.filePath);
    const snapshots = Object.values(data).flat();
    return snapshots.filter(snapshot => matchesQuery(snapshot, query));
  }
}
