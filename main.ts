import type { TypeKind, Since, SlimRepo } from "./src/types/index.js";
import { STAR_THRESHOLDS, MULTI_LANGS } from "./src/constants.js";
import { getArg, getToday, upsertByUrl } from "./src/utils/index.js";
import { fetchTrending } from "./src/fetcher.js";
import { getOutputFilePath, loadExistingData, saveData } from "./src/dataManager.js";

const type = getArg("type", "repositories") as TypeKind;
const since = getArg("since", "daily") as Since;
const lang = getArg("lang", null);
const spoken = getArg("spoken", null);

async function main(): Promise<void> {
  const OUTPUT_FILE = getOutputFilePath();
  const existingData = loadExistingData(OUTPUT_FILE);

  const handleOneLanguage = async (language: string) => {
    const data = await fetchTrending(type, { language, since, spokenLanguageCode: spoken });
    const threshold = STAR_THRESHOLDS[language] ?? 0;

    const filtered = data.filter(repo => (repo.starsSince ?? 0) >= threshold);

    const today = getToday();
    const slimList: SlimRepo[] = filtered.map(r => ({
      url: r.url,
      description: r.description,
      stars: Math.trunc(r.stars),
      starsSince: r.starsSince ?? 0,
      dateAdded: today
    }));

    for (const item of slimList) {
      upsertByUrl(existingData[language as keyof typeof existingData], item);
    }
  };

  if (lang === "all") {
    for (const l of MULTI_LANGS) {
      await handleOneLanguage(l);
      await new Promise(r => setTimeout(r, 500));
    }
  } else if (lang) {
    await handleOneLanguage(lang);
  }

  saveData(OUTPUT_FILE, existingData);
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});