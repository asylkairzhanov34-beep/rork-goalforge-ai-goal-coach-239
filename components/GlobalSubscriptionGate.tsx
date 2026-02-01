import React, { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import TrialExpiredModal from '@/components/TrialExpiredModal';

const BLOCK_PERSISTED_KEY = 'subscription_block_active';
const TRIAL_START_KEY = 'trialStartISO';
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export function GlobalSubscriptionGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTrialExpired, isPremium, checking } = useSubscriptionStatus();
  const [isReady, setIsReady] = useState(false);
  const [persistedBlock, setPersistedBlock] = useState(false);
  const [directTrialExpired, setDirectTrialExpired] = useState(false);
  const blockStateRef = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkTrialDirectly = async () => {
      try {
        const trialStart = await AsyncStorage.getItem(TRIAL_START_KEY);
        if (trialStart) {
          const startMs = Date.parse(trialStart);
          if (!Number.isNaN(startMs)) {
            const expiresMs = startMs + TRIAL_DURATION_MS;
            const isExpired = Date.now() >= expiresMs;
            console.log('[GlobalSubscriptionGate] Direct trial check:', { trialStart, isExpired });
            setDirectTrialExpired(isExpired);
            
            if (isExpired) {
              await AsyncStorage.setItem(BLOCK_PERSISTED_KEY, 'true');
              setPersistedBlock(true);
            }
          }
        }
        
        const blocked = await AsyncStorage.getItem(BLOCK_PERSISTED_KEY);
        if (blocked === 'true') {
          console.log('[GlobalSubscriptionGate] Persisted block found');
          setPersistedBlock(true);
        }
      } catch (error) {
        console.error('[GlobalSubscriptionGate] Direct check failed:', error);
      }
      setIsReady(true);
    };

    checkTrialDirectly();
    
    checkIntervalRef.current = setInterval(async () => {
      try {
        const trialStart = await AsyncStorage.getItem(TRIAL_START_KEY);
        if (trialStart) {
          const startMs = Date.parse(trialStart);
          if (!Number.isNaN(startMs)) {
            const expiresMs = startMs + TRIAL_DURATION_MS;
            const isExpired = Date.now() >= expiresMs;
            if (isExpired && !directTrialExpired) {
              console.log('[GlobalSubscriptionGate] Trial just expired (interval check)');
              setDirectTrialExpired(true);
              await AsyncStorage.setItem(BLOCK_PERSISTED_KEY, 'true');
              setPersistedBlock(true);
            }
          }
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [directTrialExpired]);

  const isOnAllowedScreen = pathname === '/subscription' || pathname === '/subscription-success';

  const trialExpiredNow = isTrialExpired || directTrialExpired;
  
  const currentShouldBlock = 
    isReady && 
    !isPremium && 
    (trialExpiredNow || persistedBlock) && 
    !isOnAllowedScreen;

  useEffect(() => {
    const updatePersistedBlock = async () => {
      if (currentShouldBlock && !blockStateRef.current) {
        console.log('[GlobalSubscriptionGate] Blocking user - trial expired');
        blockStateRef.current = true;
        await AsyncStorage.setItem(BLOCK_PERSISTED_KEY, 'true');
        setPersistedBlock(true);
      }
      
      if (isPremium && blockStateRef.current) {
        console.log('[GlobalSubscriptionGate] Unblocking user - now premium');
        blockStateRef.current = false;
        await AsyncStorage.removeItem(BLOCK_PERSISTED_KEY);
        setPersistedBlock(false);
      }
    };
    
    updatePersistedBlock();
  }, [currentShouldBlock, isPremium]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        try {
          const blocked = await AsyncStorage.getItem(BLOCK_PERSISTED_KEY);
          const trialStart = await AsyncStorage.getItem(TRIAL_START_KEY);
          
          if (trialStart) {
            const startMs = Date.parse(trialStart);
            if (!Number.isNaN(startMs)) {
              const expiresMs = startMs + TRIAL_DURATION_MS;
              if (Date.now() >= expiresMs) {
                setDirectTrialExpired(true);
                await AsyncStorage.setItem(BLOCK_PERSISTED_KEY, 'true');
                setPersistedBlock(true);
              }
            }
          }
          
          if (blocked === 'true' && !isPremium) {
            console.log('[GlobalSubscriptionGate] App active, block persisted');
            setPersistedBlock(true);
          }
        } catch (e) {
          console.error('[GlobalSubscriptionGate] AppState check failed:', e);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isPremium]);

  useEffect(() => {
    if (isReady) {
      console.log('[GlobalSubscriptionGate] State:', {
        isReady,
        checking,
        isPremium,
        isTrialExpired,
        directTrialExpired,
        persistedBlock,
        pathname,
        currentShouldBlock,
      });
    }
  }, [isReady, checking, isPremium, isTrialExpired, directTrialExpired, persistedBlock, pathname, currentShouldBlock]);

  const handleGetPremium = useCallback(() => {
    router.push('/subscription');
  }, [router]);

  const shouldShowModal = currentShouldBlock || (persistedBlock && !isPremium && !isOnAllowedScreen);

  if (!shouldShowModal) {
    return null;
  }

  return (
    <TrialExpiredModal
      visible={true}
      onGetPremium={handleGetPremium}
      testID="global-subscription-gate"
    />
  );
}
