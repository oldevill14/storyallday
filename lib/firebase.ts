// lib/firebase.ts — Firebase app initialization for Story AI (storyallday).
//
// The web config below is PUBLIC and safe to ship in the client bundle
// (Firebase security is enforced by Auth + Firestore rules, not by hiding
// these values). We guard against double-init (Fast Refresh / multiple
// imports) via getApps().length.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAapGqzC38XBNNttnFo3iNIeuS8Vp78R4U',
  authDomain: 'storyallday.firebaseapp.com',
  projectId: 'storyallday',
  storageBucket: 'storyallday.firebasestorage.app',
  messagingSenderId: '536128055399',
  appId: '1:536128055399:web:7a15a89391886890430cc2',
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export default app;
