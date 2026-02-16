import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useSubscription } from './use-subscription-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFER_DISMISSED_KEY = 'subscription_offer_dismissed_at';
const OFFER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export type SubscriptionStatusHook = {
  isPremium: boolean;
  checking: boolean;
  shouldShowOffer: boolean;
  refreshStatus: () => Promise<void>;
  canAccessPremium: () => boolean;
  markOfferDismissed: () => Promise<void>;
};

export function useSubscriptionStatus(): SubscriptionStatusHook {
  const { status, isInitialized, refreshStatus, isPremium, premiumEverConfirmed } = useSubscription();
  const [checking, setChecking] = useState(false);
  const [offerDismissedAt, setOfferDismissedAt] = useState<number | null>(null);
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  const hasRefreshedOnMount = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(OFFER_DISMISSED_KEY)
      .then((val) => {
        if (val) setOfferDismissedAt(parseInt(val, 10));
      })
      .catch(() => {})
      .finally(() => setDismissedLoaded(true));
  }, []);

  useEffect(() => {
    if (isInitialized && !hasRefreshedOnMount.current && premiumEverConfirmed && !isPremium) {
      hasRefreshedOnMount.current = true;
      console.log('[SubscriptionStatus] Previously premium, refreshing...');
      setChecking(true);
      refreshStatus().finally(() => setChecking(false));
    }
  }, [isInitialized, premiumEverConfirmed, isPremium, refreshStatus]);

  const markOfferDismissed = useCallback(async () => {
    const now = Date.now();
    setOfferDismissedAt(now);
    await AsyncStorage.setItem(OFFER_DISMISSED_KEY, now.toString());
  }, []);

  const shouldShowOffer = useMemo(() => {
    if (!isInitialized || !dismissedLoaded) return false;
    if (checking) return false;
    if (isPremium || premiumEverConfirmed) return false;
    if (status === 'premium' || status === 'loading') return false;

    if (offerDismissedAt) {
      const elapsed = Date.now() - offerDismissedAt;
      if (elapsed < OFFER_COOLDOWN_MS) return false;
    }

    return true;
  }, [isInitialized, dismissedLoaded, status, isPremium, premiumEverConfirmed, offerDismissedAt, checking]);

  const handleRefresh = useCallback(async () => {
    setChecking(true);
    try {
      await refreshStatus();
    } finally {
      setChecking(false);
    }
  }, [refreshStatus]);

  const canAccessPremium = useCallback(() => {
    return isPremium || premiumEverConfirmed;
  }, [isPremium, premiumEverConfirmed]);

  return {
    isPremium: isPremium || premiumEverConfirmed,
    checking: checking || !isInitialized || !dismissedLoaded,
    shouldShowOffer,
    refreshStatus: handleRefresh,
    canAccessPremium,
    markOfferDismissed,
  };
}
