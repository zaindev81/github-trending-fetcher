export const UA = "Mozilla/5.0 (compatible; TrendingFetcher/1.0)";
export const GITHUB_TRENDING_URL = "https://github.com/trending";

export const MULTI_LANGS = ["typescript", "go", "rust", "python"] as const;

export const STAR_THRESHOLDS: Record<string, number> = {
  go: 50,
  rust: 50,
  python: 80,
  typescript: 80,
} as const;
