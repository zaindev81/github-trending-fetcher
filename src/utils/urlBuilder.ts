import type { Since, TypeKind, FetchOptions } from "../types/index.js";
import { GITHUB_TRENDING_URL } from "../constants.js";

export function buildUrl(
  type: TypeKind,
  { language = null, since = "daily", spokenLanguageCode = null }: FetchOptions
): string {
  const path = type === "developers" ? "/developers" : "";
  const langSeg = language ? `/${encodeURIComponent(language)}` : "";
  const u = new URL(`${GITHUB_TRENDING_URL}${langSeg}${path}`);
  u.searchParams.set("since", since);
  if (spokenLanguageCode) u.searchParams.set("spoken_language_code", spokenLanguageCode);
  return u.toString();
}
