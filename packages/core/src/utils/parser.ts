import type { Since } from "../types/index.js";

export function parseStarsSinceText(raw: string, since: Since): number | null {
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
