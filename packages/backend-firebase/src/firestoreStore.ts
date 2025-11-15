import { getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  type Query,
  type QueryDocumentSnapshot
} from "firebase-admin/firestore";
import type {
  TrendingStore,
  TrendingSnapshot,
  TrendingQuery
} from "@github-trending/core";

if (!getApps().length) {
  initializeApp();
}

const firestore = getFirestore();
const COLLECTION = "trendingSnapshots";

function buildDocId(snapshot: TrendingSnapshot): string {
  return `${snapshot.language}_${snapshot.type}_${snapshot.since}_${snapshot.day}`;
}

function buildQuery(query: TrendingQuery) {
  let ref = firestore.collection(COLLECTION) as Query;
  if (query.language) ref = ref.where("language", "==", query.language);
  if (query.type) ref = ref.where("type", "==", query.type);
  if (query.since) ref = ref.where("since", "==", query.since);
  if (query.month) ref = ref.where("month", "==", query.month);
  if (query.day) ref = ref.where("day", "==", query.day);
  return ref;
}

function deserializeSnapshot(
  doc: QueryDocumentSnapshot
): TrendingSnapshot {
  const data = doc.data();
  return {
    language: data.language,
    type: data.type,
    since: data.since,
    month: data.month,
    day: data.day,
    items: data.items ?? []
  };
}

export class FirestoreTrendingStore implements TrendingStore {

  async upsert(snapshot: TrendingSnapshot): Promise<void> {
    const docId = buildDocId(snapshot);
    await firestore.collection(COLLECTION).doc(docId).set(
      {
        ...snapshot,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  async read(query: TrendingQuery = {}): Promise<TrendingSnapshot[]> {
    const ref = buildQuery(query);
    const snap = await ref.get();
    return snap.docs.map(deserializeSnapshot);
  }
}
