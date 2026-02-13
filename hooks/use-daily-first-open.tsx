import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_FIRST_OPEN_KEY = '@daily_first_open';

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function useDailyFirstOpen() {
  const [isFirstOpenToday, setIsFirstOpenToday] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const check = async () => {
      try {
        const todayKey = getTodayKey();
        const stored = await AsyncStorage.getItem(DAILY_FIRST_OPEN_KEY);

        if (stored !== todayKey) {
          console.log('[DailyFirstOpen] First open today');
          setIsFirstOpenToday(true);
        } else {
          console.log('[DailyFirstOpen] Already opened today');
          setIsFirstOpenToday(false);
        }
      } catch (error) {
        console.warn('[DailyFirstOpen] Error checking:', error);
        setIsFirstOpenToday(false);
      }
    };

    check();
  }, []);

  const markAsTriggered = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      await AsyncStorage.setItem(DAILY_FIRST_OPEN_KEY, todayKey);
      setIsFirstOpenToday(false);
      console.log('[DailyFirstOpen] Marked as triggered for', todayKey);
    } catch (error) {
      console.warn('[DailyFirstOpen] Error marking:', error);
    }
  }, []);

  return { isFirstOpenToday, markAsTriggered };
}
