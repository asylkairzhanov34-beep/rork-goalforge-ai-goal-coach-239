import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const LAST_OPEN_DATE_KEY = 'last_app_open_date';

export function useDailyFirstOpen() {
  const [isFirstOpenToday, setIsFirstOpenToday] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  const getTodayKey = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const checkFirstOpen = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      const lastOpenDate = await AsyncStorage.getItem(LAST_OPEN_DATE_KEY);
      
      console.log('[DailyFirstOpen] Checking:', { todayKey, lastOpenDate });
      
      if (lastOpenDate !== todayKey) {
        console.log('[DailyFirstOpen] First open today!');
        setIsFirstOpenToday(true);
        await AsyncStorage.setItem(LAST_OPEN_DATE_KEY, todayKey);
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        return true;
      } else {
        console.log('[DailyFirstOpen] Already opened today');
        setIsFirstOpenToday(false);
        return false;
      }
    } catch (error) {
      console.error('[DailyFirstOpen] Error checking first open:', error);
      return false;
    }
  }, [getTodayKey]);

  const markAsTriggered = useCallback(() => {
    setHasTriggered(true);
    setIsFirstOpenToday(false);
  }, []);

  useEffect(() => {
    checkFirstOpen();
  }, [checkFirstOpen]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkFirstOpen();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkFirstOpen]);

  return {
    isFirstOpenToday: isFirstOpenToday && !hasTriggered,
    markAsTriggered,
    checkFirstOpen,
  };
}
