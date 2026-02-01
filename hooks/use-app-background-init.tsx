import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { safeStorageGet } from '@/utils/storage-helper';
import { FirstTimeProfile } from '@/types/first-time-setup';

export function useAppBackgroundInit() {
  const isInitialized = useRef(false);
  const notificationsScheduled = useRef(false);

  const requestNotificationPermissions = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('[BackgroundInit] Notifications not supported on web');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('[BackgroundInit] Current permission status:', existingStatus);
      
      if (existingStatus === 'granted') {
        console.log('[BackgroundInit] Notifications already granted');
        return true;
      }

      console.log('[BackgroundInit] Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {},
      });

      console.log('[BackgroundInit] Permission request result:', status);
      return status === 'granted';
    } catch (error) {
      console.error('[BackgroundInit] Error requesting permissions:', error);
      return false;
    }
  }, []);

  const setupNotificationChannels = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('timer', {
        name: 'Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      console.log('[BackgroundInit] Android notification channels created');
    } catch (error) {
      console.error('[BackgroundInit] Error creating channels:', error);
    }
  }, []);

  const configureNotificationHandler = useCallback(() => {

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log('[BackgroundInit] Notification handler configured');
  }, []);

  const getNotificationTimeForProductivity = (productivityTime: string | undefined): { hour: number; minute: number } => {
    switch (productivityTime) {
      case 'morning':
        return { hour: 8, minute: 0 };
      case 'afternoon':
        return { hour: 13, minute: 0 };
      case 'evening':
        return { hour: 19, minute: 0 };
      default:
        return { hour: 9, minute: 0 };
    }
  };

  const scheduleGoalReminderForUser = useCallback(async () => {
    if (Platform.OS === 'web' || notificationsScheduled.current) {
      return;
    }

    try {
      const profile = await safeStorageGet<FirstTimeProfile | null>('first_time_setup_default', null);
      
      if (!profile?.isCompleted || !profile?.productivityTime || profile.productivityTime === 'unknown') {
        console.log('[BackgroundInit] User profile not complete or no productivity time set');
        return;
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('[BackgroundInit] Notification permissions not granted, skipping scheduling');
        return;
      }

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const hasGoalReminder = scheduled.some((n: any) => n.content?.data?.type === 'goal_reminder');

      if (hasGoalReminder) {
        console.log('[BackgroundInit] Goal reminder already scheduled');
        notificationsScheduled.current = true;
        return;
      }

      const { hour, minute } = getNotificationTimeForProductivity(profile.productivityTime);
      const timeLabels: Record<string, string> = {
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
      };
      const timeLabel = timeLabels[profile.productivityTime] || 'today';

      console.log(`[BackgroundInit] Scheduling goal reminder at ${hour}:${minute} (${profile.productivityTime})`);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for Your Goal',
          body: `Time to work on your goal. Your peak productivity is in the ${timeLabel}.`,
          data: { type: 'goal_reminder', productivityTime: profile.productivityTime },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour,
          minute,
          repeats: true,
        },
      });

      notificationsScheduled.current = true;
      console.log('[BackgroundInit] Goal reminder scheduled successfully');
    } catch (error) {
      console.error('[BackgroundInit] Error scheduling goal reminder:', error);
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    const initializeBackgroundServices = async () => {
      console.log('[BackgroundInit] Initializing background services...');
      
      configureNotificationHandler();
      
      const permissionGranted = await requestNotificationPermissions();
      console.log('[BackgroundInit] Notifications permission granted:', permissionGranted);
      
      await setupNotificationChannels();
      
      await scheduleGoalReminderForUser();
      
      isInitialized.current = true;
      console.log('[BackgroundInit] Background services initialized successfully');
    };

    initializeBackgroundServices();
  }, [requestNotificationPermissions, setupNotificationChannels, configureNotificationHandler, scheduleGoalReminderForUser]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isInitialized.current) {
        console.log('[BackgroundInit] App became active, checking permissions...');
        requestNotificationPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestNotificationPermissions]);

  return {
    requestNotificationPermissions,
    scheduleGoalReminderForUser,
  };
}
