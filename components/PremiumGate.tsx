import React, { useEffect, useState, ReactNode, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';
import PaywallModal from './PaywallModal';
import { theme } from '@/constants/theme';

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  fallback?: ReactNode;
}

export default function PremiumGate({
  children,
  feature = 'this feature',
  fallback = null,
}: PremiumGateProps) {
  const router = useRouter();
  const { isPremium, isInitialized, status } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [accessDecided, setAccessDecided] = useState(false);

  useEffect(() => {
    if (!isInitialized || status === 'loading') {
      return;
    }
    
    setAccessDecided(true);
    setShowPaywall(!isPremium);
  }, [isInitialized, status, isPremium]);

  if (!isInitialized || status === 'loading' || !accessDecided) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <>
        {fallback}
        <PaywallModal
          visible={showPaywall}
          variant="feature"
          featureName={feature}
          onPrimaryAction={() => router.push('/subscription')}
          onSecondaryAction={() => setShowPaywall(false)}
          onRequestClose={() => setShowPaywall(false)}
          primaryLabel="Get Premium"
          secondaryLabel="Later"
        />
      </>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});

export function usePremiumGate() {
  const router = useRouter();
  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const checkAccess = useCallback((featureName?: string): boolean => {
    if (!isPremium) {
      setShowPaywall(true);
      console.log('[PremiumGate] Access denied:', featureName || 'premium feature');
    }
    return isPremium;
  }, [isPremium]);

  const Paywall = useCallback(() => (
    <PaywallModal
      visible={showPaywall}
      variant="feature"
      featureName="GoalForge Premium"
      onPrimaryAction={() => {
        setShowPaywall(false);
        router.push('/subscription');
      }}
      onSecondaryAction={() => setShowPaywall(false)}
      onRequestClose={() => setShowPaywall(false)}
      primaryLabel="Get Premium"
      secondaryLabel="Not Now"
    />
  ), [showPaywall, router]);

  return {
    checkAccess,
    hasAccess: isPremium,
    PaywallModal: Paywall,
  };
}
