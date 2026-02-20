import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { User, AuthState } from '@/types/auth';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { 
  initializeFirebase, 
  signInWithAppleCredential, 
  signOut as firebaseSignOut,
  deleteCurrentUser,
  subscribeToAuthState,
  getUserProfile,
  saveUserProfile,
  testFirestoreConnection,
  firebaseSyncStatus,
  FirebaseUser
} from '@/lib/firebase';
import { restoreAllUserDataFromFirebase } from '@/lib/firebase-restore';

const AUTH_STORAGE_KEY = 'auth_user_firebase';
const AUTH_LOGIN_GATE_KEY = 'auth_login_gate_v1';
const FIRST_LAUNCH_KEY = 'app_first_launch_v1';
const WELCOME_ONBOARDING_KEY = 'welcome_onboarding_completed_v1';
const AUTH_INIT_TIMEOUT = Platform.OS === 'web' ? 3000 : 6000;
const AUTH_NULL_DEBOUNCE = 1500;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [needsLoginGate, setNeedsLoginGate] = useState<boolean>(false);
  const [requiresFirstLogin, setRequiresFirstLogin] = useState<boolean>(false);
  const [welcomeOnboardingCompleted, setWelcomeOnboardingCompletedState] = useState<boolean>(false);
  const prevUserIdRef = useRef<string | null>(null);
  const hadAuthenticatedUserRef = useRef(false);
  const nullDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedUserRestoredRef = useRef(false);
  const dataRestorationDoneRef = useRef(false);
  const loginInProgressRef = useRef(false);

  useEffect(() => {
    const restoreCachedAuth = async () => {
      try {
        const cached = await safeStorageGet<User | null>(AUTH_STORAGE_KEY, null);
        if (cached && cached.id && cached.email) {
          console.log('[Auth] Restored cached user:', cached.id.substring(0, 12) + '...');
          const normalized = normalizeUser(cached);
          hadAuthenticatedUserRef.current = true;
          cachedUserRestoredRef.current = true;
          prevUserIdRef.current = cached.id;
          setAuthState({
            user: normalized,
            isLoading: true,
            isAuthenticated: true,
          });
        }
      } catch {
        console.warn('[Auth] Failed to restore cached auth');
      }
    };

    restoreCachedAuth();

    console.log('[Auth] Initializing Firebase...');
    try {
      initializeFirebase();
      setFirebaseInitialized(true);
      console.log('[Auth] Firebase initialized');
    } catch (error) {
      console.error('[Auth] Firebase init error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setInitError(errorMsg);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const checkWelcomeOnboarding = async () => {
      try {
        const completed = await safeStorageGet<boolean>(WELCOME_ONBOARDING_KEY, false);
        setWelcomeOnboardingCompletedState(completed || false);
      } catch {
        setWelcomeOnboardingCompletedState(false);
      }
    };
    checkWelcomeOnboarding();
  }, []);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        if (Platform.OS !== 'ios') {
          setRequiresFirstLogin(false);
          return;
        }

        const hasLaunchedBefore = await safeStorageGet<boolean>(FIRST_LAUNCH_KEY, false);

        if (!hasLaunchedBefore) {
          await safeStorageSet(FIRST_LAUNCH_KEY, true);
          setRequiresFirstLogin(true);
        } else {
          setRequiresFirstLogin(false);
        }
      } catch {
        setRequiresFirstLogin(false);
      }
    };

    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) return;

    let authReceived = false;

    const timeoutId = setTimeout(() => {
      if (!authReceived) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    }, AUTH_INIT_TIMEOUT);

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      authReceived = true;
      clearTimeout(timeoutId);

      if (nullDebounceRef.current) {
        clearTimeout(nullDebounceRef.current);
        nullDebounceRef.current = null;
      }

      if (firebaseUser) {
        hadAuthenticatedUserRef.current = true;
        const user = normalizeUser(firebaseUserToUser(firebaseUser));
        
        const isNewUser = prevUserIdRef.current !== null && prevUserIdRef.current !== firebaseUser.uid;
        if (isNewUser) {
          queryClient.clear();
          dataRestorationDoneRef.current = false;
          await AsyncStorage.multiRemove([
            `goals_${prevUserIdRef.current}`,
            `daily_tasks_${prevUserIdRef.current}`,
            `first_time_setup_${prevUserIdRef.current}`,
            `user_profile_${prevUserIdRef.current}`,
          ]).catch(() => {});
        }
        prevUserIdRef.current = firebaseUser.uid;
        
        safeStorageSet(AUTH_STORAGE_KEY, user).catch(() => {});

        const gateSeen = await safeStorageGet<boolean>(AUTH_LOGIN_GATE_KEY, false);
        setNeedsLoginGate(!gateSeen);

        if (!dataRestorationDoneRef.current && !loginInProgressRef.current && !firebaseUser.uid.startsWith('dev_guest_')) {
          console.log('[Auth] subscribeToAuthState: Running full data restoration for user:', firebaseUser.uid);
          try {
            const restorationResult = await restoreAllUserDataFromFirebase(firebaseUser.uid);
            dataRestorationDoneRef.current = true;
            
            if (restorationResult.success && restorationResult.restoredFields.length > 0) {
              console.log('[Auth] ✅ Data restored via auth state listener, invalidating queries...');
              queryClient.invalidateQueries();
            }

            const existingProfile = await getUserProfile(firebaseUser.uid);
            if (existingProfile?.firstTimeSetup?.isCompleted) {
              await safeStorageSet(WELCOME_ONBOARDING_KEY, true);
              setWelcomeOnboardingCompletedState(true);
              await safeStorageSet(FIRST_LAUNCH_KEY, true);
              await safeStorageSet(AUTH_LOGIN_GATE_KEY, true);
              setNeedsLoginGate(false);
              setRequiresFirstLogin(false);
            } else if (existingProfile?.onboardingCompleted) {
              await safeStorageSet(WELCOME_ONBOARDING_KEY, true);
              setWelcomeOnboardingCompletedState(true);
              await safeStorageSet(AUTH_LOGIN_GATE_KEY, true);
              setNeedsLoginGate(false);
            }
          } catch (restoreErr: any) {
            console.warn('[Auth] Data restoration in auth listener failed:', restoreErr?.message);
          }
        }

        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
        return;
      }

      if (hadAuthenticatedUserRef.current) {
        console.log('[Auth] Received null after authenticated user - debouncing for token refresh...');
        nullDebounceRef.current = setTimeout(() => {
          console.log('[Auth] Null auth confirmed after debounce - user logged out');
          hadAuthenticatedUserRef.current = false;
          setNeedsLoginGate(false);
          safeStorageSet(AUTH_STORAGE_KEY, null).catch(() => {});
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }, AUTH_NULL_DEBOUNCE);
        return;
      }

      setNeedsLoginGate(false);
      safeStorageSet(AUTH_STORAGE_KEY, null).catch(() => {});

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    });

    return () => {
      clearTimeout(timeoutId);
      if (nullDebounceRef.current) {
        clearTimeout(nullDebounceRef.current);
      }
      unsubscribe();
    };
  }, [firebaseInitialized]);

  const normalizeUser = (user: User): User => {
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
    return {
      ...user,
      createdAt,
    };
  };

  const firebaseUserToUser = (firebaseUser: FirebaseUser): User => {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || 'unknown@email.com',
      name: firebaseUser.displayName || undefined,
      provider: 'apple',
      createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
    };
  };

  const generateNonce = async (): Promise<string> => {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(new Uint8Array(randomBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const markLoginGateSeen = useCallback(async (): Promise<void> => {
    console.log('[Auth] Marking login gate as seen');
    await safeStorageSet(AUTH_LOGIN_GATE_KEY, true);
    setNeedsLoginGate(false);
    setRequiresFirstLogin(false);
  }, []);

  const loginWithApple = useCallback(async (): Promise<'success' | 'canceled'> => {
    console.log('[Auth] ========== Apple Login Started ==========');
    
    if (!firebaseInitialized) {
      throw new Error(initError || 'Firebase не инициализирован');
    }
    
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In доступен только на iOS');
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const nonce = await generateNonce();
      console.log('[Auth] Generated nonce');
      
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );
      console.log('[Auth] Hashed nonce');

      console.log('[Auth] Requesting Apple credentials...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      console.log('[Auth] Apple credential received');
      console.log('[Auth] - User ID:', credential.user.substring(0, 20) + '...');
      console.log('[Auth] - Has token:', !!credential.identityToken);

      if (!credential.identityToken) {
        throw new Error('Apple не вернул токен авторизации');
      }

      console.log('[Auth] Signing in to Firebase...');
      const firebaseUser = await signInWithAppleCredential(credential.identityToken, nonce);
      
      console.log('[Auth] Firebase sign in successful');
      console.log('[Auth] - Firebase UID:', firebaseUser.uid);
      console.log('[Auth] - Email:', firebaseUser.email);

      console.log('[Auth] Testing Firestore access...');
      const firestoreTest = await testFirestoreConnection(firebaseUser.uid);
      
      if (!firestoreTest.success) {
        console.error('[Auth] ❌ FIRESTORE TEST FAILED:', firestoreTest.error);
        if (firestoreTest.permissionDenied) {
          setTimeout(() => {
            Alert.alert(
              'Синхронизация данных',
              'Firestore Security Rules не настроены. Ваши данные сохраняются только локально и будут потеряны при удалении приложения.\n\nНастройте правила Firestore в Firebase Console:\nFirestore → Rules → разрешите доступ для авторизованных пользователей.',
              [{ text: 'Понятно' }]
            );
          }, 500);
        }
      } else {
        console.log('[Auth] ✅ Firestore access confirmed');
      }

      try {
        console.log('[Auth] ======= FULL DATA RESTORATION FROM FIREBASE =======');
        loginInProgressRef.current = true;
        
        const restorationResult = await restoreAllUserDataFromFirebase(firebaseUser.uid);
        dataRestorationDoneRef.current = true;
        
        console.log('[Auth] Restoration result:', JSON.stringify({
          success: restorationResult.success,
          fieldsCount: restorationResult.restoredFields.length,
          fields: restorationResult.restoredFields,
        }, null, 2));
        
        const existingProfile = await getUserProfile(firebaseUser.uid);
        
        if (existingProfile?.firstTimeSetup?.isCompleted) {
          console.log('[Auth] ✅ RETURNING USER DETECTED');
          await safeStorageSet(WELCOME_ONBOARDING_KEY, true);
          setWelcomeOnboardingCompletedState(true);
          await safeStorageSet(FIRST_LAUNCH_KEY, true);
          setRequiresFirstLogin(false);
        } else if (existingProfile?.onboardingCompleted) {
          console.log('[Auth] Partial profile found (onboarding completed but setup incomplete)');
          await safeStorageSet(WELCOME_ONBOARDING_KEY, true);
          setWelcomeOnboardingCompletedState(true);
          await safeStorageSet(FIRST_LAUNCH_KEY, true);
          setRequiresFirstLogin(false);
        } else {
          console.log('[Auth] New user or incomplete setup - no data to restore');
        }
        
        if (restorationResult.success && restorationResult.restoredFields.length > 0) {
          console.log('[Auth] ✅ Invalidating all queries after data restoration...');
          queryClient.invalidateQueries();
        }
        
        loginInProgressRef.current = false;
        console.log('[Auth] ======= DATA RESTORATION COMPLETE =======');
      } catch (profileCheckError: any) {
        loginInProgressRef.current = false;
        console.error('[Auth] ❌ Failed to restore data:', profileCheckError?.message || profileCheckError);
      }

      await markLoginGateSeen();

      console.log('[Auth] ========== Login Success ==========');
      return 'success';

    } catch (error: unknown) {
      console.error('[Auth] Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));

      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        console.log('[Auth] Error code:', errorCode);
        
        if (errorCode === 'ERR_REQUEST_CANCELED' || errorCode === 'ERR_CANCELED') {
          console.log('[Auth] User canceled login');
          return 'canceled';
        }
        
        if (errorCode === 'auth/invalid-credential') {
          throw new Error('Ошибка авторизации. Попробуйте ещё раз.');
        }
        
        if (errorCode === 'auth/operation-not-allowed') {
          throw new Error('Apple Sign-In не включён в Firebase. Проверьте настройки.');
        }
      }

      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Неизвестная ошибка авторизации');
    }
  }, [firebaseInitialized, initError, markLoginGateSeen]);

  const logout = useCallback(async (): Promise<void> => {
    console.log('[Auth] Logging out (intentional)...');
    hadAuthenticatedUserRef.current = false;
    if (nullDebounceRef.current) {
      clearTimeout(nullDebounceRef.current);
      nullDebounceRef.current = null;
    }
    try {
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      await safeStorageSet(AUTH_LOGIN_GATE_KEY, false);
      await firebaseSignOut();
      setNeedsLoginGate(false);
      setRequiresFirstLogin(false);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      console.log('[Auth] Logout complete');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      await safeStorageSet(AUTH_STORAGE_KEY, null);
      await safeStorageSet(AUTH_LOGIN_GATE_KEY, false);
      setNeedsLoginGate(false);
      setRequiresFirstLogin(false);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const loginAsGuest = useCallback(async (): Promise<void> => {
    console.log('[Auth] Developer guest login...');
    
    const guestUser: User = {
      id: 'dev_guest_' + Date.now(),
      email: 'developer@test.local',
      name: 'Developer',
      provider: 'apple',
      createdAt: new Date(),
    };
    
    await safeStorageSet(AUTH_STORAGE_KEY, guestUser);
    await safeStorageSet(AUTH_LOGIN_GATE_KEY, true);
    
    setAuthState({
      user: guestUser,
      isLoading: false,
      isAuthenticated: true,
    });
    
    setNeedsLoginGate(false);
    setRequiresFirstLogin(false);
    
    console.log('[Auth] Guest login complete');
  }, []);

  const setWelcomeOnboardingCompleted = useCallback(async (completed: boolean): Promise<void> => {
    console.log('[Auth] Setting welcome onboarding completed:', completed);
    await safeStorageSet(WELCOME_ONBOARDING_KEY, completed);
    setWelcomeOnboardingCompletedState(completed);

    if (completed && authState.user?.id && !authState.user.id.startsWith('dev_guest_')) {
      try {
        console.log('[Auth] Saving onboarding completion to Firebase');
        await saveUserProfile(authState.user.id, {
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[Auth] Failed to save onboarding flag to Firebase:', error);
      }
    }
  }, [authState.user?.id]);

  const clearAllLocalData = useCallback(async () => {
    console.log('[Auth] Clearing all local data...');
    queryClient.clear();
    try {
      await AsyncStorage.clear();
    } catch {
      const allKeys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
      if (allKeys.length > 0) {
        await AsyncStorage.multiRemove([...allKeys]).catch(() => {});
      }
    }
    prevUserIdRef.current = null;
    setNeedsLoginGate(false);
    setRequiresFirstLogin(true);
    setWelcomeOnboardingCompletedState(false);
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    console.log('[Auth] All local data cleared');
  }, [queryClient]);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    console.log('[Auth] Deleting account...');
    
    try {
      await deleteCurrentUser();
      console.log('[Auth] Firebase user and Firestore doc deleted');
      await clearAllLocalData();
      return true;
    } catch (error: any) {
      console.error('[Auth] Delete error:', error);
      
      if (error?.code === 'auth/requires-recent-login') {
        console.log('[Auth] Requires recent login - clearing local data and signing out');
        await clearAllLocalData();
        return true;
      }
      
      await clearAllLocalData();
      return true;
    }
  }, [clearAllLocalData]);

  return useMemo(() => ({
    ...authState,
    firebaseInitialized,
    initError,
    needsLoginGate,
    requiresFirstLogin,
    welcomeOnboardingCompleted,
    markLoginGateSeen,
    loginWithApple,
    loginAsGuest,
    logout,
    deleteAccount,
    setWelcomeOnboardingCompleted,
  }), [authState, firebaseInitialized, initError, needsLoginGate, requiresFirstLogin, welcomeOnboardingCompleted, markLoginGateSeen, loginWithApple, loginAsGuest, logout, deleteAccount, setWelcomeOnboardingCompleted]);
});
