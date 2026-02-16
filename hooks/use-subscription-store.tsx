import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert, Platform, AppState, AppStateStatus } from 'react-native';
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
const PREMIUM_STORAGE_KEY = 'subscription_premium_confirmed';
const PREMIUM_EXPIRY_KEY = 'subscription_premium_expiry';
const PREMIUM_PURCHASE_DATE_KEY = 'subscription_premium_purchase_date';
const TRIAL_START_KEY = 'trialStartISO';
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
const DOWNGRADE_CONFIRM_COUNT_KEY = 'subscription_downgrade_confirms';
const REQUIRED_DOWNGRADE_CONFIRMS = 3;

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

const INIT_TIMEOUT = Platform.OS === 'web' ? 3000 : 12000;

const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

const savePremiumToStorage = async (isPremium: boolean, expiryDate?: string | null) => {
  try {
    if (isPremium) {
      await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
      if (expiryDate) {
        await AsyncStorage.setItem(PREMIUM_EXPIRY_KEY, expiryDate);
      }
      const existing = await AsyncStorage.getItem(PREMIUM_PURCHASE_DATE_KEY);
      if (!existing) {
        await AsyncStorage.setItem(PREMIUM_PURCHASE_DATE_KEY, new Date().toISOString());
      }
      await AsyncStorage.removeItem(DOWNGRADE_CONFIRM_COUNT_KEY);
      console.log('[Subscription] Premium status SAVED to storage, expiry:', expiryDate ?? 'none');
    }
  } catch (e) {
    console.error('[Subscription] Failed to save premium to storage:', e);
  }
};

const loadPremiumFromStorage = async (): Promise<{ confirmed: boolean; expiryDate: string | null }> => {
  try {
    const [confirmed, expiry] = await Promise.all([
      AsyncStorage.getItem(PREMIUM_STORAGE_KEY),
      AsyncStorage.getItem(PREMIUM_EXPIRY_KEY),
    ]);
    return {
      confirmed: confirmed === 'true',
      expiryDate: expiry,
    };
  } catch (e) {
    console.error('[Subscription] Failed to load premium from storage:', e);
    return { confirmed: false, expiryDate: null };
  }
};

const isPremiumStillValidLocally = (expiryDate: string | null): boolean => {
  if (!expiryDate) return true;
  try {
    const expiry = new Date(expiryDate).getTime();
    const now = Date.now();
    const gracePeriod = 16 * 24 * 60 * 60 * 1000;
    return now < expiry + gracePeriod;
  } catch {
    return true;
  }
};

const incrementDowngradeConfirms = async (): Promise<number> => {
  try {
    const current = await AsyncStorage.getItem(DOWNGRADE_CONFIRM_COUNT_KEY);
    const count = (current ? parseInt(current, 10) : 0) + 1;
    await AsyncStorage.setItem(DOWNGRADE_CONFIRM_COUNT_KEY, count.toString());
    console.log('[Subscription] Downgrade confirm count:', count, '/', REQUIRED_DOWNGRADE_CONFIRMS);
    return count;
  } catch {
    return 0;
  }
};

const resetDowngradeConfirms = async () => {
  try {
    await AsyncStorage.removeItem(DOWNGRADE_CONFIRM_COUNT_KEY);
  } catch {}
};

