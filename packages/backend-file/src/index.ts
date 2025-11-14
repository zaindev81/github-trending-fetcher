import {
  type TypeKind,
  type Since,
  type SlimRepo,
  STAR_THRESHOLDS,
  MULTI_LANGS,
  getArg,
  getToday,
  fetchTrending
} from "@github-trending/core";
import { FileTrendingStore } from "./fileStorage.js";

const type = getArg("type", "repositories") as TypeKind;
const since = getArg("since", "daily") as Since;
const lang = getArg("lang", null);
const spoken = getArg("spoken", null);

async function main(): Promise<void> {
  const store = new FileTrendingStore();

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

    await store.upsert(language, slimList);
  };

  if (lang === "all") {
    for (const l of MULTI_LANGS) {
      await handleOneLanguage(l);
      await new Promise(r => setTimeout(r, 500));
    }
  } else if (lang) {
    await handleOneLanguage(lang);
  }

  console.log("File backend sync complete");
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
