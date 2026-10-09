import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  off,
  Database,
} from 'firebase/database';
import { getAuth, signInAnonymously, Auth, User as FirebaseUser } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyDM1IlucIajIDR75L2t970weK8K2fJ1BQE",
  authDomain: "scratch-7d728.firebaseapp.com",
  databaseURL: "https://scratch-7d728-default-rtdb.firebaseio.com",
  projectId: "scratch-7d728",
  storageBucket: "scratch-7d728.firebasestorage.app",
  messagingSenderId: "62211978639",
  appId: "1:62211978639:web:e84305824045078a0907fa"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export let rtdb: Database | null = null;
export let auth: Auth | null = null;

try {
  rtdb = getDatabase(app);
} catch {
  // Silent fallback
}

try {
  auth = getAuth(app);
} catch {
  // Silent fallback
}

let isAuthInitialized = false;

// Automatic silent authentication (handles public RTDB access or anonymous auth)
export async function initFirebaseAuth(): Promise<FirebaseUser | null> {
  if (isAuthInitialized) {
    return auth?.currentUser || null;
  }
  if (!auth) return null;

  try {
    const cred = await signInAnonymously(auth);
    isAuthInitialized = true;
    return cred.user;
  } catch {
    // If Anonymous Auth is not enabled in Firebase Console, Realtime Database operates in open/direct mode.
    // Mark as initialized so we do not retry or spam logs.
    isAuthInitialized = true;
    return null;
  }
}

export { ref, set, get, update, onValue, off };
