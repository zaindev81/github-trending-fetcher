import { browser } from '$app/environment';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
	getAuth,
	GoogleAuthProvider,
	signInWithPopup,
	signOut,
	type UserCredential
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { env } from '$env/dynamic/public';

const firebaseConfig = {
	apiKey: env.PUBLIC_FIREBASE_API_KEY,
	authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
	appId: env.PUBLIC_FIREBASE_APP_ID
};

function createApp(): FirebaseApp | null {
	if (!browser) return null;
	if (!firebaseConfig.apiKey) {
		console.warn('Missing Firebase env configuration');
		return null;
	}
	return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

const app = createApp();
export const auth = app ? getAuth(app) : null;
export const firestore: Firestore | null = app ? getFirestore(app) : null;

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<UserCredential | void> {
	if (!auth) return;
	return signInWithPopup(auth, provider);
}

export async function signOutUser(): Promise<void> {
	if (!auth) return;
	await signOut(auth);
}
