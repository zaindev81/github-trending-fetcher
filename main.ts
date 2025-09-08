import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

type Since = "daily" | "weekly" | "monthly";
type TypeKind = "repositories" | "developers";

interface TrendingRepo {
  owner: string;
  repo: string;
  url: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  starsSince: number | null;
}

interface SlimRepo {
  url: string | null;
  description: string | null;
  stars: number;
  starsSince: number | null;
  dateAdded: string;
}

interface FetchOptions {
  language?: string | null;
  since?: Since;
  spokenLanguageCode?: string | null;
}

const UA = "Mozilla/5.0 (compatible; TrendingFetcher/1.0)";
const GITHUB_TRENDING_URL = "https://github.com/trending";
const MULTI_LANGS = ["typescript", "go", "rust", "python"] as const;

const STAR_THRESHOLDS: Record<string, number> = {
  go: 50,
  rust: 50,
  python: 80,
  typescript: 80,
} as const;

function buildUrl(type: TypeKind, { language = null, since = "daily", spokenLanguageCode = null }: FetchOptions): string {
  const path = type === "developers" ? "/developers" : "";
  const langSeg = language ? `/${encodeURIComponent(language)}` : "";
  const u = new URL(`${GITHUB_TRENDING_URL}${langSeg}${path}`);
  u.searchParams.set("since", since);
  if (spokenLanguageCode) u.searchParams.set("spoken_language_code", spokenLanguageCode);
  return u.toString();
}

function parseStarsSinceText(raw: string, since: Since): number | null {
  const t = raw.trim();
  if (!t) return null;

  const patterns: Record<Since, RegExp> = {
    daily: /([\d,]+)\s+stars?\s+today/i,
    weekly: /([\d,]+)\s+stars?\s+this\s+week/i,
    monthly: /([\d,]+)\s+stars?\s+this\s+month/i,
  };

  let m = t.match(patterns[since]);
  if (!m) {
    m = t.match(/([\d,]+)\s+stars?\s+(today|this\s+week|this\s+month)/i);
  }
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

async function fetchTrending(
  type: TypeKind = "repositories",
  opts: FetchOptions = {}
): Promise<TrendingRepo[]> {
  const { since = "daily" } = opts;
  const url = buildUrl(type, opts);

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} -> ${url}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const repos: TrendingRepo[] = [];
  $("article.Box-row").each((_, el) => {
    const $el = $(el);
    const titleText = $el.find("h2 a").text().trim().replace(/\s/g, "");
    const [owner = "", repo = ""] = titleText.split("/");

    const repoHref = $el.find("h2 a").attr("href");
    const repoUrl = repoHref ? `https://github.com${repoHref}` : null;

    const description =
      $el.find("p.col-9.color-fg-muted.my-1.pr-4").text().trim() ||
      $el.find("p.color-fg-muted.my-1").text().trim() ||
      null;

    const starText = $el.find('a[href$="/stargazers"]').first().text().trim().replace(/,/g, "");
    const stars = Number(starText) || 0;

    const rightText =
      $el.find(".float-sm-right").text().trim() ||
      $el.find("span.d-inline-block.float-sm-right").text().trim() ||
      "";
    const starsSince = parseStarsSinceText(rightText, since);

    repos.push({
      owner,
      repo,
      url: repoUrl,
      description,
      language: null,
      stars,
      starsSince
    });
  });
  return repos;
}

function upsertByUrl(arr: SlimRepo[], incoming: SlimRepo) {
  if (!incoming.url) return;
  const idx = arr.findIndex(x => x.url === incoming.url);
  if (idx >= 0) {
    arr[idx].stars = incoming.stars;
    arr[idx].starsSince = incoming.starsSince;
    arr[idx].description = incoming.description;
  } else {
    arr.push(incoming);
  }
}

const getArg = (name: string, def: string | null = null) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;

const type = (getArg("type", "repositories") as TypeKind);
const since = (getArg("since", "daily") as Since);
const lang = getArg("lang", null);
const spoken = getArg("spoken", null);

const now = new Date();
const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const OUTPUT_FILE = path.resolve(`./${yearMonth}.json`);

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function main(): Promise<void> {
  let existingData: Record<string, SlimRepo[]> = {
    rust: [],
    typescript: [],
    python: [],
    go: []
  };
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const raw = fs.readFileSync(OUTPUT_FILE, "utf-8").trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.rust && parsed.typescript && parsed.python && parsed.go) {
          existingData = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to read existing JSON:", e);
    }
  }

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

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2), "utf-8");
  console.log(`Saved results: ${OUTPUT_FILE}`);
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});