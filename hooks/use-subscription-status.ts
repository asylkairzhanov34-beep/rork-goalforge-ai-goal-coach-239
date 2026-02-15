import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useSubscription } from './use-subscription-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFER_DISMISSED_KEY = 'subscription_offer_dismissed_at';
const PREMIUM_CONFIRMED_KEY = 'subscription_premium_confirmed';
const OFFER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

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
  const [premiumConfirmed, setPremiumConfirmed] = useState(false);
  const hasRefreshedOnMount = useRef(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(OFFER_DISMISSED_KEY),
      AsyncStorage.getItem(PREMIUM_CONFIRMED_KEY),
    ])
      .then(([dismissedVal, premiumVal]) => {
        if (dismissedVal) {
          setOfferDismissedAt(parseInt(dismissedVal, 10));
        }
        if (premiumVal === 'true') {
          setPremiumConfirmed(true);
          console.log('[SubscriptionStatus] Previously confirmed premium user');
        }
      })
      .catch(() => {})
      .finally(() => setDismissedLoaded(true));
  }, []);

  useEffect(() => {
    if (isPremium && !premiumConfirmed) {
      setPremiumConfirmed(true);
      AsyncStorage.setItem(PREMIUM_CONFIRMED_KEY, 'true').catch(() => {});
      console.log('[SubscriptionStatus] Confirmed premium status saved');
    }
  }, [isPremium, premiumConfirmed]);

  useEffect(() => {
    if (isInitialized && !hasRefreshedOnMount.current && premiumConfirmed && !isPremium) {
      hasRefreshedOnMount.current = true;
      console.log('[SubscriptionStatus] Previously premium user, refreshing status...');
      setChecking(true);
      refreshStatus().finally(() => setChecking(false));
    }
  }, [isInitialized, premiumConfirmed, isPremium, refreshStatus]);

  const markOfferDismissed = useCallback(async () => {
    const now = Date.now();
    setOfferDismissedAt(now);
    await AsyncStorage.setItem(OFFER_DISMISSED_KEY, now.toString());
    console.log('[SubscriptionStatus] Offer dismissed, cooldown started');
  }, []);

  const shouldShowOffer = useMemo(() => {
    if (!isInitialized || !dismissedLoaded) return false;
    if (checking) return false;
    if (status === 'premium' || isPremium) return false;
    
    if (premiumConfirmed) {
      console.log('[SubscriptionStatus] Previously premium user, not showing offer until verified as non-premium');
      return false;
    }
    
    if (offerDismissedAt) {
      const elapsed = Date.now() - offerDismissedAt;
      if (elapsed < OFFER_COOLDOWN_MS) {
        console.log('[SubscriptionStatus] Offer in cooldown, remaining:', Math.round((OFFER_COOLDOWN_MS - elapsed) / 1000 / 60 / 60), 'hours');
        return false;
      }
    }
    
    return true;
  }, [isInitialized, dismissedLoaded, status, isPremium, offerDismissedAt, checking, premiumConfirmed]);

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
