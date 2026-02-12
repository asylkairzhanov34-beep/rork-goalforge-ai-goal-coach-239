import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebaseAuth from 'firebase/auth';
import {
  getAuth,
  signInWithCredential,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Auth,
  User as FirebaseUser,
  deleteUser,
  initializeAuth,
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCWM1q-4SgmyM14Er38n17SNJ442Bi43XA",
  authDomain: "goalforge-ai-data-2.firebaseapp.com",
  projectId: "goalforge-ai-data-2",
  storageBucket: "goalforge-ai-data-2.firebasestorage.app",
  messagingSenderId: "24919373567",
  appId: "1:24919373567:web:e0e3749c138d037b493eca"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export function initializeFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  console.log('[Firebase] Initializing...');
  
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missingKeys.length > 0) {
    console.error('[Firebase] Missing config keys:', missingKeys);
    throw new Error(`Firebase config missing: ${missingKeys.join(', ')}`);
  }
  
  if (getApps().length === 0) {
    console.log('[Firebase] Creating new app instance');
    app = initializeApp(firebaseConfig);
  } else {
    console.log('[Firebase] Using existing app instance');
    app = getApps()[0];
  }
  
  try {
    if (Platform.OS !== 'web') {
      console.log('[Firebase] Initializing Auth with React Native persistence (AsyncStorage)');
      const getReactNativePersistence = (firebaseAuth as unknown as { getReactNativePersistence: (storage: typeof AsyncStorage) => unknown }).getReactNativePersistence;
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage) as any,
      });
    } else {
      auth = getAuth(app);
    }
  } catch (error) {
    console.warn('[Firebase] Auth init fallback to getAuth:', error);
    auth = getAuth(app);
  }

  db = getFirestore(app);
  console.log('[Firebase] Initialized successfully (Auth + Firestore)');
  
  return { app, auth, db };
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

export function getFirebaseDB(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

export async function signInWithAppleCredential(identityToken: string, nonce?: string): Promise<FirebaseUser> {
  console.log('[Firebase] Signing in with Apple credential...');
  
  const firebaseAuth = getFirebaseAuth();
  const provider = new OAuthProvider('apple.com');
  
  const credential = nonce 
    ? provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      })
    : provider.credential({
        idToken: identityToken,
      });
  
  try {
    const result = await signInWithCredential(firebaseAuth, credential);
    console.log('[Firebase] Sign in successful');
    console.log('[Firebase] User ID:', result.user.uid);
    console.log('[Firebase] Email:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('[Firebase] Sign in error:', error);
    
    if (error?.code === 'auth/invalid-credential' && error?.message?.includes('audience')) {
      const betterError = new Error(
        'Apple Sign-In не настроен в Firebase. Добавьте "host.exp.Exponent" в Services ID в Firebase Console → Authentication → Sign-in method → Apple'
      );
      (betterError as any).code = 'auth/apple-not-configured';
      throw betterError;
    }
    
    throw error;
  }
}

export async function signOut(): Promise<void> {
  console.log('[Firebase] Signing out...');
  const firebaseAuth = getFirebaseAuth();
  await firebaseSignOut(firebaseAuth);
  console.log('[Firebase] Sign out successful');
}

export async function deleteCurrentUser(): Promise<void> {
  console.log('[Firebase] Deleting user...');
  const firebaseAuth = getFirebaseAuth();
  const user = firebaseAuth.currentUser;
  
  if (!user) {
    console.log('[Firebase] No user to delete');
    return;
  }

  const uid = user.uid;

  try {
    await deleteUserProfile(uid);
    console.log('[Firebase] User profile deleted from Firestore');
  } catch (error) {
    console.warn('[Firebase] Failed to delete user profile (non-fatal):', error);
  }

  try {
    await deleteUser(user);
    console.log('[Firebase] User deleted from Firebase Auth');
  } catch (error: any) {
    if (error?.code === 'auth/requires-recent-login') {
      console.warn('[Firebase] Requires recent login for deletion - signing out instead');
      await firebaseSignOut(firebaseAuth);
      throw error;
    }
    throw error;
  }
}

export function getCurrentUser(): FirebaseUser | null {
  const firebaseAuth = getFirebaseAuth();
  return firebaseAuth.currentUser;
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  const firebaseAuth = getFirebaseAuth();
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function saveUserProfile(userId: string, data: any): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedData = removeUndefinedValues(data);
    
    await setDoc(userRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving profile - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<any | null> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied getting profile - using local storage only');
      return null;
    }
    throw error;
  }
}

