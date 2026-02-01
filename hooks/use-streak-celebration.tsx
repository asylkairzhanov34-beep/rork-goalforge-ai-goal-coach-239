import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useDailyFirstOpen } from '@/hooks/use-daily-first-open';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const [StreakCelebrationProvider, useStreakCelebration] = createContextHook(() => {
  const { profile, isReady } = useGoalStore();
  const { isFirstOpenToday, markAsTriggered } = useDailyFirstOpen();
  const [isVisible, setIsVisible] = useState(false);
  const previousStreakRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailyTriggeredRef = useRef(false);

  const currentStreak = profile?.currentStreak ?? 0;

  useEffect(() => {
    if (isFirstOpenToday && isReady && currentStreak > 0 && !dailyTriggeredRef.current) {
      console.log('[StreakCelebration] First open today with streak!', { currentStreak });
      dailyTriggeredRef.current = true;
      
      setTimeout(() => {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setIsVisible(true);
        markAsTriggered();

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 8000);
      }, 1500);
    }
  }, [isFirstOpenToday, isReady, currentStreak, markAsTriggered]);

  useEffect(() => {
    if (previousStreakRef.current !== null && currentStreak > previousStreakRef.current && currentStreak > 0) {
      console.log('[StreakCelebration] Streak increased!', { 
        from: previousStreakRef.current, 
        to: currentStreak 
      });
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setIsVisible(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 8000);
    }
    
    previousStreakRef.current = currentStreak;
  }, [currentStreak]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showCelebration = useCallback(() => {
    setIsVisible(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 6000);
  }, []);

  const hideCelebration = useCallback(() => {
    setIsVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const triggerManually = useCallback(() => {
    console.log('[StreakCelebration] Manual trigger');
    showCelebration();
  }, [showCelebration]);

  return {
    isVisible,
    showCelebration,
    hideCelebration,
    triggerManually,
    currentStreak,
  };
});
