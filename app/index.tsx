import React, { useEffect, useState, useRef } from 'react';
import { Redirect } from 'expo-router';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

const MAX_LOADING_TIMEOUT = 8000;

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { profile, isLoading: setupLoading } = useFirstTimeSetup();
  const {
    isAuthenticated,
    isLoading: authLoading,
    needsLoginGate,
    requiresFirstLogin,
    welcomeOnboardingCompleted,
    setWelcomeOnboardingCompleted,
  } = useAuth();
  const { isInitialized: subInitialized } = useSubscription();

  useEffect(() => {
    setIsClient(true);
    
    timeoutRef.current = setTimeout(() => {
      console.warn('[Index] Loading timeout reached, forcing app to proceed');
      setForceReady(true);
    }, MAX_LOADING_TIMEOUT);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
        console.error('[Index] Init error:', err);
        setIsReady(true);
      }
    };
    initializeApp();
  }, [isClient]);

  useEffect(() => {
    if (!isAuthenticated || !profile?.isCompleted || welcomeOnboardingCompleted) {
      return;
    }

    console.log('[Index] Restoring welcome onboarding flag from Firebase profile');
    setWelcomeOnboardingCompleted(true).catch((error) => {
      console.warn('[Index] Failed to restore welcome onboarding flag:', error);
    });
  }, [isAuthenticated, profile?.isCompleted, setWelcomeOnboardingCompleted, welcomeOnboardingCompleted]);

  const isStillLoading = !isClient || !isReady || authLoading || setupLoading || !subInitialized;
  
  if (isStillLoading && !forceReady) {
    return <AppLoadingScreen testID="app-loading" />;
  }
  
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  if (!isAuthenticated || needsLoginGate || requiresFirstLogin) {
    return <Redirect href="/auth" />;
  }

  if (!welcomeOnboardingCompleted) {
    console.log('[Index] Redirecting to video-intro');
    return <Redirect href="/video-intro" />;
  }

  if (setupLoading) {
    console.log('[Index] Waiting for setup profile to load from Firebase...');
    return <AppLoadingScreen testID="app-loading-setup" />;
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