export async function updateUserProfile(userId: string, data: any): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedData = removeUndefinedValues(data);
    
    try {
      await updateDoc(userRef, {
        ...cleanedData,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError: any) {
      if (updateError?.code === 'not-found') {
        await setDoc(userRef, {
          ...cleanedData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        throw updateError;
      }
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied updating profile - using local storage only');
      return;
    }
    throw error;
  }
}

export async function deleteUserProfile(userId: string): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    await deleteDoc(userRef);
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied deleting profile - skipping');
      return;
    }
    throw error;
  }
}

export async function saveUserGoals(userId: string, goals: any[]): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleanedGoals = removeUndefinedValues(goals);
    await setDoc(userRef, {
      goals: cleanedGoals,
      goalsUpdatedAt: serverTimestamp(),
    }, { merge: true });
    firebaseSyncStatus.lastSyncSuccess = true;
    firebaseSyncStatus.lastSyncTime = Date.now();
    firebaseSyncStatus.lastError = null;
  } catch (error: any) {
    firebaseSyncStatus.lastSyncSuccess = false;
    firebaseSyncStatus.lastError = error?.message || 'Unknown error';
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving goals');
      return;
    }
    throw error;
  }
}

export async function getUserGoals(userId: string): Promise<any[]> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().goals) {
      firebaseSyncStatus.lastSyncSuccess = true;
      firebaseSyncStatus.lastSyncTime = Date.now();
      firebaseSyncStatus.lastError = null;
      return docSnap.data().goals;
    }
    return [];
  } catch (error: any) {
    firebaseSyncStatus.lastSyncSuccess = false;
    firebaseSyncStatus.lastError = error?.message || 'Unknown error';
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied reading goals');
      return [];
    }
    throw error;
  }
}

export async function saveUserTasks(userId: string, tasks: any[]): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleanedTasks = removeUndefinedValues(tasks);
    await setDoc(userRef, {
      tasks: cleanedTasks,
      tasksUpdatedAt: serverTimestamp(),
    }, { merge: true });
    firebaseSyncStatus.lastSyncSuccess = true;
    firebaseSyncStatus.lastSyncTime = Date.now();
    firebaseSyncStatus.lastError = null;
  } catch (error: any) {
    firebaseSyncStatus.lastSyncSuccess = false;
    firebaseSyncStatus.lastError = error?.message || 'Unknown error';
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving tasks');
      return;
    }
    throw error;
  }
}

export async function getUserTasks(userId: string): Promise<any[]> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().tasks) {
      firebaseSyncStatus.lastSyncSuccess = true;
      firebaseSyncStatus.lastSyncTime = Date.now();
      firebaseSyncStatus.lastError = null;
      return docSnap.data().tasks;
    }
    return [];
  } catch (error: any) {
    firebaseSyncStatus.lastSyncSuccess = false;
    firebaseSyncStatus.lastError = error?.message || 'Unknown error';
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied reading tasks');
      return [];
    }
    throw error;
  }
}

export async function saveUserPomodoroSessions(userId: string, sessions: any[]): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleanedSessions = removeUndefinedValues(sessions);
    await setDoc(userRef, {
      pomodoroSessions: cleanedSessions,
      pomodoroUpdatedAt: serverTimestamp(),
    }, { merge: true });
    firebaseSyncStatus.lastSyncSuccess = true;
    firebaseSyncStatus.lastSyncTime = Date.now();
    firebaseSyncStatus.lastError = null;
  } catch (error: any) {
    firebaseSyncStatus.lastSyncSuccess = false;
    firebaseSyncStatus.lastError = error?.message || 'Unknown error';
    if (error?.code === 'permission-denied') return;
    throw error;
  }
}

export async function getUserPomodoroSessions(userId: string): Promise<any[]> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().pomodoroSessions) {
      return docSnap.data().pomodoroSessions;
    }
    return [];
  } catch (error: any) {
    firebaseSyncStatus.lastSyncSuccess = false;
    firebaseSyncStatus.lastError = error?.message || 'Unknown error';
    if (error?.code === 'permission-denied') return [];
    throw error;
  }
}

export async function saveUserFullProfile(userId: string, profile: any): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleanedProfile = removeUndefinedValues(profile);
    await setDoc(userRef, {
      profile: cleanedProfile,
      profileUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving full profile - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserFullProfile(userId: string): Promise<any | null> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().profile) {
      return docSnap.data().profile;
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied getting full profile - using local storage only');
      return null;
    }
    throw error;
  }
}

export async function saveUserSubscription(userId: string, subscriptionData: any): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleanedData = removeUndefinedValues(subscriptionData);
    await setDoc(userRef, {
      subscription: cleanedData,
      subscriptionUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving subscription - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserSubscription(userId: string): Promise<any | null> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().subscription) {
      return docSnap.data().subscription;
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied getting subscription - using local storage only');
      return null;
    }
    throw error;
  }
}

