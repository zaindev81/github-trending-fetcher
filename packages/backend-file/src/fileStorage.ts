import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  type ExistingData,
  type LanguageMap,
  type SlimRepo,
  type TrendingStore,
  getYearMonth,
  upsertByUrl
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

function readFile(filePath: string): ExistingData {
  const defaultData = createDefaultData();

  if (!fs.existsSync(filePath)) {
    return defaultData;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return { ...defaultData, ...parsed };
  } catch (e) {
    console.error("Failed to read existing JSON:", e);
    return defaultData;
  }
}

function writeFile(filePath: string, data: ExistingData): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Saved results: ${filePath}`);
}

export class FileTrendingStore implements TrendingStore {
  constructor(private readonly filePath: string = resolveWorkspaceFile()) {}

  async upsert(language: string, repositories: SlimRepo[]): Promise<void> {
    if (!language) return;
    const data = readFile(this.filePath);
    if (!Array.isArray(data[language])) {
      data[language] = [];
    }

    for (const repo of repositories) {
      upsertByUrl(data[language], repo);
    }

    writeFile(this.filePath, data);
  }

  async read(language?: string): Promise<LanguageMap> {
    const data = readFile(this.filePath);
    if (!language) return data;
    return { [language]: data[language] ?? [] };
  }
}
