import { env } from '$env/dynamic/public';

export type TrendGroupKey = 'month' | 'day';

export interface SlimRepo {
	url: string | null;
	description: string | null;
	stars: number;
	starsSince: number | null;
	dateAdded: string;
}

export interface TrendingSnapshot {
	language: string;
	since: 'daily' | 'weekly' | 'monthly';
	month: string;
	day: string;
	items: SlimRepo[];
}

export interface TrendingResponse {
	data: TrendingSnapshot[];
	groupedBy?: TrendGroupKey;
	groups?: Record<string, TrendingSnapshot[]>;
}

export interface FilterParams {
	language?: string;
	since?: 'daily' | 'weekly' | 'monthly';
	month?: string;
	day?: string;
	groupBy?: TrendGroupKey;
}

export async function fetchTrendingSnapshots(filters: FilterParams): Promise<TrendingResponse> {
	if (!env.PUBLIC_TRENDING_API_BASE_URL) {
		throw new Error('Missing PUBLIC_TRENDING_API_BASE_URL');
	}

	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(filters)) {
		if (value) params.set(key, value);
	}

	const response = await fetch(`${env.PUBLIC_TRENDING_API_BASE_URL}?${params.toString()}`);

	if (!response.ok) {
		throw new Error(`API failed (${response.status})`);
	}

	return (await response.json()) as TrendingResponse;
}
