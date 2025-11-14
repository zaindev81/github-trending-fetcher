import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { LanguageMap, SlimRepo, TrendingStore } from "@github-trending/core";

if (!getApps().length) {
  initializeApp();
}

const firestore = getFirestore();
const COLLECTION = "trending";

export class FirestoreTrendingStore implements TrendingStore {
  private collection = firestore.collection(COLLECTION);

  async upsert(language: string, repositories: SlimRepo[]): Promise<void> {
    if (!language) return;
    await this.collection.doc(language).set(
      {
        items: repositories,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  async read(language?: string): Promise<LanguageMap> {
    if (language) {
      const docSnap = await this.collection.doc(language).get();
      const payload = docSnap.data() as { items?: SlimRepo[] } | undefined;
      return { [language]: payload?.items ?? [] };
    }

    const snapshot = await this.collection.get();
    const result: LanguageMap = {};
    snapshot.forEach(doc => {
      const payload = doc.data() as { items?: SlimRepo[] } | undefined;
      result[doc.id] = payload?.items ?? [];
    });
    return result;
  }
}
