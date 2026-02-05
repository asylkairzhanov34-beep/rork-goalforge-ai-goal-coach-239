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
  const { isAuthenticated, isLoading: authLoading, needsLoginGate, requiresFirstLogin, welcomeOnboardingCompleted } = useAuth();
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

  const isStillLoading = !isClient || !isReady || authLoading || setupLoading || !subInitialized;
  
  if (isStillLoading && !forceReady) {
    return <AppLoadingScreen testID="app-loading" />;
  }
  
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
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

