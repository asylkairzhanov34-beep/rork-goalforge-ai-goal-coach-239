import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeRevenueCat,
  getOfferings,
  getCustomerInfo,
  purchasePackage,
  restorePurchases,
  findPackageByIdentifier,
  RevenueCatCustomerInfo,
  identifyUser,
} from '@/lib/revenuecat';
import {
  saveUserSubscription,
  getUserSubscription,
  getCurrentUser,
  subscribeToAuthState,
} from '@/lib/firebase';

export type SubscriptionStatus = 'loading' | 'free' | 'premium';

export interface SubscriptionPackage {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
}

const ENTITLEMENT_ID = 'Premium Subscriptions';

interface FirebaseSubscriptionData {
  isPremium: boolean;
  status: SubscriptionStatus;
  entitlements: string[];
  originalAppUserId?: string;
  latestExpirationDate?: string;
  updatedAt: string;
  revenueCatUserId?: string;
  platform?: string;
}

const INIT_TIMEOUT = Platform.OS === 'web' ? 2000 : 5000;

const TRIAL_START_KEY = 'trialStartISO';
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<RevenueCatCustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [trialStartISO, setTrialStartISO] = useState<string | null>(null);
  const [trialLoaded, setTrialLoaded] = useState(false);
  const lastSyncedStatus = useRef<SubscriptionStatus | null>(null);
  const firebaseUserId = useRef<string | null>(null);
  const revenueCatInitialized = useRef(false);
  const initStarted = useRef(false);

  useEffect(() => {
    const loadTrial = async () => {
      try {
        const stored = await AsyncStorage.getItem(TRIAL_START_KEY);
        if (stored) {
          console.log('[Trial] Loaded trial start:', stored);
          setTrialStartISO(stored);
        } else {
          const now = new Date().toISOString();
          console.log('[Trial] First launch — starting trial:', now);
          await AsyncStorage.setItem(TRIAL_START_KEY, now);
          setTrialStartISO(now);
        }
      } catch (e) {
        console.error('[Trial] Failed to load/set trial start:', e);
        const fallback = new Date().toISOString();
        setTrialStartISO(fallback);
      } finally {
        setTrialLoaded(true);
      }
    };
    loadTrial();
  }, []);

  const isTrialExpired = useMemo(() => {
    if (!trialLoaded || !trialStartISO) return false;
    if (status === 'premium') return false;
    const start = new Date(trialStartISO).getTime();
    const now = Date.now();
    const expired = now - start >= TRIAL_DURATION_MS;
    console.log('[Trial] expired:', expired, '| elapsed:', Math.round((now - start) / 1000 / 60), 'min');
    return expired;
  }, [trialLoaded, trialStartISO, status]);

  const [trialExpiredLive, setTrialExpiredLive] = useState(false);

  useEffect(() => {
    if (!trialLoaded || !trialStartISO || status === 'premium') {
      setTrialExpiredLive(false);
      return;
    }
    const check = () => {
      const start = new Date(trialStartISO).getTime();
      const now = Date.now();
      const expired = now - start >= TRIAL_DURATION_MS;
      setTrialExpiredLive(expired);
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [trialLoaded, trialStartISO, status]);

  const syncSubscriptionToFirebase = useCallback(async (
    newStatus: SubscriptionStatus,
    info: RevenueCatCustomerInfo | null,
    forceSync: boolean = false
  ) => {
    try {
      const firebaseUser = getCurrentUser();
      if (!firebaseUser) {
        console.log('[Subscription] No Firebase user - skipping sync');
        return;
      }

      if (!forceSync && lastSyncedStatus.current === newStatus) {
        console.log('[Subscription] Status unchanged - skipping sync');
        return;
      }

      const subscriptionData: FirebaseSubscriptionData = {
        isPremium: newStatus === 'premium',
        status: newStatus,
        entitlements: info ? Object.keys(info.entitlements.active) : [],
        originalAppUserId: info?.originalAppUserId,
        latestExpirationDate: info?.latestExpirationDate ?? undefined,
        updatedAt: new Date().toISOString(),
        revenueCatUserId: info?.originalAppUserId,
        platform: Platform.OS,
      };

      console.log('[Subscription] 🔄 Syncing to Firebase:', subscriptionData);
      await saveUserSubscription(firebaseUser.uid, subscriptionData);
      lastSyncedStatus.current = newStatus;
      firebaseUserId.current = firebaseUser.uid;
      console.log('[Subscription] ✅ Synced to Firebase for user:', firebaseUser.uid);
    } catch (err) {
      console.error('[Subscription] Firebase sync error:', err);
    }
  }, []);

  const loadSubscriptionFromFirebase = useCallback(async (): Promise<FirebaseSubscriptionData | null> => {
    try {
      const firebaseUser = getCurrentUser();
      if (!firebaseUser) {
        console.log('[Subscription] No Firebase user - skipping load');
        return null;
      }

      console.log('[Subscription] 📥 Loading from Firebase...');
      const data = await getUserSubscription(firebaseUser.uid);
      if (data) {
        console.log('[Subscription] Found Firebase data:', data);
        return data as FirebaseSubscriptionData;
      }
      return null;
    } catch (err) {
      console.error('[Subscription] Firebase load error:', err);
      return null;
    }
  }, []);

  const checkAndUpdateStatus = useCallback(async (forceFirebaseSync: boolean = false) => {
    console.log('[Subscription] 🔍 Checking subscription status...');
    
    try {
      const info = await getCustomerInfo();
      
      if (info) {
        setCustomerInfo(info);
        const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                          info.entitlements.active['premium'] !== undefined;
        const newStatus = hasPremium ? 'premium' : 'free';
        
        console.log('[Subscription] RevenueCat status:', hasPremium ? 'PREMIUM' : 'FREE');
        setStatus(newStatus);
        
        await syncSubscriptionToFirebase(newStatus, info, forceFirebaseSync);
        return newStatus;
      }
      
      return null;
    } catch (err) {
      console.error('[Subscription] Check status error:', err);
      return null;
    }
  }, [syncSubscriptionToFirebase]);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    
    const init = async () => {
      console.log('[Subscription] 🚀 Initializing...');
      console.log('[Subscription] Platform:', Platform.OS);

      const timeoutId = setTimeout(() => {
        if (!isInitialized) {
          console.warn('[Subscription] Init timeout reached, forcing completion');
          setStatus('free');
          setIsInitialized(true);
        }
      }, INIT_TIMEOUT);

      try {
        const firebaseData = await withTimeout(
          loadSubscriptionFromFirebase(),
          Platform.OS === 'web' ? 1000 : 2000,
          null
        );
        
        if (firebaseData?.isPremium) {
          console.log('[Subscription] 📥 Found premium status in Firebase');
          setStatus('premium');
          lastSyncedStatus.current = 'premium';
        }

        const rcInitialized = Platform.OS === 'web'
          ? false
          : await withTimeout(initializeRevenueCat(), 3000, false);
        revenueCatInitialized.current = rcInitialized;
        
        if (!rcInitialized) {
          console.warn('[Subscription] RevenueCat init failed or timed out or web');
          if (!firebaseData?.isPremium) {
            setStatus('free');
          }
          clearTimeout(timeoutId);
          setIsInitialized(true);
          return;
        }

        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          console.log('[Subscription] Identifying user in RevenueCat:', firebaseUser.uid);
          try {
            await withTimeout(identifyUser(firebaseUser.uid), 2000, undefined);
          } catch (identifyErr) {
            console.warn('[Subscription] RevenueCat identify failed:', identifyErr);
          }
        }

        const rcTimeout = Platform.OS === 'web' ? 1500 : 3000;
        const [info, offerings] = await Promise.all([
          withTimeout(getCustomerInfo(), rcTimeout, null),
          withTimeout(getOfferings(), rcTimeout, null),
        ]);

        if (info) {
          setCustomerInfo(info);
          const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                            info.entitlements.active['premium'] !== undefined;
          
          if (hasPremium) {
            setStatus('premium');
            console.log('[Subscription] Status from RevenueCat: PREMIUM');
            syncSubscriptionToFirebase('premium', info, true).catch(() => {});
          } else if (firebaseData?.isPremium) {
            console.log('[Subscription] RevenueCat says FREE but Firebase has PREMIUM - keeping premium');
            setStatus('premium');
          } else {
            setStatus('free');
            console.log('[Subscription] Status from RevenueCat: FREE');
            syncSubscriptionToFirebase('free', info, true).catch(() => {});
          }
        } else if (!firebaseData?.isPremium) {
          setStatus('free');
        }

        if (offerings?.current?.availablePackages && offerings.current.availablePackages.length > 0) {
          const formatted: SubscriptionPackage[] = offerings.current.availablePackages.map((pkg) => ({
            identifier: pkg.identifier,
            product: {
              identifier: pkg.product.identifier,
              title: pkg.product.title,
              description: pkg.product.description,
              price: pkg.product.price,
              priceString: pkg.product.priceString,
              currencyCode: pkg.product.currencyCode,
            },
          }));
          setPackages(formatted);
          console.log('[Subscription] Loaded', formatted.length, 'packages');
        }

        clearTimeout(timeoutId);
        setIsInitialized(true);
        console.log('[Subscription] ✅ Initialization complete');
      } catch (err) {
        console.error('[Subscription] Init error:', err);
        clearTimeout(timeoutId);
        setStatus('free');
        setIsInitialized(true);
      }
    };

    init();
  }, [loadSubscriptionFromFirebase, syncSubscriptionToFirebase, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    console.log('[Subscription] Setting up Firebase auth listener for sync...');
    
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user && user.uid !== firebaseUserId.current) {
        console.log('[Subscription] Firebase user changed, re-syncing:', user.uid);
        firebaseUserId.current = user.uid;
        
        if (revenueCatInitialized.current) {
          try {
            await identifyUser(user.uid);
            console.log('[Subscription] Re-identified user in RevenueCat');
          } catch (err) {
            console.warn('[Subscription] RevenueCat re-identify failed:', err);
          }
        }
        
        await checkAndUpdateStatus(true);
      } else if (!user) {
        console.log('[Subscription] Firebase user logged out');
        firebaseUserId.current = null;
        lastSyncedStatus.current = null;
      }
    });

    return () => {
      console.log('[Subscription] Cleaning up auth listener');
      unsubscribe();
    };
  }, [isInitialized, checkAndUpdateStatus]);

  const handlePurchase = useCallback(async (packageIdentifier: string): Promise<boolean> => {
    console.log('[Subscription] 🛒 Purchase requested:', packageIdentifier);
    
    const pkg = findPackageByIdentifier(packageIdentifier);
    if (!pkg) {
      console.error('[Subscription] Package not found:', packageIdentifier);
      Alert.alert('Error', 'Package not found. Please try again.');
      return false;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const info = await purchasePackage(pkg);
      
      if (info) {
        setCustomerInfo(info);
        const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                          info.entitlements.active['premium'] !== undefined;
        if (hasPremium) {
          setStatus('premium');
          console.log('[Subscription] ✅ Purchase successful - now PREMIUM');
          
          await syncSubscriptionToFirebase('premium', info);
          
          return true;
        }
      }
      
      console.log('[Subscription] Purchase cancelled or no entitlement');
      return false;
    } catch (err: any) {
      console.error('[Subscription] Purchase error:', err);
      if (!err.userCancelled) {
        setError(err.message || 'Purchase failed');
        Alert.alert('Purchase Error', err.message || 'Unable to complete purchase. Please try again.');
      }
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [syncSubscriptionToFirebase]);

  const handleRestore = useCallback(async (): Promise<boolean> => {
    console.log('[Subscription] 🔄 Restore requested');
    setIsPurchasing(true);
    setError(null);

    try {
      const info = await restorePurchases();
      
      if (info) {
        setCustomerInfo(info);
        const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                          info.entitlements.active['premium'] !== undefined;
        if (hasPremium) {
          setStatus('premium');
          console.log('[Subscription] ✅ Restore successful - now PREMIUM');
          
          await syncSubscriptionToFirebase('premium', info);
          
          return true;
        }
      }
      
      console.log('[Subscription] No purchases to restore');
      return false;
    } catch (err: any) {
      console.error('[Subscription] Restore error:', err);
      setError(err.message || 'Restore failed');
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [syncSubscriptionToFirebase]);

  const refreshStatus = useCallback(async () => {
    console.log('[Subscription] 🔄 Refreshing status...');
    try {
      const result = await checkAndUpdateStatus(true);
      console.log('[Subscription] Refresh complete, status:', result);
    } catch (err) {
      console.error('[Subscription] Refresh error:', err);
    }
  }, [checkAndUpdateStatus]);

  const reloadOfferings = useCallback(async () => {
    console.log('[Subscription] Reloading offerings...');
    setError(null);
    try {
      const offerings = await getOfferings();
      if (offerings?.current?.availablePackages && offerings.current.availablePackages.length > 0) {
        const formatted: SubscriptionPackage[] = offerings.current.availablePackages.map((pkg) => ({
          identifier: pkg.identifier,
          product: {
            identifier: pkg.product.identifier,
            title: pkg.product.title,
            description: pkg.product.description,
            price: pkg.product.price,
            priceString: pkg.product.priceString,
            currencyCode: pkg.product.currencyCode,
          },
        }));
        setPackages(formatted);
        console.log('[Subscription] Reloaded', formatted.length, 'packages');
      } else {
        setError('No subscription plans found');
      }
    } catch (err: any) {
      console.error('[Subscription] Reload error:', err);
      setError(err.message || 'Failed to load plans');
    }
  }, []);

  return {
    isInitialized,
    status,
    packages,
    customerInfo,
    isPurchasing,
    error,
    isFirstLaunch,
    isPremium: status === 'premium',
    isTrialExpired: isTrialExpired || trialExpiredLive,
    trialStartISO,
    purchasePackage: handlePurchase,
    restorePurchases: handleRestore,
    refreshStatus,
    reloadOfferings,
    setIsFirstLaunch,
  };
});
