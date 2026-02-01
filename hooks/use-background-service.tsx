import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_TIMER_KEY = 'background_timer_state';
const BACKGROUND_START_TIME_KEY = 'background_start_time';

export interface BackgroundTimerState {
  isActive: boolean;
  remainingTime: number;
  totalTime: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  goalId?: string;
  startedAt: number;
}

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.log('[BackgroundService] expo-notifications not available');
}

export function useBackgroundService() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);

  useEffect(() => {
    console.log('[BackgroundService] Initializing background service...');
    
    const initBackgroundService = async () => {
      try {
        if (Notifications && Platform.OS !== 'web') {
          const settings = await Notifications.getPermissionsAsync();
          console.log('[BackgroundService] Notification permissions:', settings.status);
          
          if (settings.status !== 'granted') {
            console.log('[BackgroundService] Requesting notification permissions...');
            const result = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowAnnouncements: true,
                allowCriticalAlerts: true,
                provideAppNotificationSettings: true,
                allowProvisional: false,
              },
            });
            console.log('[BackgroundService] Permission result:', result.status);
          }

          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('timer', {
              name: 'Timer Notifications',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF6B35',
              sound: 'default',
              enableLights: true,
              enableVibrate: true,
              lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
              bypassDnd: true,
            });
            console.log('[BackgroundService] Android notification channel created');
          }
        }
        
        setIsBackgroundReady(true);
        console.log('[BackgroundService] Background service ready');
      } catch (error) {
        console.error('[BackgroundService] Init error:', error);
        setIsBackgroundReady(true);
      }
    };

    initBackgroundService();
  }, []);

  const saveBackgroundState = useCallback(async (state: BackgroundTimerState) => {
    try {
      await AsyncStorage.setItem(BACKGROUND_TIMER_KEY, JSON.stringify(state));
      await AsyncStorage.setItem(BACKGROUND_START_TIME_KEY, Date.now().toString());
      console.log('[BackgroundService] Saved background state:', state);
    } catch (error) {
      console.error('[BackgroundService] Failed to save background state:', error);
    }
  }, []);

  const getBackgroundState = useCallback(async (): Promise<BackgroundTimerState | null> => {
    try {
      const stateJson = await AsyncStorage.getItem(BACKGROUND_TIMER_KEY);
      const startTimeStr = await AsyncStorage.getItem(BACKGROUND_START_TIME_KEY);
      
      if (!stateJson || !startTimeStr) {
        return null;
      }

      const state: BackgroundTimerState = JSON.parse(stateJson);
      const startTime = parseInt(startTimeStr, 10);
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      const newRemainingTime = Math.max(0, state.remainingTime - elapsedSeconds);
      
      console.log('[BackgroundService] Retrieved background state, elapsed:', elapsedSeconds, 'remaining:', newRemainingTime);
      
      return {
        ...state,
        remainingTime: newRemainingTime,
      };
    } catch (error) {
      console.error('[BackgroundService] Failed to get background state:', error);
      return null;
    }
  }, []);

  const clearBackgroundState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(BACKGROUND_TIMER_KEY);
      await AsyncStorage.removeItem(BACKGROUND_START_TIME_KEY);
      console.log('[BackgroundService] Cleared background state');
    } catch (error) {
      console.error('[BackgroundService] Failed to clear background state:', error);
    }
  }, []);

  const scheduleBackgroundNotification = useCallback(async (
    title: string,
    body: string,
    seconds: number,
    data: Record<string, any> = {}
  ): Promise<string | null> => {
    if (!Notifications || Platform.OS === 'web') {
      console.log('[BackgroundService] Notifications not available for scheduling');
      return null;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[BackgroundService] Cancelled all previous notifications');

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: 'max',
          badge: 1,
          categoryIdentifier: 'timer',
          ...(Platform.OS === 'android' && {
            channelId: 'timer',
          }),
        },
        trigger: {
          seconds: Math.max(1, seconds),
          type: 'timeInterval',
        },
      });

      console.log('[BackgroundService] Scheduled notification:', notificationId, 'in', seconds, 'seconds');
      return notificationId;
    } catch (error) {
      console.error('[BackgroundService] Failed to schedule notification:', error);
      return null;
    }
  }, []);

  const cancelBackgroundNotification = useCallback(async (notificationId?: string) => {
    if (!Notifications || Platform.OS === 'web') return;

    try {
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log('[BackgroundService] Cancelled notification:', notificationId);
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('[BackgroundService] Cancelled all notifications');
      }
    } catch (error) {
      console.error('[BackgroundService] Failed to cancel notification:', error);
    }
  }, []);

  const sendImmediateNotification = useCallback(async (
    title: string,
    body: string,
    data: Record<string, any> = {}
  ) => {
    if (!Notifications || Platform.OS === 'web') {
      console.log('[BackgroundService] Immediate notification (web):', title, body);
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: 'max',
          badge: 1,
          ...(Platform.OS === 'android' && {
            channelId: 'timer',
          }),
        },
        trigger: null,
      });
      console.log('[BackgroundService] Sent immediate notification');
    } catch (error) {
      console.error('[BackgroundService] Failed to send notification:', error);
    }
  }, []);

  return {
    isBackgroundReady,
    saveBackgroundState,
    getBackgroundState,
    clearBackgroundState,
    scheduleBackgroundNotification,
    cancelBackgroundNotification,
    sendImmediateNotification,
  };
}

export function useAppStateHandler(
  onForeground: () => void,
  onBackground: () => void
) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('[AppState] Changed from', appState.current, 'to', nextAppState);
      
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AppState] App came to foreground');
        onForeground();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('[AppState] App went to background');
        onBackground();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [onForeground, onBackground]);
}
