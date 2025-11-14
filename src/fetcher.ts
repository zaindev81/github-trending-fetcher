import * as cheerio from "cheerio";
import type { TypeKind, FetchOptions, TrendingRepo } from "./types/index.js";
import { UA } from "./constants.js";
import { buildUrl, parseStarsSinceText } from "./utils/index.js";

export async function fetchTrending(
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
