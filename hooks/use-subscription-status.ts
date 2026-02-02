import { useCallback, useMemo, useState } from 'react';
import { useSubscription } from './use-subscription-store';

export type SubscriptionStatusHook = {
  isPremium: boolean;
  checking: boolean;
  shouldShowOffer: boolean;
  refreshStatus: () => Promise<void>;
  canAccessPremium: () => boolean;
};

export function useSubscriptionStatus(): SubscriptionStatusHook {
  const { status, isInitialized, refreshStatus, isPremium } = useSubscription();
  const [checking, setChecking] = useState(false);

  const shouldShowOffer = useMemo(() => {
    if (!isInitialized) return false;
    if (status === 'premium') return false;
    return true;
  }, [isInitialized, status]);

  const handleRefresh = useCallback(async () => {
    setChecking(true);
    try {
      await refreshStatus();
    } finally {
      setChecking(false);
    }
  }, [refreshStatus]);

  const canAccessPremium = useCallback(() => {
    return isPremium;
  }, [isPremium]);

  return {
    isPremium,
    checking: checking || !isInitialized,
    shouldShowOffer,
    refreshStatus: handleRefresh,
    canAccessPremium,
  };
}
