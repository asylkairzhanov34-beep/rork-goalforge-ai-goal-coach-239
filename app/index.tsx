import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Redirect } from 'expo-router';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

const MAX_LOADING_TIMEOUT = 4000;

export default function Index() {
  const [forceReady, setForceReady] = useState(false);
  const hasLoggedRouting = useRef(false);

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
    const timeoutId = setTimeout(() => {
      console.warn('[Index] Loading timeout reached, forcing proceed');
      setForceReady(true);
    }, MAX_LOADING_TIMEOUT);
    
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !profile?.isCompleted || welcomeOnboardingCompleted) return;
    console.log('[Index] Restoring welcome onboarding flag from Firebase profile');
    setWelcomeOnboardingCompleted(true).catch(() => {});
  }, [isAuthenticated, profile?.isCompleted, setWelcomeOnboardingCompleted, welcomeOnboardingCompleted]);

  const route = useMemo(() => {
    if (authLoading && !forceReady) return 'loading';
    if (!isAuthenticated || needsLoginGate || requiresFirstLogin) return 'auth';
    if (!welcomeOnboardingCompleted) return 'video-intro';
    if (setupLoading && !forceReady) return 'loading-setup';
    if (!profile || !profile.nickname || !profile.isCompleted) return 'first-time-setup';
    return 'home';
  }, [authLoading, forceReady, isAuthenticated, needsLoginGate, requiresFirstLogin, welcomeOnboardingCompleted, setupLoading, profile]);

  if (route === 'loading' || route === 'loading-setup') {
    return <AppLoadingScreen testID="app-loading" />;
  }

  if (route === 'auth') {
    if (!hasLoggedRouting.current) {
      console.log('[Index] Routing to /auth');
      hasLoggedRouting.current = true;
    }
    return <Redirect href="/auth" />;
  }

  if (route === 'video-intro') {
    return <Redirect href="/video-intro" />;
  }

  if (route === 'first-time-setup') {
    return <Redirect href="/first-time-setup" />;
  }

  console.log('[Index] All checks passed, routing to home');
  return <Redirect href="/(tabs)/home" />;
}

