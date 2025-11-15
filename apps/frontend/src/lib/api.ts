import { browser } from '$app/environment';
import { firestore } from '$lib/firebase';
import {
	collection,
	getDocs,
	query,
	where,
	type DocumentData,
	type QueryConstraint
} from 'firebase/firestore';

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

const COLLECTION_ID = 'trendingSnapshots';

function deserializeSnapshot(data: DocumentData): TrendingSnapshot {
	return {
		language: data.language,
		since: data.since,
		month: data.month,
		day: data.day,
		items: Array.isArray(data.items) ? data.items : []
	};
}

function buildGrouping(
	snapshots: TrendingSnapshot[],
	groupKey?: TrendGroupKey
): Record<string, TrendingSnapshot[]> | undefined {
	if (!groupKey) return undefined;

	return snapshots.reduce<Record<string, TrendingSnapshot[]>>((acc, snapshot) => {
		const key = snapshot[groupKey];
		if (!acc[key]) acc[key] = [];
		acc[key].push(snapshot);
		return acc;
	}, {});
}

export async function fetchTrendingSnapshots(filters: FilterParams): Promise<TrendingResponse> {
	if (!browser) {
		throw new Error('Firestore is only available in the browser.');
	}

	if (!firestore) {
		throw new Error('Firebase has not been initialised.');
	}

	const constraints: QueryConstraint[] = [];
	if (filters.language) constraints.push(where('language', '==', filters.language));
	if (filters.since) constraints.push(where('since', '==', filters.since));
	if (filters.month) constraints.push(where('month', '==', filters.month));
	if (filters.day) constraints.push(where('day', '==', filters.day));

	const baseRef = collection(firestore, COLLECTION_ID);
	const queryRef = constraints.length ? query(baseRef, ...constraints) : baseRef;
	const snapshot = await getDocs(queryRef);
	const payload = snapshot.docs.map(doc => deserializeSnapshot(doc.data())).sort((a, b) => {
		return b.day.localeCompare(a.day);
	});

	const grouped = buildGrouping(payload, filters.groupBy);

	return {
		data: payload,
		...(grouped ? { groupedBy: filters.groupBy, groups: grouped } : {})
	};
}
