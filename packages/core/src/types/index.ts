export type Since = "daily" | "weekly" | "monthly";
export type TypeKind = "repositories" | "developers";

export interface TrendingRepo {
  owner: string;
  repo: string;
  url: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  starsSince: number | null;
}

export interface SlimRepo {
  url: string | null;
  description: string | null;
  stars: number;
  starsSince: number | null;
  dateAdded: string;
}

export interface FetchOptions {
  language?: string | null;
  since?: Since;
  spokenLanguageCode?: string | null;
}

export interface TrendingSnapshot {
  language: string;
  type: TypeKind;
  since: Since;
  month: string;
  day: string;
  items: SlimRepo[];
}

export interface TrendingQuery {
  language?: string;
  type?: TypeKind;
  since?: Since;
  month?: string;
  day?: string;
}

export interface ExistingData {
  [language: string]: TrendingSnapshot[];
}

export interface TrendingStore {
  upsert(snapshot: TrendingSnapshot): Promise<void>;
  read(query?: TrendingQuery): Promise<TrendingSnapshot[]>;
}
