import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  writeBatch,
  getDocs,
  limit
} from 'firebase/firestore';

// Load config from firebase-applet-config.json
import firebaseAppletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore using the provisioned firestoreDatabaseId
export const db = firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: string;
  isAnonymous?: boolean;
}

// Resilient Auth Session Management
const AUTH_STORAGE_KEY = 'samudera_active_user_session';
const authSubscribers: ((user: AppUser | null) => void)[] = [];

export function getStoredUserSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed reading user session:', e);
  }
  return null;
}

export function setSessionUser(user: AppUser | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed saving user session:', e);
  }

  // Broadcast to all active subscribers
  authSubscribers.forEach((cb) => {
    try {
      cb(user);
    } catch (err) {
      console.error('Auth subscriber error:', err);
    }
  });
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }
  setSessionUser(null);
}

export function onUnifiedAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
  authSubscribers.push(callback);

  // Send current state immediately
  const fbUser = auth.currentUser;
  if (fbUser) {
    callback({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      isAnonymous: fbUser.isAnonymous
    });
  } else {
    const stored = getStoredUserSession();
    callback(stored);
  }

  // Also hook into native Firebase onAuthStateChanged
  const unsubFb = onAuthStateChanged(auth, (user) => {
    if (user) {
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous
      };
      setSessionUser(appUser);
    } else {
      const stored = getStoredUserSession();
      if (!stored) {
        callback(null);
      }
    }
  });

  return () => {
    const index = authSubscribers.indexOf(callback);
    if (index !== -1) {
      authSubscribers.splice(index, 1);
    }
    unsubFb();
  };
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDocs,
  limit
};
export type { User };
