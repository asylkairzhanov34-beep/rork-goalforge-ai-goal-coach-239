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
  
  if (user) {
    // Delete user document from Firestore
    try {
      await deleteUserProfile(user.uid);
      console.log('[Firebase] User profile deleted from Firestore');
    } catch (error) {
      console.error('[Firebase] Failed to delete user profile:', error);
    }
    
    // Delete Firebase Auth user
    await deleteUser(user);
    console.log('[Firebase] User deleted from Firebase Auth');
  } else {
    console.log('[Firebase] No user to delete');
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
  console.log('[Firebase] Saving user profile:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedData = removeUndefinedValues(data);
    
    await setDoc(userRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[Firebase] User profile saved');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving profile - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<any | null> {
  console.log('[Firebase] Getting user profile:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      console.log('[Firebase] User profile found');
      return docSnap.data();
    }
    
    console.log('[Firebase] User profile not found');
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
  console.log('[Firebase] Updating user profile:', userId);
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
        console.log('[Firebase] Document not found, creating new one');
        await setDoc(userRef, {
          ...cleanedData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        throw updateError;
      }
    }
    
    console.log('[Firebase] User profile updated');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied updating profile - using local storage only');
      return;
    }
    throw error;
  }
}

export async function deleteUserProfile(userId: string): Promise<void> {
  console.log('[Firebase] Deleting user profile:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    await deleteDoc(userRef);
    console.log('[Firebase] User profile deleted');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied deleting profile - skipping');
      return;
    }
    throw error;
  }
}

export async function saveUserGoals(userId: string, goals: any[]): Promise<void> {
  console.log('[Firebase] Saving goals:', userId, goals.length);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedGoals = removeUndefinedValues(goals);
    
    await setDoc(userRef, {
      goals: cleanedGoals,
      goalsUpdatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[Firebase] Goals saved');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving goals - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserGoals(userId: string): Promise<any[]> {
  console.log('[Firebase] Getting goals:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists() && docSnap.data().goals) {
      console.log('[Firebase] Goals found:', docSnap.data().goals.length);
      return docSnap.data().goals;
    }
    
    console.log('[Firebase] No goals found');
    return [];
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied getting goals - using local storage only');
      return [];
    }
    throw error;
  }
}

export async function saveUserTasks(userId: string, tasks: any[]): Promise<void> {
  console.log('[Firebase] Saving tasks:', userId, tasks.length);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedTasks = removeUndefinedValues(tasks);
    
    await setDoc(userRef, {
      tasks: cleanedTasks,
      tasksUpdatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[Firebase] Tasks saved');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving tasks - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserTasks(userId: string): Promise<any[]> {
  console.log('[Firebase] Getting tasks:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists() && docSnap.data().tasks) {
      console.log('[Firebase] Tasks found:', docSnap.data().tasks.length);
      return docSnap.data().tasks;
    }
    
    console.log('[Firebase] No tasks found');
    return [];
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied getting tasks - using local storage only');
      return [];
    }
    throw error;
  }
}

export async function saveUserPomodoroSessions(userId: string, sessions: any[]): Promise<void> {
  console.log('[Firebase] Saving pomodoro sessions:', userId, sessions.length);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedSessions = removeUndefinedValues(sessions);
    
    await setDoc(userRef, {
      pomodoroSessions: cleanedSessions,
      pomodoroUpdatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[Firebase] Pomodoro sessions saved');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving pomodoro sessions - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserPomodoroSessions(userId: string): Promise<any[]> {
  console.log('[Firebase] Getting pomodoro sessions:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists() && docSnap.data().pomodoroSessions) {
      console.log('[Firebase] Pomodoro sessions found:', docSnap.data().pomodoroSessions.length);
      return docSnap.data().pomodoroSessions;
    }
    
    console.log('[Firebase] No pomodoro sessions found');
    return [];
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied getting pomodoro sessions - using local storage only');
      return [];
    }
    throw error;
  }
}

export async function saveUserFullProfile(userId: string, profile: any): Promise<void> {
  console.log('[Firebase] Saving full profile:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedProfile = removeUndefinedValues(profile);
    
    await setDoc(userRef, {
      profile: cleanedProfile,
      profileUpdatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[Firebase] Full profile saved');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving full profile - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserFullProfile(userId: string): Promise<any | null> {
  console.log('[Firebase] Getting full profile:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists() && docSnap.data().profile) {
      console.log('[Firebase] Full profile found');
      return docSnap.data().profile;
    }
    
    console.log('[Firebase] No full profile found');
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
  console.log('[Firebase] Saving subscription data:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const cleanedData = removeUndefinedValues(subscriptionData);
    
    await setDoc(userRef, {
      subscription: cleanedData,
      subscriptionUpdatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[Firebase] Subscription data saved');
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied saving subscription - using local storage only');
      return;
    }
    throw error;
  }
}

export async function getUserSubscription(userId: string): Promise<any | null> {
  console.log('[Firebase] Getting subscription data:', userId);
  try {
    const firestore = getFirebaseDB();
    const userRef = doc(firestore, 'users', userId);
    
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists() && docSnap.data().subscription) {
      console.log('[Firebase] Subscription data found');
      return docSnap.data().subscription;
    }
    
    console.log('[Firebase] No subscription data found');
    return null;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[Firebase] Permission denied getting subscription - using local storage only');
      return null;
    }
    throw error;
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

export type { FirebaseUser, Timestamp };
