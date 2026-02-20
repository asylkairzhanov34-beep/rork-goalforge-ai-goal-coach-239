import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Redirect } from 'expo-router';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useGoalStore } from '@/hooks/use-goal-store';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

const MAX_LOADING_TIMEOUT = 7000;
const SETUP_LOADING_TIMEOUT = 3000;
const DATA_LOADING_TIMEOUT = 10000;

export default function Index() {
  const [forceReady, setForceReady] = useState(false);
  const [setupForceReady, setSetupForceReady] = useState(false);
  const [dataForceReady, setDataForceReady] = useState(false);
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
  const { isReady: goalDataReady, isLoading: goalDataLoading } = useGoalStore();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.warn('[Index] Auth loading timeout reached, forcing proceed');
      setForceReady(true);
    }, MAX_LOADING_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timeoutId = setTimeout(() => {
      console.warn('[Index] Setup loading timeout reached, forcing proceed');
      setSetupForceReady(true);
    }, SETUP_LOADING_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !profile?.isCompleted) return;
    console.log('[Index] Waiting for Firebase data (goals, tasks, profile)...');
    const timeoutId = setTimeout(() => {
      console.warn('[Index] Data loading timeout reached, forcing proceed to home');
      setDataForceReady(true);
    }, DATA_LOADING_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, profile?.isCompleted]);

  useEffect(() => {
    if (goalDataReady && isAuthenticated && profile?.isCompleted) {
      console.log('[Index] ✅ Firebase data loaded successfully, ready to navigate home');
    }
  }, [goalDataReady, isAuthenticated, profile?.isCompleted]);

  useEffect(() => {
    if (!isAuthenticated || !profile?.isCompleted || welcomeOnboardingCompleted) return;
    console.log('[Index] Restoring welcome onboarding flag from Firebase profile');
    setWelcomeOnboardingCompleted(true).catch(() => {});
  }, [isAuthenticated, profile?.isCompleted, setWelcomeOnboardingCompleted, welcomeOnboardingCompleted]);

  const route = useMemo(() => {
    if (authLoading && !isAuthenticated && !forceReady) return 'loading';

    if (!isAuthenticated && !authLoading) {
      return 'auth';
    }
    if (!isAuthenticated && forceReady) {
      return 'auth';
    }

    if (needsLoginGate || requiresFirstLogin) return 'auth';

    if (!welcomeOnboardingCompleted) return 'video-intro';

    if (setupLoading && !setupForceReady && !forceReady) return 'loading-setup';
    if (!profile || !profile.nickname || !profile.isCompleted) return 'first-time-setup';

    if (goalDataLoading && !goalDataReady && !dataForceReady) {
      console.log('[Index] Waiting for Firebase data to load before navigating home...');
      return 'loading-data';
    }

    return 'home';
  }, [authLoading, forceReady, setupForceReady, dataForceReady, isAuthenticated, needsLoginGate, requiresFirstLogin, welcomeOnboardingCompleted, setupLoading, profile, goalDataReady, goalDataLoading]);

  if (route === 'loading' || route === 'loading-setup' || route === 'loading-data') {
    return <AppLoadingScreen testID="app-loading" />;
  }

  if (route === 'auth') {
    if (!hasLoggedRouting.current) {
      console.log('[Index] Routing to /auth');
      hasLoggedRouting.current = true;
    }
    return <Redirect href={'/auth' as any} />;
  }

  if (route === 'video-intro') {
    return <Redirect href={'/video-intro' as any} />;
  }

  if (route === 'first-time-setup') {
    return <Redirect href={'/first-time-setup' as any} />;
  }

  console.log('[Index] All checks passed, routing to home');
  return <Redirect href={"/(tabs)/home" as any} />;
}
