import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSubscription } from './use-subscription-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFER_DISMISSED_KEY = 'subscription_offer_dismissed_at';
const OFFER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type SubscriptionStatusHook = {
  isPremium: boolean;
  checking: boolean;
  shouldShowOffer: boolean;
  refreshStatus: () => Promise<void>;
  canAccessPremium: () => boolean;
  markOfferDismissed: () => Promise<void>;
};

export function useSubscriptionStatus(): SubscriptionStatusHook {
  const { status, isInitialized, refreshStatus, isPremium } = useSubscription();
  const [checking, setChecking] = useState(false);
  const [offerDismissedAt, setOfferDismissedAt] = useState<number | null>(null);
  const [dismissedLoaded, setDismissedLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(OFFER_DISMISSED_KEY)
      .then((val) => {
        if (val) {
          setOfferDismissedAt(parseInt(val, 10));
        }
      })
      .catch(() => {})
      .finally(() => setDismissedLoaded(true));
  }, []);

  const markOfferDismissed = useCallback(async () => {
    const now = Date.now();
    setOfferDismissedAt(now);
    await AsyncStorage.setItem(OFFER_DISMISSED_KEY, now.toString());
    console.log('[SubscriptionStatus] Offer dismissed, cooldown started');
  }, []);

  const shouldShowOffer = useMemo(() => {
    if (!isInitialized || !dismissedLoaded) return false;
    if (status === 'premium') return false;
    
    if (offerDismissedAt) {
      const elapsed = Date.now() - offerDismissedAt;
      if (elapsed < OFFER_COOLDOWN_MS) {
        console.log('[SubscriptionStatus] Offer in cooldown, remaining:', Math.round((OFFER_COOLDOWN_MS - elapsed) / 1000 / 60), 'min');
        return false;
      }
    }
    
    return true;
  }, [isInitialized, dismissedLoaded, status, offerDismissedAt]);

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
    checking: checking || !isInitialized || !dismissedLoaded,
    shouldShowOffer,
    refreshStatus: handleRefresh,
    canAccessPremium,
    markOfferDismissed,
  };
}
