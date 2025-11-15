import type { FetchOptions } from "../types/index.js";
import { GITHUB_TRENDING_URL } from "../constants.js";

export function buildUrl({
  language = null,
  since = "daily",
  spokenLanguageCode = null
}: FetchOptions): string {
  const langSeg = language ? `/${encodeURIComponent(language)}` : "";
  const u = new URL(`${GITHUB_TRENDING_URL}${langSeg}`);
  u.searchParams.set("since", since);
  if (spokenLanguageCode) u.searchParams.set("spoken_language_code", spokenLanguageCode);
  return u.toString();
}
