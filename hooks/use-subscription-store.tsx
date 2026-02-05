import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import {
  initializeRevenueCat,
  getOfferings,
  getCustomerInfo,
  purchasePackage,
  restorePurchases,
  findPackageByIdentifier,
  RevenueCatCustomerInfo,
} from '@/lib/revenuecat';
import {
  saveUserSubscription,
  getUserSubscription,
  getCurrentUser,
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
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<RevenueCatCustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const lastSyncedStatus = useRef<SubscriptionStatus | null>(null);

  const syncSubscriptionToFirebase = useCallback(async (
    newStatus: SubscriptionStatus,
    info: RevenueCatCustomerInfo | null
  ) => {
    try {
      const firebaseUser = getCurrentUser();
      if (!firebaseUser) {
        console.log('[Subscription] No Firebase user - skipping sync');
        return;
      }

      if (lastSyncedStatus.current === newStatus) {
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
      };

      console.log('[Subscription] 🔄 Syncing to Firebase:', subscriptionData);
      await saveUserSubscription(firebaseUser.uid, subscriptionData);
      lastSyncedStatus.current = newStatus;
      console.log('[Subscription] ✅ Synced to Firebase');
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

  useEffect(() => {
    const init = async () => {
      console.log('[Subscription] 🚀 Initializing...');
      console.log('[Subscription] Platform:', Platform.OS);
      console.log('[Subscription] __DEV__:', __DEV__);

      try {
        const firebaseData = await loadSubscriptionFromFirebase();
        
        if (firebaseData?.isPremium) {
          console.log('[Subscription] 📥 Found premium status in Firebase');
          setStatus('premium');
          lastSyncedStatus.current = 'premium';
        }

        const rcInitialized = await initializeRevenueCat();
        
        if (!rcInitialized) {
          console.error('[Subscription] RevenueCat init failed');
          setError('Failed to initialize purchases');
          if (!firebaseData?.isPremium) {
            setStatus('free');
          }
          setIsInitialized(true);
          return;
        }

        const [info, offerings] = await Promise.all([
          getCustomerInfo(),
          getOfferings(),
        ]);

        if (info) {
          setCustomerInfo(info);
          const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                            info.entitlements.active['premium'] !== undefined;
          const newStatus = hasPremium ? 'premium' : 'free';
          setStatus(newStatus);
          console.log('[Subscription] Status from RevenueCat:', hasPremium ? 'PREMIUM' : 'FREE');
          
          await syncSubscriptionToFirebase(newStatus, info);
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
        } else {
          console.warn('[Subscription] No packages available');
          setError('No subscription plans found. Please check your RevenueCat dashboard.');
        }

        setIsInitialized(true);
        console.log('[Subscription] ✅ Initialization complete');
      } catch (err) {
        console.error('[Subscription] Init error:', err);
        setError('Initialization error');
        setStatus('free');
        setIsInitialized(true);
      }
    };

    init();
  }, [loadSubscriptionFromFirebase, syncSubscriptionToFirebase]);

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
    try {
      const info = await getCustomerInfo();
      if (info) {
        setCustomerInfo(info);
        const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                          info.entitlements.active['premium'] !== undefined;
        const newStatus = hasPremium ? 'premium' : 'free';
        setStatus(newStatus);
        
        await syncSubscriptionToFirebase(newStatus, info);
      }
    } catch (err) {
      console.error('[Subscription] Refresh error:', err);
    }
  }, [syncSubscriptionToFirebase]);

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
    purchasePackage: handlePurchase,
    restorePurchases: handleRestore,
    refreshStatus,
    reloadOfferings,
    setIsFirstLaunch,
  };
});
