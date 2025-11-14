import fs from "fs";
import path from "path";
import type { ExistingData } from "./types/index.js";
import { getYearMonth } from "./utils/index.js";

export function getOutputFilePath(): string {
  const yearMonth = getYearMonth();
  return path.resolve(`./${yearMonth}.json`);
}

export function loadExistingData(filePath: string): ExistingData {
  const defaultData: ExistingData = {
    rust: [],
    typescript: [],
    python: [],
    go: []
  };

  if (!fs.existsSync(filePath)) {
    return defaultData;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) {
      return defaultData;
    }

    const parsed = JSON.parse(raw);
    if (parsed.rust && parsed.typescript && parsed.python && parsed.go) {
      return parsed as ExistingData;
    }
    return defaultData;
  } catch (e) {
    console.error("Failed to read existing JSON:", e);
    return defaultData;
  }
}

export function saveData(filePath: string, data: ExistingData): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Saved results: ${filePath}`);
}
