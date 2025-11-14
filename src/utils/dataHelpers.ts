import type { SlimRepo } from "../types/index.js";

export function upsertByUrl(arr: SlimRepo[], incoming: SlimRepo): void {
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