export const firebaseSyncStatus = {
  lastSyncSuccess: false,
  lastSyncTime: 0,
  lastError: null as string | null,
  get isSyncing() {
    return this.lastSyncTime > 0;
  },
  get hasError() {
    return this.lastError !== null;
  },
};

export async function testFirestoreConnection(userId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[Firebase] Testing Firestore connection for user:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    await getDoc(userRef);
    console.log('[Firebase] ✅ Firestore connection OK - rules are configured');
    firebaseSyncStatus.lastSyncSuccess = true;
    firebaseSyncStatus.lastError = null;
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      const msg = 'Firestore Security Rules not configured. Data will only be stored locally and WILL BE LOST if you delete the app. Go to Firebase Console → Firestore → Rules and add proper rules.';
      console.error('[Firebase] ❌', msg);
      firebaseSyncStatus.lastSyncSuccess = false;
      firebaseSyncStatus.lastError = msg;
      return { success: false, error: msg };
    }
    const msg = error?.message || 'Unknown Firestore error';
    console.error('[Firebase] ❌ Firestore test failed:', msg);
    firebaseSyncStatus.lastSyncSuccess = false;
    firebaseSyncStatus.lastError = msg;
    return { success: false, error: msg };
  }
}

function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

export async function saveUserJournal(userId: string, entries: any[]): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleanedEntries = removeUndefinedValues(entries);
    await setDoc(userRef, {
      journalEntries: cleanedEntries,
      journalUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') return;
    throw error;
  }
}

export async function getUserJournal(userId: string): Promise<any[]> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().journalEntries) {
      return docSnap.data().journalEntries;
    }
    return [];
  } catch (error: any) {
    if (error?.code === 'permission-denied') return [];
    throw error;
  }
}

export async function saveUserChallenges(userId: string, data: { challenges: any[]; stats: any }): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleaned = removeUndefinedValues(data);
    await setDoc(userRef, {
      challenges: cleaned.challenges,
      challengeStats: cleaned.stats,
      challengesUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') return;
    throw error;
  }
}

export async function getUserChallenges(userId: string): Promise<{ challenges: any[]; stats: any } | null> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.challenges || data.challengeStats) {
        return {
          challenges: data.challenges || [],
          stats: data.challengeStats || null,
        };
      }
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') return null;
    throw error;
  }
}

export async function saveUserManifestations(userId: string, data: { sessions: any[]; settings: any }): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleaned = removeUndefinedValues(data);
    await setDoc(userRef, {
      manifestationSessions: cleaned.sessions,
      manifestationSettings: cleaned.settings,
      manifestationsUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') return;
    throw error;
  }
}

export async function getUserManifestations(userId: string): Promise<{ sessions: any[]; settings: any } | null> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.manifestationSessions || data.manifestationSettings) {
        return {
          sessions: data.manifestationSessions || [],
          settings: data.manifestationSettings || null,
        };
      }
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') return null;
    throw error;
  }
}

export async function saveUserFocusShield(userId: string, data: { settings: any; stats: any; sessions: any[]; logs: any[] }): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleaned = removeUndefinedValues(data);
    await setDoc(userRef, {
      focusShieldSettings: cleaned.settings,
      focusShieldStats: cleaned.stats,
      focusShieldSessions: cleaned.sessions,
      focusShieldLogs: cleaned.logs,
      focusShieldUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') return;
    throw error;
  }
}

export async function getUserFocusShield(userId: string): Promise<{ settings: any; stats: any; sessions: any[]; logs: any[] } | null> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.focusShieldSettings || data.focusShieldSessions) {
        return {
          settings: data.focusShieldSettings || null,
          stats: data.focusShieldStats || null,
          sessions: data.focusShieldSessions || [],
          logs: data.focusShieldLogs || [],
        };
      }
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') return null;
    throw error;
  }
}

export async function saveUserTimerSessions(userId: string, sessions: any[]): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const cleanedSessions = removeUndefinedValues(sessions);
    await setDoc(userRef, {
      timerSessions: cleanedSessions,
      timerUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') return;
    throw error;
  }
}

export async function getUserTimerSessions(userId: string): Promise<any[]> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().timerSessions) {
      return docSnap.data().timerSessions;
    }
    return [];
  } catch (error: any) {
    if (error?.code === 'permission-denied') return [];
    throw error;
  }
}

export async function saveUserChatHistory(userId: string, messages: any[]): Promise<void> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const last50 = messages.slice(-50);
    const cleaned = removeUndefinedValues(last50);
    await setDoc(userRef, {
      chatHistory: cleaned,
      chatUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') return;
    throw error;
  }
}

export async function getUserChatHistory(userId: string): Promise<any[]> {
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().chatHistory) {
      return docSnap.data().chatHistory;
    }
    return [];
  } catch (error: any) {
    if (error?.code === 'permission-denied') return [];
    throw error;
  }
}

export type { FirebaseUser, Timestamp };
