import { useState, useEffect, useCallback } from 'react';
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

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<RevenueCatCustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  useEffect(() => {
    const init = async () => {
      console.log('[Subscription] 🚀 Initializing...');
      console.log('[Subscription] Platform:', Platform.OS);
      console.log('[Subscription] __DEV__:', __DEV__);

      try {
        const rcInitialized = await initializeRevenueCat();
        
        if (!rcInitialized) {
          console.error('[Subscription] RevenueCat init failed');
          setError('Failed to initialize purchases');
          setStatus('free');
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
          setStatus(hasPremium ? 'premium' : 'free');
          console.log('[Subscription] Status:', hasPremium ? 'PREMIUM' : 'FREE');
        } else {
          setStatus('free');
        }

        if (offerings?.current?.availablePackages) {
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
  }, []);

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
  }, []);

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
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      if (info) {
        setCustomerInfo(info);
        const hasPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                          info.entitlements.active['premium'] !== undefined;
        setStatus(hasPremium ? 'premium' : 'free');
      }
    } catch (err) {
      console.error('[Subscription] Refresh error:', err);
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
    setIsFirstLaunch,
  };
});