const checkEntitlements = (info: RevenueCatCustomerInfo): boolean => {
  if (!info?.entitlements?.active) return false;
  return (
    info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
    info.entitlements.active['premium'] !== undefined ||
    info.entitlements.active['Premium'] !== undefined ||
    Object.keys(info.entitlements.active).length > 0
  );
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
  const [premiumEverConfirmed, setPremiumEverConfirmed] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);

  const lastSyncedStatus = useRef<SubscriptionStatus | null>(null);
  const firebaseUserId = useRef<string | null>(null);
  const revenueCatInitialized = useRef(false);
  const initStarted = useRef(false);
  const statusSetByRC = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [premiumData, trialStart] = await Promise.all([
          loadPremiumFromStorage(),
          AsyncStorage.getItem(TRIAL_START_KEY),
        ]);

        if (premiumData.confirmed) {
          setPremiumEverConfirmed(true);
          const stillValid = isPremiumStillValidLocally(premiumData.expiryDate);
          if (stillValid) {
            console.log('[Subscription] Locally confirmed premium user — setting premium immediately');
            setStatus('premium');
          } else {
            console.log('[Subscription] Premium expired locally, will verify with RevenueCat');
          }
        }

        if (trialStart) {
          setTrialStartISO(trialStart);
        } else {
          const now = new Date().toISOString();
          await AsyncStorage.setItem(TRIAL_START_KEY, now);
          setTrialStartISO(now);
        }
      } catch (e) {
        console.error('[Subscription] Storage load error:', e);
      } finally {
        setStorageLoaded(true);
        setTrialLoaded(true);
      }
    };
    load();
  }, []);

  const isTrialExpired = useMemo(() => {
    if (!trialLoaded || !storageLoaded) return false;
    if (!trialStartISO) return false;
    if (status === 'premium' || status === 'loading') return false;
    if (!isInitialized) return false;
    if (premiumEverConfirmed) return false;

    const start = new Date(trialStartISO).getTime();
    const now = Date.now();
    const expired = now - start >= TRIAL_DURATION_MS;
    if (expired) {
      console.log('[Trial] EXPIRED | elapsed:', Math.round((now - start) / 1000 / 60), 'min');
    }
    return expired;
  }, [trialLoaded, storageLoaded, trialStartISO, status, premiumEverConfirmed, isInitialized]);

  const [trialExpiredLive, setTrialExpiredLive] = useState(false);

  useEffect(() => {
    if (!trialLoaded || !storageLoaded || !trialStartISO || status === 'premium' || status === 'loading' || !isInitialized) {
      setTrialExpiredLive(false);
      return;
    }
    if (premiumEverConfirmed) {
      setTrialExpiredLive(false);
      return;
    }
    const check = () => {
      const start = new Date(trialStartISO).getTime();
      const now = Date.now();
      setTrialExpiredLive(now - start >= TRIAL_DURATION_MS);
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [trialLoaded, storageLoaded, trialStartISO, status, premiumEverConfirmed, isInitialized]);

  const confirmPremium = useCallback((expiryDate?: string | null) => {
    console.log('[Subscription] Confirming premium permanently');
    setPremiumEverConfirmed(true);
    setStatus('premium');
    savePremiumToStorage(true, expiryDate);
    resetDowngradeConfirms();
  }, []);

  const syncSubscriptionToFirebase = useCallback(async (
    newStatus: SubscriptionStatus,
    info: RevenueCatCustomerInfo | null,
    forceSync: boolean = false
  ) => {
    try {
      const firebaseUser = getCurrentUser();
      if (!firebaseUser) return;
      if (!forceSync && lastSyncedStatus.current === newStatus) return;

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

      await saveUserSubscription(firebaseUser.uid, subscriptionData);
      lastSyncedStatus.current = newStatus;
      firebaseUserId.current = firebaseUser.uid;
      console.log('[Subscription] Synced to Firebase:', newStatus);
    } catch (err) {
      console.error('[Subscription] Firebase sync error:', err);
    }
  }, []);

  const loadSubscriptionFromFirebase = useCallback(async (): Promise<FirebaseSubscriptionData | null> => {
    try {
      const firebaseUser = getCurrentUser();
      if (!firebaseUser) return null;
      const data = await getUserSubscription(firebaseUser.uid);
      if (data) {
        console.log('[Subscription] Firebase data loaded, isPremium:', data.isPremium);
        return data as FirebaseSubscriptionData;
      }
      return null;
    } catch (err) {
      console.error('[Subscription] Firebase load error:', err);
      return null;
    }
  }, []);

  const verifyWithRevenueCat = useCallback(async (): Promise<{ hasPremium: boolean; info: RevenueCatCustomerInfo | null; success: boolean }> => {
    try {
      const info = await getCustomerInfo();
      if (!info) {
        console.log('[Subscription] RevenueCat returned null — network or init issue');
        return { hasPremium: false, info: null, success: false };
      }
      const hasPremium = checkEntitlements(info);
      console.log('[Subscription] RevenueCat check:', hasPremium ? 'PREMIUM' : 'FREE');
      return { hasPremium, info, success: true };
    } catch (err) {
      console.error('[Subscription] RevenueCat check error:', err);
      return { hasPremium: false, info: null, success: false };
    }
  }, []);

  const checkAndUpdateStatus = useCallback(async (forceFirebaseSync: boolean = false) => {
    console.log('[Subscription] Checking status...');
    const { hasPremium, info, success } = await verifyWithRevenueCat();

    if (success && info) {
      setCustomerInfo(info);
      if (hasPremium) {
        confirmPremium(info.latestExpirationDate);
        await syncSubscriptionToFirebase('premium', info, forceFirebaseSync);
        return 'premium' as const;
      } else {
        if (premiumEverConfirmed) {
          console.log('[Subscription] RC says free but user was premium — trying restore...');
          try {
            const restored = await restorePurchases();
            if (restored) {
              const restoredPremium = checkEntitlements(restored);
              if (restoredPremium) {
                console.log('[Subscription] Restore recovered premium!');
                setCustomerInfo(restored);
                confirmPremium(restored.latestExpirationDate);
                await syncSubscriptionToFirebase('premium', restored, true);
                return 'premium' as const;
              }
            }
          } catch (restoreErr) {
            console.warn('[Subscription] Auto-restore failed — keeping premium as safety:', restoreErr);
            setStatus('premium');
            return 'premium' as const;
          }

          const confirmCount = await incrementDowngradeConfirms();
          if (confirmCount < REQUIRED_DOWNGRADE_CONFIRMS) {
            console.log('[Subscription] Not enough downgrade confirmations yet (' + confirmCount + '/' + REQUIRED_DOWNGRADE_CONFIRMS + ') — keeping premium');
            setStatus('premium');
            return 'premium' as const;
          }

          console.log('[Subscription] Subscription confirmed expired after ' + REQUIRED_DOWNGRADE_CONFIRMS + ' checks — downgrading');
          setStatus('free');
          setPremiumEverConfirmed(false);
          try {
            await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
            await AsyncStorage.removeItem(PREMIUM_EXPIRY_KEY);
            await AsyncStorage.removeItem(PREMIUM_PURCHASE_DATE_KEY);
            await AsyncStorage.removeItem(DOWNGRADE_CONFIRM_COUNT_KEY);
          } catch {}
          await syncSubscriptionToFirebase('free', info, true);
          return 'free' as const;
        } else {
          setStatus('free');
          await syncSubscriptionToFirebase('free', info, forceFirebaseSync);
          return 'free' as const;
        }
      }
    }

    if (!success && premiumEverConfirmed) {
      console.log('[Subscription] RC failed but user is confirmed premium — keeping premium');
      setStatus('premium');
      return 'premium' as const;
    }

    return null;
  }, [verifyWithRevenueCat, syncSubscriptionToFirebase, confirmPremium, premiumEverConfirmed]);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    const init = async () => {
      console.log('[Subscription] Initializing... Platform:', Platform.OS);

      const timeoutId = setTimeout(async () => {
        if (!isInitialized) {
          console.warn('[Subscription] Init timeout — using local state');
          const stored = await loadPremiumFromStorage();
          if (stored.confirmed && isPremiumStillValidLocally(stored.expiryDate)) {
            console.log('[Subscription] Timeout: found premium in storage — keeping premium');
            setStatus('premium');
            setPremiumEverConfirmed(true);
          } else {
            const fbData = await loadSubscriptionFromFirebase().catch(() => null);
            if (fbData?.isPremium) {
              console.log('[Subscription] Timeout: Firebase says premium — keeping premium');
              setStatus('premium');
              setPremiumEverConfirmed(true);
              savePremiumToStorage(true, fbData.latestExpirationDate);
            } else if (stored.confirmed) {
              console.log('[Subscription] Timeout: storage confirmed but may be expired — keeping premium as safety');
              setStatus('premium');
              setPremiumEverConfirmed(true);
            } else {
              console.log('[Subscription] Timeout: no premium evidence — setting free');
              setStatus('free');
            }
          }
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
          console.log('[Subscription] Firebase says premium');
          setStatus('premium');
          confirmPremium(firebaseData.latestExpirationDate);
          lastSyncedStatus.current = 'premium';
        }

        const rcInitialized = Platform.OS === 'web'
          ? false
          : await withTimeout(initializeRevenueCat(), 5000, false);
        revenueCatInitialized.current = rcInitialized;

        if (!rcInitialized) {
          console.warn('[Subscription] RevenueCat not available');
          if (premiumEverConfirmed || status === 'premium' || firebaseData?.isPremium) {
            setStatus('premium');
          } else {
            setStatus('free');
          }
          clearTimeout(timeoutId);
          setIsInitialized(true);
          return;
        }

        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          try {
            await withTimeout(identifyUser(firebaseUser.uid), 3000, undefined);
          } catch (identifyErr) {
            console.warn('[Subscription] RC identify failed:', identifyErr);
          }
        }

        const rcTimeout = Platform.OS === 'web' ? 1500 : 5000;
        const [info, offerings] = await Promise.all([
          withTimeout(getCustomerInfo(), rcTimeout, null),
          withTimeout(getOfferings(), rcTimeout, null),
        ]);

        if (info) {
          setCustomerInfo(info);
          const hasPremium = checkEntitlements(info);

          if (hasPremium) {
            confirmPremium(info.latestExpirationDate);
            console.log('[Subscription] RC confirmed: PREMIUM');
            syncSubscriptionToFirebase('premium', info, true).catch(() => {});
          } else if (premiumEverConfirmed || firebaseData?.isPremium || status === 'premium') {
            console.log('[Subscription] RC says free but local/firebase says premium — trying restore...');
            try {
              const restored = await withTimeout(restorePurchases(), 5000, null);
              if (restored && checkEntitlements(restored)) {
                console.log('[Subscription] Restore recovered premium on init!');
                setCustomerInfo(restored);
                confirmPremium(restored.latestExpirationDate);
                syncSubscriptionToFirebase('premium', restored, true).catch(() => {});
              } else {
                const confirmCount = await incrementDowngradeConfirms();
                if (confirmCount < REQUIRED_DOWNGRADE_CONFIRMS) {
                  console.log('[Subscription] RC+restore say free but not enough confirms (' + confirmCount + '/' + REQUIRED_DOWNGRADE_CONFIRMS + ') — keeping premium');
                  setStatus('premium');
                } else {
                  console.log('[Subscription] Subscription confirmed expired after ' + REQUIRED_DOWNGRADE_CONFIRMS + ' init checks — downgrading');
                  setStatus('free');
                  setPremiumEverConfirmed(false);
                  try {
                    await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
                    await AsyncStorage.removeItem(PREMIUM_EXPIRY_KEY);
                    await AsyncStorage.removeItem(PREMIUM_PURCHASE_DATE_KEY);
                    await AsyncStorage.removeItem(DOWNGRADE_CONFIRM_COUNT_KEY);
                  } catch {}
                  syncSubscriptionToFirebase('free', info, true).catch(() => {});
                }
              }
            } catch (restoreErr) {
              console.warn('[Subscription] Auto-restore failed, keeping premium as safety:', restoreErr);
              setStatus('premium');
            }
          } else {
            setStatus('free');
            console.log('[Subscription] RC confirmed: FREE');
            syncSubscriptionToFirebase('free', info, true).catch(() => {});
          }
        } else {
          console.log('[Subscription] RC returned null info');
          if (premiumEverConfirmed || firebaseData?.isPremium || status === 'premium') {
            console.log('[Subscription] Keeping premium due to local/firebase confirmation');
            setStatus('premium');
          } else {
            setStatus('free');
          }
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
        statusSetByRC.current = true;
        console.log('[Subscription] Init complete, status:', status);
      } catch (err) {
        console.error('[Subscription] Init error:', err);
        clearTimeout(timeoutId);
        if (premiumEverConfirmed || status === 'premium') {
          console.log('[Subscription] Init failed but premium confirmed — keeping premium');
          setStatus('premium');
        } else {
          setStatus('free');
        }
        setIsInitialized(true);
      }
    };

    init();
  }, [loadSubscriptionFromFirebase, syncSubscriptionToFirebase, confirmPremium, isInitialized, premiumEverConfirmed, status]);

  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user && user.uid !== firebaseUserId.current) {
        console.log('[Subscription] Firebase user changed:', user.uid);
        firebaseUserId.current = user.uid;

        if (revenueCatInitialized.current) {
          try {
            await identifyUser(user.uid);
          } catch (err) {
            console.warn('[Subscription] RC re-identify failed:', err);
          }
        }

        await checkAndUpdateStatus(true);
      } else if (!user) {
        firebaseUserId.current = null;
        lastSyncedStatus.current = null;
      }
    });

    return () => unsubscribe();
  }, [isInitialized, checkAndUpdateStatus]);

  useEffect(() => {
    if (!isInitialized || Platform.OS === 'web') return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && revenueCatInitialized.current) {
        console.log('[Subscription] App resumed — checking status');
        try {
          const info = await withTimeout(getCustomerInfo(), 5000, null);
          if (info) {
            const hasPremium = checkEntitlements(info);
            if (hasPremium) {
              console.log('[Subscription] Confirmed premium on resume');
              setCustomerInfo(info);
              confirmPremium(info.latestExpirationDate);
            } else if (premiumEverConfirmed) {
              console.log('[Subscription] RC says free on resume but was premium — keeping premium');
              setStatus('premium');
            }
          } else if (premiumEverConfirmed) {
            console.log('[Subscription] RC unavailable on resume — keeping premium');
            setStatus('premium');
          }
        } catch (err) {
          console.warn('[Subscription] Error on resume — keeping current status:', err);
          if (premiumEverConfirmed) {
            setStatus('premium');
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isInitialized, confirmPremium, premiumEverConfirmed]);

  const handlePurchase = useCallback(async (packageIdentifier: string): Promise<boolean> => {
    console.log('[Subscription] Purchase requested:', packageIdentifier);

    const pkg = findPackageByIdentifier(packageIdentifier);
    if (!pkg) {
      Alert.alert('Error', 'Package not found. Please try again.');
      return false;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const info = await purchasePackage(pkg);

      if (info) {
        setCustomerInfo(info);
        const hasPremium = checkEntitlements(info);
        if (hasPremium) {
          confirmPremium(info.latestExpirationDate);
          console.log('[Subscription] Purchase successful — PREMIUM');
          await syncSubscriptionToFirebase('premium', info, true);
          return true;
        }
      }

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
  }, [syncSubscriptionToFirebase, confirmPremium]);

  const handleRestore = useCallback(async (): Promise<boolean> => {
    console.log('[Subscription] Restore requested');
    setIsPurchasing(true);
    setError(null);

    try {
      const info = await restorePurchases();

      if (info) {
        setCustomerInfo(info);
        const hasPremium = checkEntitlements(info);
        if (hasPremium) {
          confirmPremium(info.latestExpirationDate);
          console.log('[Subscription] Restore successful — PREMIUM');
          await syncSubscriptionToFirebase('premium', info, true);
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
  }, [syncSubscriptionToFirebase, confirmPremium]);

  const refreshStatus = useCallback(async () => {
    console.log('[Subscription] Manual refresh...');
    try {
      await checkAndUpdateStatus(true);
    } catch (err) {
      console.error('[Subscription] Refresh error:', err);
    }
  }, [checkAndUpdateStatus]);

  const reloadOfferings = useCallback(async () => {
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
      } else {
        setError('No subscription plans found');
      }
    } catch (err: any) {
      console.error('[Subscription] Reload error:', err);
      setError(err.message || 'Failed to load plans');
    }
  }, []);

  const isPremium = status === 'premium' || (premiumEverConfirmed && status === 'loading');

  return {
    isInitialized,
    status,
    packages,
    customerInfo,
    isPurchasing,
    error,
    isFirstLaunch,
    isPremium,
    isTrialExpired: (isTrialExpired || trialExpiredLive) && !premiumEverConfirmed && !isPremium,
    trialStartISO,
    premiumEverConfirmed,
    purchasePackage: handlePurchase,
    restorePurchases: handleRestore,
    refreshStatus,
    reloadOfferings,
    setIsFirstLaunch,
  };
});
