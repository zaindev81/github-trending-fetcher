import { browser } from '$app/environment';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { writable } from 'svelte/store';
import { auth } from '$lib/firebase';

export const user = writable<User | null>(null);
export const loadingUser = writable<boolean>(true);

if (browser && auth) {
	onAuthStateChanged(auth, (firebaseUser) => {
		user.set(firebaseUser);
		loadingUser.set(false);
	});
} else {
	loadingUser.set(false);
}
