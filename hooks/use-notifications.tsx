import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

type MockPermissionStatus = 'granted' | 'denied' | 'undetermined';

interface MockNotification {
  request: {
    identifier: string;
    content: {
      title: string;
      body: string;
      data: any;
    };
  };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: MockPermissionStatus;
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    canAskAgain: true,
    status: 'undetermined' as MockPermissionStatus,
  });
  const [notification, setNotification] = useState<MockNotification | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((incoming: any) => {
      if (incoming) {
        setNotification(incoming);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      if (response) {
        console.log('Notification response:', response);
      }
    });

    return () => {
      notificationListener.current?.remove?.();
      responseListener.current?.remove?.();
    };
  }, []);

  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Notifications not available on web');
      return null;
    }

    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const DeviceModule = await import('expo-device');

    if (DeviceModule.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      setPermission({
        granted: finalStatus === 'granted',
        canAskAgain: finalStatus !== 'denied',
        status: finalStatus as MockPermissionStatus,
      });
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Push token:', token);
      } catch (e) {
        console.log('Error getting push token:', e);
        token = null;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Notifications unavailable',
        'Notification feature is not supported on web.'
      );
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    
    setPermission({
      granted,
      canAskAgain: status !== 'denied',
      status: status as MockPermissionStatus,
    });
    
    return granted;
  };

  const sanitizeEnglish = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return 'Notification';

    const hasCyrillic = /[\u0400-\u04FF]/.test(trimmed);
    if (!hasCyrillic) return trimmed;

    const stripped = trimmed.replace(/[\u0400-\u04FF]/g, '').replace(/\s+/g, ' ').trim();
    return stripped || 'Notification';
  };

  const scheduleNotification = async ({
    title,
    body,
    data = {},
    trigger,
    sound = 'default',
  }: {
    title: string;
    body: string;
    data?: Record<string, any>;
    trigger?: any;
    sound?: 'default' | 'bell' | 'chime' | 'ding';
  }) => {
    const safeTitle = sanitizeEnglish(title);
    const safeBody = sanitizeEnglish(body);

    if (Platform.OS === 'web') {
      console.log('Notifications not available on web, showing alert instead');
      Alert.alert(safeTitle, safeBody);
      return 'mock-id-' + Date.now();
    }

    if (!permission.granted) {
      console.log('Notifications not permitted');
      return null;
    }

    // Map sound names to system sounds or custom sounds
    let notificationSound: string | boolean = 'default';
    switch (sound) {
      case 'default':
        notificationSound = 'default';
        break;
      case 'bell':
        // Use system bell sound or custom sound
        notificationSound = Platform.OS === 'ios' ? 'bell.caf' : 'default';
        break;
      case 'chime':
        // Use system chime sound
        notificationSound = Platform.OS === 'ios' ? 'chime.caf' : 'default';
        break;
      case 'ding':
        // Use system ding sound
        notificationSound = Platform.OS === 'ios' ? 'ding.caf' : 'default';
        break;
      default:
        notificationSound = 'default';
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: safeTitle,
          body: safeBody,
          data,
          sound: notificationSound,
        },
        trigger: trigger || null, // null = немедленно
      });
      
      console.log('Notification scheduled with sound:', notificationSound, 'ID:', id);
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    if (Platform.OS === 'web') {
      console.log('Notifications not available on web, mock cancel:', notificationId);
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  };

  const cancelAllNotifications = async () => {
    if (Platform.OS === 'web') {
      console.log('Notifications not available on web, mock cancel all');
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  };

  // Вспомогательные функции для планирования уведомлений
  const scheduleTaskReminder = async (taskTitle: string, minutes: number = 30) => {
    return await scheduleNotification({
      title: 'Task Reminder',
      body: `Time to complete: ${taskTitle}`,
      data: { type: 'task_reminder', taskTitle },
      trigger: {
        seconds: minutes * 60,
      },
    });
  };

  const schedulePomodoroBreak = async (isLongBreak: boolean = false) => {
    const breakType = isLongBreak ? 'long' : 'short';
    return await scheduleNotification({
      title: 'Break Time!',
      body: `Take a ${breakType} break. Great work!`,
      data: { type: 'pomodoro_break', isLongBreak },
    });
  };

  const scheduleWorkSession = async () => {
    return await scheduleNotification({
      title: 'Time to Work!',
      body: 'Break is over. Time to start your next task.',
      data: { type: 'work_session' },
    });
  };

  const scheduleDailyReminder = async (hour: number = 9, minute: number = 0) => {
    return await scheduleNotification({
      title: 'Good Morning!',
      body: 'Time to plan your day and achieve your goals!',
      data: { type: 'daily_reminder' },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  };

  const getNotificationTimeForProductivity = (productivityTime: 'morning' | 'afternoon' | 'evening' | 'unknown' | undefined): { hour: number; minute: number } => {
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

  const scheduleGoalReminder = async (productivityTime: 'morning' | 'afternoon' | 'evening' | 'unknown' | undefined, goalTitle?: string) => {
    const { hour, minute } = getNotificationTimeForProductivity(productivityTime);
    
    const timeLabels: Record<string, string> = {
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
    };
    
    const timeLabel = productivityTime ? timeLabels[productivityTime] || '' : '';
    const goalText = goalTitle ? `"${goalTitle}"` : 'your goal';
    
    console.log(`[Notifications] Scheduling goal reminder at ${hour}:${minute} for ${productivityTime}`);
    
    await cancelAllNotifications();
    
    return await scheduleNotification({
      title: 'Time for Your Goal',
      body: `Time to work on ${goalText}. Your peak productivity is in the ${timeLabel}!`,
      data: { type: 'goal_reminder', productivityTime },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  };

  const scheduleProductivityReminder = async (
    productivityTime: 'morning' | 'afternoon' | 'evening' | 'unknown' | undefined
  ) => {
    const { hour, minute } = getNotificationTimeForProductivity(productivityTime);
    
    console.log(`[Notifications] Scheduling productivity reminder at ${hour}:${minute}`);
    
    return await scheduleNotification({
      title: 'Peak Energy Time',
      body: 'Now is the best time for important tasks. Start right now!',
      data: { type: 'productivity_reminder', productivityTime },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  };

  return {
    expoPushToken,
    permission,
    notification,
    requestPermissions,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    scheduleTaskReminder,
    schedulePomodoroBreak,
    scheduleWorkSession,
    scheduleDailyReminder,
    scheduleGoalReminder,
    scheduleProductivityReminder,
    getNotificationTimeForProductivity,
  };
}