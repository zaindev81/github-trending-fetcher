import { onRequest, type Request as FunctionsRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import {
  type Since,
  type SlimRepo,
  type TypeKind,
  type TrendingSnapshot,
  type TrendingQuery,
  MULTI_LANGS,
  STAR_THRESHOLDS,
  fetchTrending,
  getToday,
  getYearMonth
} from "@github-trending/core";
import { FirestoreTrendingStore } from "./firestoreStore.js";

const store = new FirestoreTrendingStore();
const DEFAULT_SCHEDULE = "0 2 * * *"; // every day at 02:00 UTC
const DEFAULT_TYPE: TypeKind = "repositories";
const DEFAULT_SINCE: Since = "daily";

function resolveLanguages(): readonly string[] {
  const envValue = process.env.SYNC_LANGS;
  if (!envValue) return MULTI_LANGS;
  return envValue.split(",").map(l => l.trim()).filter(Boolean);
}

function resolveSchedule(): string {
  return process.env.SYNC_SCHEDULE || DEFAULT_SCHEDULE;
}

function resolveSince(): Since {
  if (process.env.SYNC_SINCE === "weekly" || process.env.SYNC_SINCE === "monthly") {
    return process.env.SYNC_SINCE;
  }
  return DEFAULT_SINCE;
}

async function syncLanguage(language: string, since: Since, type: TypeKind): Promise<void> {
  const spokenLanguageCode = process.env.SPOKEN_LANG || null;
  const data = await fetchTrending(type, { language, since, spokenLanguageCode });
  const threshold = STAR_THRESHOLDS[language] ?? 0;
  const filtered = data.filter(repo => (repo.starsSince ?? 0) >= threshold);

  const today = getToday();
  const monthKey = getYearMonth();
  const slimList: SlimRepo[] = filtered.map(repo => ({
    url: repo.url,
    description: repo.description,
    stars: Math.trunc(repo.stars),
    starsSince: repo.starsSince ?? 0,
    dateAdded: today
  }));

  const snapshot: TrendingSnapshot = {
    language,
    type,
    since,
    month: monthKey,
    day: today,
    items: slimList
  };

  await store.upsert(snapshot);
  logger.info(`Stored ${slimList.length} repos for ${language}`);
}

export const syncTrendingJob = onSchedule(
  {
    schedule: resolveSchedule(),
    timeZone: process.env.SYNC_TIMEZONE || "Etc/UTC"
  },
  async () => {
    const languages = resolveLanguages();
    const since = resolveSince();
    const type = (process.env.SYNC_TYPE as TypeKind) || DEFAULT_TYPE;

    for (const language of languages) {
      try {
        await syncLanguage(language, since, type);
      } catch (error) {
        logger.error(`Failed to sync ${language}`, error);
      }
    }
  }
);

function parseQuery(req: FunctionsRequest): TrendingQuery {
  const query: TrendingQuery = {};
  if (typeof req.query.language === "string") query.language = req.query.language;
  if (typeof req.query.type === "string" && (req.query.type === "repositories" || req.query.type === "developers")) {
    query.type = req.query.type;
  }
  if (typeof req.query.since === "string" && (req.query.since === "daily" || req.query.since === "weekly" || req.query.since === "monthly")) {
    query.since = req.query.since;
  }
  if (typeof req.query.month === "string") query.month = req.query.month;
  if (typeof req.query.day === "string") query.day = req.query.day;
  return query;
}

type GroupKey = "month" | "day" | "type";

function buildGrouping(
  snapshots: TrendingSnapshot[],
  groupKey?: GroupKey
): Record<string, TrendingSnapshot[]> | undefined {
  if (!groupKey) return undefined;
  return snapshots.reduce<Record<string, TrendingSnapshot[]>>((acc, snapshot) => {
    const key = snapshot[groupKey];
    if (!acc[key]) acc[key] = [];
    acc[key].push(snapshot);
    return acc;
  }, {});
}

export const getTrendingApi = onRequest(async (req, res) => {
  const query = parseQuery(req);
  const groupParam =
    typeof req.query.groupBy === "string" && ["month", "day", "type"].includes(req.query.groupBy)
      ? (req.query.groupBy as GroupKey)
      : undefined;

  try {
    const payload = await store.read(query);
    const grouped = buildGrouping(payload, groupParam);

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=60");
    res.status(200).json({
      data: payload,
      ...(grouped ? { groupedBy: groupParam, groups: grouped } : {})
    });
  } catch (error) {
    logger.error("Trending API failure", error);
    res.status(500).json({ error: "Failed to load trending repositories" });
  }
});
