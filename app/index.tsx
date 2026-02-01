import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { profile, isLoading: setupLoading } = useFirstTimeSetup();
  const { isAuthenticated, isLoading: authLoading, needsLoginGate, requiresFirstLogin, welcomeOnboardingCompleted } = useAuth();
  const { isInitialized: subInitialized } = useSubscription();
  const { 
    checking: subscriptionStatusChecking
  } = useSubscriptionStatus();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }
    const initializeApp = async () => {
      try {
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsReady(true);
      }
    };
    initializeApp();
  }, [isClient]);

  if (error) {
    console.warn('[Index] Error occurred but continuing:', error);
  }

  if (
    !isClient ||
    !isReady ||
    authLoading ||
    setupLoading ||
    !subInitialized ||
    subscriptionStatusChecking
  ) {
    return <AppLoadingScreen testID="app-loading" />;
  }

  if (!welcomeOnboardingCompleted) {
    console.log('[Index] Redirecting to video-intro');
    return <Redirect href="/video-intro" />;
  }

  if (!isAuthenticated || needsLoginGate || requiresFirstLogin) {
    return <Redirect href="/auth" />;
  }

  if (!profile || !profile.nickname || !profile.isCompleted) {
    console.log('[Index] Redirecting to first-time-setup:', {
      hasProfile: !!profile,
      hasNickname: !!profile?.nickname,
      isCompleted: profile?.isCompleted
    });
    return <Redirect href="/first-time-setup" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

