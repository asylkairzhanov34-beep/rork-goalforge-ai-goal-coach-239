import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Platform, AppState, AppStateStatus, NativeModules } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useNotifications } from './use-notifications';
import { SoundId, DEFAULT_SOUND_ID } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';

const LiveActivityModule = NativeModules.LiveActivityModule;

const isLiveActivitySupported = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  const majorVersion = parseInt(Platform.Version as string, 10);
  const supported = majorVersion >= 16 && !!LiveActivityModule;
  console.log('[TimerStore] Live Activity supported:', supported, 'iOS version:', majorVersion, 'Module:', !!LiveActivityModule);
  return supported;
};

const BACKGROUND_TIMER_KEY = 'background_timer_state';
const BACKGROUND_START_TIME_KEY = 'background_start_time';


let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  console.log('[TimerStore] expo-notifications not available');
}

const TIMER_NOTIFICATION_CATEGORY = 'timer_controls';
const TIMER_ACTION_PAUSE = 'pause_timer';
const TIMER_ACTION_RESUME = 'resume_timer';
const TIMER_ACTION_STOP = 'stop_timer';


export interface TimerSession {
  id: string;
  goalId?: string;
  duration: number;
  completedAt: Date;
  type: 'focus' | 'break';
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  totalTime: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  sessionsCompleted: number;
  currentGoalId?: string;
  sessions: TimerSession[];
  notificationId?: string;
  notificationSound: SoundId;
}

interface BackgroundTimerState {
  isActive: boolean;
  remainingTime: number;
  totalTime: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  goalId?: string;
  startedAt: number;
  notificationSound: SoundId;
}

const TIMER_DURATIONS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const [TimerProvider, useTimer] = createContextHook(() => {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    currentTime: TIMER_DURATIONS.focus,
    totalTime: TIMER_DURATIONS.focus,
    mode: 'focus',
    sessionsCompleted: 0,
    sessions: [],
    notificationId: undefined,
    notificationSound: DEFAULT_SOUND_ID,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundNotificationId = useRef<string | null>(null);
  const liveNotificationRef = useRef<string | null>(null);
  const liveNotificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationResponseSubscription = useRef<any>(null);
  const countdownNotificationIds = useRef<string[]>([]);
  const liveActivityIdRef = useRef<string | null>(null);
  const { cancelNotification } = useNotifications();

  const startLiveActivity = useCallback(async (
    mode: 'focus' | 'shortBreak' | 'longBreak',
    durationSeconds: number
  ) => {
    if (!isLiveActivitySupported()) {
      console.log('[TimerStore] Live Activities not supported');
      return null;
    }

    try {
      // End any existing activity first
      if (liveActivityIdRef.current) {
        try {
          await LiveActivityModule.endActivity({
            activityId: liveActivityIdRef.current,
            completed: false,
          });
        } catch (e) {
          console.log('[TimerStore] Failed to end previous activity:', e);
        }
        liveActivityIdRef.current = null;
      }

      const modeLabels = {
        focus: 'Focus Session',
        shortBreak: 'Short Break',
        longBreak: 'Long Break',
      };

      const endTime = Math.floor((Date.now() + durationSeconds * 1000) / 1000);
      const progress = 0;

      console.log('[TimerStore] Starting Live Activity:', {
        timerName: modeLabels[mode],
        mode,
        totalDuration: durationSeconds,
        remainingTime: durationSeconds,
        endTime,
        progress,
      });

      const result = await LiveActivityModule.startActivity({
        timerName: modeLabels[mode],
        mode,
        totalDuration: durationSeconds,
        remainingTime: durationSeconds,
        endTime,
        isPaused: false,
        progress,
      });

      if (result?.activityId) {
        liveActivityIdRef.current = result.activityId;
        console.log('[TimerStore] Live Activity started successfully:', result.activityId);
        return result.activityId;
      } else {
        console.log('[TimerStore] Live Activity started but no activityId returned');
      }
    } catch (error) {
      console.log('[TimerStore] Live Activity start error:', error);
    }
    return null;
  }, []);

  const updateLiveActivity = useCallback(async (
    remainingTime: number,
    totalTime: number,
    isPaused: boolean = false
  ) => {
    if (!isLiveActivitySupported() || !liveActivityIdRef.current) {
      console.log('[TimerStore] Skipping Live Activity update - not supported or no activity');
      return;
    }

    try {
      const progress = Math.min(1, Math.max(0, 1 - (remainingTime / totalTime)));
      const endTime = isPaused ? Math.floor(Date.now() / 1000) : Math.floor((Date.now() + remainingTime * 1000) / 1000);

      console.log('[TimerStore] Updating Live Activity:', {
        activityId: liveActivityIdRef.current,
        remainingTime,
        isPaused,
        progress: progress.toFixed(2),
        endTime,
      });

      await LiveActivityModule.updateActivity({
        activityId: liveActivityIdRef.current,
        remainingTime,
        isPaused,
        progress,
        endTime,
      });
    } catch (error) {
      console.log('[TimerStore] Live Activity update error:', error);
    }
  }, []);

  const endLiveActivity = useCallback(async (completed: boolean = true) => {
    if (!isLiveActivitySupported() || !liveActivityIdRef.current) return;

    try {
      await LiveActivityModule.endActivity({
        activityId: liveActivityIdRef.current,
        completed,
      });
      liveActivityIdRef.current = null;
      console.log('[TimerStore] Live Activity ended');
    } catch (error) {
      console.log('[TimerStore] Live Activity end error:', error);
    }
  }, []);

  const setupNotificationCategories = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('timer-live', {
          name: 'Timer Progress',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: null,
          sound: null,
          enableLights: false,
          enableVibrate: false,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      await Notifications.setNotificationCategoryAsync(TIMER_NOTIFICATION_CATEGORY, [
        {
          identifier: TIMER_ACTION_PAUSE,
          buttonTitle: '⏸️ Pause',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: TIMER_ACTION_RESUME,
          buttonTitle: '▶️ Resume',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: TIMER_ACTION_STOP,
          buttonTitle: '⏹️ Stop',
          options: {
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
      ]);
      console.log('[TimerStore] Notification categories set up');
    } catch (error) {
      console.error('[TimerStore] Failed to setup notification categories:', error);
    }
  }, []);

  const saveBackgroundState = useCallback(async (timerState: TimerState) => {
    if (Platform.OS === 'web') return;
    
    try {
      const bgState: BackgroundTimerState = {
        isActive: timerState.isRunning && !timerState.isPaused,
        remainingTime: timerState.currentTime,
        totalTime: timerState.totalTime,
        mode: timerState.mode,
        goalId: timerState.currentGoalId,
        startedAt: Date.now(),
        notificationSound: timerState.notificationSound,
      };
      
      await AsyncStorage.setItem(BACKGROUND_TIMER_KEY, JSON.stringify(bgState));
      await AsyncStorage.setItem(BACKGROUND_START_TIME_KEY, Date.now().toString());
      console.log('[TimerStore] Saved background state:', bgState.remainingTime, 'seconds remaining');
    } catch (error) {
      console.error('[TimerStore] Failed to save background state:', error);
    }
  }, []);

  const getBackgroundState = useCallback(async (): Promise<BackgroundTimerState | null> => {
    if (Platform.OS === 'web') return null;
    
    try {
      const stateJson = await AsyncStorage.getItem(BACKGROUND_TIMER_KEY);
      const startTimeStr = await AsyncStorage.getItem(BACKGROUND_START_TIME_KEY);
      
      if (!stateJson || !startTimeStr) {
        return null;
      }

      const bgState: BackgroundTimerState = JSON.parse(stateJson);
      const startTime = parseInt(startTimeStr, 10);
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      const newRemainingTime = Math.max(0, bgState.remainingTime - elapsedSeconds);
      
      console.log('[TimerStore] Background elapsed:', elapsedSeconds, 'remaining:', newRemainingTime);
      
      return {
        ...bgState,
        remainingTime: newRemainingTime,
      };
    } catch (error) {
      console.error('[TimerStore] Failed to get background state:', error);
      return null;
    }
  }, []);

  const clearBackgroundState = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      await AsyncStorage.removeItem(BACKGROUND_TIMER_KEY);
      await AsyncStorage.removeItem(BACKGROUND_START_TIME_KEY);
      console.log('[TimerStore] Cleared background state');
    } catch (error) {
      console.error('[TimerStore] Failed to clear background state:', error);
    }
  }, []);

  const scheduleBackgroundNotification = useCallback(async (
    title: string,
    body: string,
    seconds: number
  ): Promise<string | null> => {
    if (!Notifications || Platform.OS === 'web') {
      console.log('[TimerStore] Notifications not available');
      return null;
    }

    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;

    if (safeSeconds < 5) {
      console.log('[TimerStore] Timer too short/invalid, skipping notification:', seconds);
      return null;
    }

    try {
      if (backgroundNotificationId.current) {
        try {
          await Notifications.cancelScheduledNotificationAsync(backgroundNotificationId.current);
          console.log('[TimerStore] Cancelled previous timer notification:', backgroundNotificationId.current);
        } catch (error) {
          console.log('[TimerStore] Failed to cancel previous timer notification:', error);
        }
      }

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('timer', {
            name: 'Timer',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            enableLights: true,
            enableVibrate: true,
          });
        } catch {
          console.log('[TimerStore] Channel already exists');
        }
      }

      const fireDate = new Date(Date.now() + safeSeconds * 1000);
      console.log('[TimerStore] Scheduling timer notification at:', fireDate.toISOString());

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          ...(Platform.OS === 'android' && {
            channelId: 'timer',
          }),
        },
        trigger: fireDate,
      });

      backgroundNotificationId.current = notificationId;
      console.log('[TimerStore] Scheduled timer notification:', notificationId, 'in', safeSeconds, 'sec');
      return notificationId;
    } catch (error) {
      console.error('[TimerStore] Failed to schedule timer notification:', error);
      return null;
    }
  }, []);

  const cancelBackgroundNotification = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return;

    try {
      if (backgroundNotificationId.current) {
        await Notifications.cancelScheduledNotificationAsync(backgroundNotificationId.current);
        console.log('[TimerStore] Cancelled timer notification:', backgroundNotificationId.current);
      } else {
        console.log('[TimerStore] No timer notification to cancel');
      }
      backgroundNotificationId.current = null;
    } catch (error) {
      console.error('[TimerStore] Failed to cancel timer notification:', error);
    }
  }, []);

  const formatTimeForNotification = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const generateProgressBar = useCallback((progress: number, length: number = 12): string => {
    const filled = Math.round(progress * length);
    const empty = length - filled;
    return '●'.repeat(filled) + '○'.repeat(empty);
  }, []);

  const cancelAllCountdownNotifications = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return;

    try {
      for (const id of countdownNotificationIds.current) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          // Ignore errors for already fired notifications
        }
      }
      countdownNotificationIds.current = [];
      console.log('[TimerStore] Cancelled all countdown notifications');
    } catch (error) {
      console.error('[TimerStore] Failed to cancel countdown notifications:', error);
    }
  }, []);

  const scheduleCountdownNotifications = useCallback(async (
    totalSeconds: number,
    mode: 'focus' | 'shortBreak' | 'longBreak',
    totalTime: number
  ) => {
    if (!Notifications || Platform.OS === 'web') return;

    try {
      await cancelAllCountdownNotifications();

      const modeConfig = {
        focus: { emoji: '🎯', label: 'Focus Session', color: 'Deep Work' },
        shortBreak: { emoji: '☕', label: 'Short Break', color: 'Recharge' },
        longBreak: { emoji: '🌴', label: 'Long Break', color: 'Relax' },
      };

      const config = modeConfig[mode];
      const totalMinutes = Math.ceil(totalSeconds / 60);
      const newIds: string[] = [];

      // Schedule notifications for each minute
      for (let minutesLeft = totalMinutes; minutesLeft >= 1; minutesLeft--) {
        const secondsUntilNotification = totalSeconds - ((totalMinutes - minutesLeft) * 60);
        
        if (secondsUntilNotification <= 0) continue;

        const progress = 1 - (minutesLeft * 60 / totalTime);
        const progressBar = generateProgressBar(progress);
        
        let body: string;
        if (minutesLeft > 1) {
          body = `${progressBar}\n${minutesLeft} min remaining • Stay focused!`;
        } else {
          body = `${progressBar}\nFinal minute • Almost there! 💪`;
        }

        try {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${config.emoji} ${config.label} • ${minutesLeft}:00`,
              body,
              sound: false,
              ...(Platform.OS === 'android' && {
                channelId: 'timer-live',
                ongoing: true,
                sticky: true,
              }),
              ...(Platform.OS === 'ios' && {
                interruptionLevel: 'passive',
              }),
            },
            trigger: {
              seconds: Math.max(1, secondsUntilNotification - (minutesLeft * 60) + (totalMinutes * 60)),
              type: Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL || 'timeInterval',
            },
          });
          newIds.push(notificationId);
        } catch {
          console.log('[TimerStore] Failed to schedule notification for minute', minutesLeft);
        }
      }

      countdownNotificationIds.current = newIds;
      console.log('[TimerStore] Scheduled', newIds.length, 'countdown notifications');
    } catch (error) {
      console.error('[TimerStore] Failed to schedule countdown notifications:', error);
    }
  }, [cancelAllCountdownNotifications, generateProgressBar]);

  const showLiveTimerNotification = useCallback(async (
    remainingTime: number,
    mode: 'focus' | 'shortBreak' | 'longBreak',
    isPaused: boolean = false,
    totalTime?: number
  ) => {
    if (!Notifications || Platform.OS === 'web') return;

    try {
      if (liveNotificationRef.current) {
        await Notifications.dismissNotificationAsync(liveNotificationRef.current).catch(() => {});
      }

      const modeConfig = {
        focus: { emoji: '🎯', label: 'Focus', color: '#FFD12A', motivate: 'Stay focused!' },
        shortBreak: { emoji: '☕', label: 'Break', color: '#10B981', motivate: 'Recharge' },
        longBreak: { emoji: '🌴', label: 'Long Break', color: '#3B82F6', motivate: 'Relax' },
      };

      const config = modeConfig[mode];
      const timeStr = formatTimeForNotification(remainingTime);
      const total = totalTime || remainingTime;
      const progress = 1 - (remainingTime / total);
      const progressBar = generateProgressBar(progress, 12);
      const percentComplete = Math.round(progress * 100);

      let titleText: string;
      let bodyText: string;
      
      if (isPaused) {
        titleText = `⏸️ ${config.label} Paused • ${timeStr}`;
        bodyText = `${progressBar} ${percentComplete}%\nTap to resume your session`;
      } else {
        titleText = `${config.emoji} ${timeStr} • ${config.label}`;
        bodyText = `${progressBar} ${percentComplete}%\n${config.motivate}`;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: titleText,
          body: bodyText,
          sound: false,
          sticky: true,
          autoDismiss: false,
          categoryIdentifier: TIMER_NOTIFICATION_CATEGORY,
          data: {
            type: 'timer_live',
            isPaused,
            remainingTime,
            mode,
          },
          ...(Platform.OS === 'android' && {
            channelId: 'timer-live',
            ongoing: true,
            priority: 'max',
            color: config.color,
            actions: isPaused
              ? [
                  { title: '▶️ Resume', pressAction: { id: TIMER_ACTION_RESUME } },
                  { title: '⏹️ Stop', pressAction: { id: TIMER_ACTION_STOP } },
                ]
              : [
                  { title: '⏸️ Pause', pressAction: { id: TIMER_ACTION_PAUSE } },
                  { title: '⏹️ Stop', pressAction: { id: TIMER_ACTION_STOP } },
                ],
          }),
          ...(Platform.OS === 'ios' && {
            interruptionLevel: 'timeSensitive',
          }),
        },
        trigger: null,
      });

      liveNotificationRef.current = notificationId;
      return notificationId;
    } catch (error) {
      console.error('[TimerStore] Failed to show live notification:', error);
      return null;
    }
  }, [formatTimeForNotification, generateProgressBar]);

  const cancelLiveTimerNotification = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return;

    if (liveNotificationIntervalRef.current) {
      clearInterval(liveNotificationIntervalRef.current);
      liveNotificationIntervalRef.current = null;
    }

    try {
      if (liveNotificationRef.current) {
        await Notifications.dismissNotificationAsync(liveNotificationRef.current).catch(() => {});
        console.log('[TimerStore] Cancelled live timer notification');
      }
      liveNotificationRef.current = null;
      
      await cancelAllCountdownNotifications();
    } catch (error) {
      console.error('[TimerStore] Failed to cancel live notification:', error);
    }
  }, [cancelAllCountdownNotifications]);

  const startLiveNotificationUpdates = useCallback((mode: 'focus' | 'shortBreak' | 'longBreak', totalTime: number) => {
    // Disabled: no longer sending frequent notification updates
    // Only completion notification will be shown
  }, []);

  const playSound = useCallback(async (soundId: SoundId) => {
    console.log('[TimerStore] Playing sound:', soundId);
    
    try {
      await SoundManager.playTimerSound(soundId);
      console.log('[TimerStore] Sound played');
    } catch {
      console.log('[TimerStore] Sound error');
    }
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        console.log('[TimerStore] Haptics not available');
      }
    }
  }, []);

  const handleTimerComplete = useCallback(async () => {
    console.log('[TimerStore] Timer completed!');
    
    if (state.notificationId) {
      await cancelNotification(state.notificationId);
    }
    
    await playSound(state.notificationSound);
    
    const completedMode = state.mode;
    const completedDuration = state.totalTime;
    
    setState(prev => {
      const session: TimerSession = {
        id: Date.now().toString(),
        goalId: prev.currentGoalId,
        duration: completedDuration,
        completedAt: new Date(),
        type: completedMode === 'focus' ? 'focus' : 'break',
      };

      const sessionsCompleted = completedMode === 'focus' 
        ? prev.sessionsCompleted + 1 
        : prev.sessionsCompleted;
      
      let nextMode: 'focus' | 'shortBreak' | 'longBreak' = 'focus';
      if (completedMode === 'focus') {
        nextMode = sessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
      }

      const nextDuration = TIMER_DURATIONS[nextMode];

      console.log('[TimerStore] Session completed:', {
        mode: completedMode,
        duration: completedDuration,
        sessionsCompleted,
        nextMode,
      });

      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        currentTime: nextDuration,
        totalTime: nextDuration,
        mode: nextMode,
        sessionsCompleted,
        sessions: [...prev.sessions, session],
        notificationId: undefined,
      };
    });
    
    await endLiveActivity(true);
    await clearBackgroundState();
    await cancelLiveTimerNotification();
  }, [state.notificationId, state.notificationSound, state.mode, state.totalTime, cancelNotification, playSound, endLiveActivity, clearBackgroundState, cancelLiveTimerNotification]);

  useEffect(() => {
    const initializeStore = async () => {
      await SoundManager.configure();
      console.log('[TimerStore] SoundManager initialized');

      await setupNotificationCategories();

      const stored = await safeStorageGet<TimerSession[]>('timerSessions', []);
      const sessions = stored.map((session: any) => ({
        ...session,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined
      }));
      
      const storedSound = await safeStorageGet<SoundId>('notificationSound', DEFAULT_SOUND_ID);
      console.log('[TimerStore] Loaded sound:', storedSound);
      
      setState(prev => ({ 
        ...prev, 
        sessions,
        notificationSound: storedSound 
      }));

      if (Platform.OS !== 'web') {
        const bgState = await getBackgroundState();
        if (bgState && bgState.isActive) {
          console.log('[TimerStore] Restoring from background:', bgState);
          
          if (bgState.remainingTime > 0) {
            setState(prev => ({
              ...prev,
              isRunning: true,
              isPaused: false,
              currentTime: bgState.remainingTime,
              totalTime: bgState.totalTime,
              mode: bgState.mode,
              currentGoalId: bgState.goalId,
              notificationSound: bgState.notificationSound || prev.notificationSound,
            }));
          } else {
            console.log('[TimerStore] Timer completed in background');
          }
          
          await clearBackgroundState();
        }
      }
    };
    
    initializeStore();
  }, [getBackgroundState, clearBackgroundState, setupNotificationCategories]);

  const backgroundDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInBackground = useRef<boolean>(false);
  const backgroundEntryTime = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const previousAppState = appState.current;
      console.log('[TimerStore] AppState:', previousAppState, '->', nextAppState);
      
      if (nextAppState === 'background' && !isInBackground.current) {
        if (backgroundDelayTimer.current) {
          clearTimeout(backgroundDelayTimer.current);
          backgroundDelayTimer.current = null;
        }
        
        isInBackground.current = true;
        backgroundEntryTime.current = Date.now();
        console.log('[TimerStore] Going to background');
        console.log('[TimerStore] Timer state - running:', state.isRunning, 'paused:', state.isPaused, 'time:', state.currentTime);
        
        if (state.isRunning && !state.isPaused && state.currentTime > 0) {
          console.log('[TimerStore] Timer is active, saving state');
          await saveBackgroundState(state);
          
          // Schedule completion notification
          if (state.currentTime > 5) {
            const modeConfig = {
              focus: { emoji: '🎯', title: 'Focus Complete!', body: 'Amazing work! Time for a well-deserved break. 🌟' },
              shortBreak: { emoji: '☕', title: 'Break Over!', body: 'Feeling refreshed? Time to get back to work! 💪' },
              longBreak: { emoji: '🌴', title: 'Long Break Done!', body: 'Ready to conquer the next session? Let\'s go! 🚀' },
            };
            const config = modeConfig[state.mode];
            
            const notifId = await scheduleBackgroundNotification(
              `${config.emoji} ${config.title}`,
              config.body,
              state.currentTime
            );
            
            if (notifId) {
              backgroundNotificationId.current = notifId;
            }
          } else {
            console.log('[TimerStore] Timer too short, skipping notification');
          }
        } else {
          console.log('[TimerStore] Timer not active, no notification scheduled');
        }
      } else if (nextAppState === 'inactive' && previousAppState === 'active') {
        console.log('[TimerStore] App became inactive (ignoring - waiting for background)');
      } else if (nextAppState === 'active' && isInBackground.current) {
        const timeInBackground = Date.now() - backgroundEntryTime.current;
        isInBackground.current = false;
        console.log('[TimerStore] Returning to foreground from background after', timeInBackground, 'ms');
        
        // Always cancel background notifications when returning
        await cancelBackgroundNotification();
        await cancelAllCountdownNotifications();
        
        const bgState = await getBackgroundState();
        console.log('[TimerStore] Background state:', bgState ? 'exists' : 'none');
        
        if (bgState && bgState.isActive) {
          console.log('[TimerStore] Restoring timer from background:', bgState.remainingTime, 'sec remaining');
          
          if (bgState.remainingTime <= 0) {
            console.log('[TimerStore] Timer completed in background');
            handleTimerComplete();
          } else {
            console.log('[TimerStore] Updating timer with background time');
            setState(prev => ({
              ...prev,
              currentTime: bgState.remainingTime,
              isRunning: true,
              isPaused: false,
            }));
          }
          
          await clearBackgroundState();
        } else {
          console.log('[TimerStore] No active background timer to restore');
        }
      } else if (nextAppState === 'active' && previousAppState === 'inactive') {
        console.log('[TimerStore] Returning from inactive state (no restoration needed)');
        if (backgroundDelayTimer.current) {
          clearTimeout(backgroundDelayTimer.current);
          backgroundDelayTimer.current = null;
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [state.isRunning, state.isPaused, state.currentTime, state.totalTime, state.mode, saveBackgroundState, getBackgroundState, clearBackgroundState, scheduleBackgroundNotification, cancelBackgroundNotification, handleTimerComplete, showLiveTimerNotification, scheduleCountdownNotifications, cancelAllCountdownNotifications]);

  useEffect(() => {
    if (state.sessions.length > 0) {
      safeStorageSet('timerSessions', state.sessions);
    }
  }, [state.sessions]);



  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      const interval = setInterval(() => {
        setState(prev => {
          if (prev.currentTime <= 0) {
            return { ...prev, currentTime: 0 };
          }
          return { ...prev, currentTime: prev.currentTime - 1 };
        });
      }, 1000);
      intervalRef.current = interval;
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.isPaused]);

  useEffect(() => {
    if (state.currentTime === 0 && state.isRunning) {
      handleTimerComplete();
    }
  }, [state.currentTime, state.isRunning, handleTimerComplete]);

  const startTimer = useCallback(async (goalId?: string) => {
    console.log('[TimerStore] Starting timer...');
    
    setState(prev => {
      startLiveActivity(prev.mode, prev.currentTime);
      
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        currentGoalId: goalId,
        notificationId: undefined,
      };
    });
  }, [startLiveActivity]);

  const pauseTimer = useCallback(async () => {
    console.log('[TimerStore] Pausing timer');
    
    await cancelBackgroundNotification();
    await clearBackgroundState();
    await cancelAllCountdownNotifications();
    
    if (liveNotificationIntervalRef.current) {
      clearInterval(liveNotificationIntervalRef.current);
      liveNotificationIntervalRef.current = null;
    }
    
    setState(prev => {
      updateLiveActivity(prev.currentTime, prev.totalTime, true);
      return {
        ...prev,
        isPaused: true,
      };
    });
  }, [updateLiveActivity, cancelBackgroundNotification, clearBackgroundState, cancelAllCountdownNotifications]);

  const resumeTimer = useCallback(() => {
    console.log('[TimerStore] Resuming timer');
    
    setState(prev => {
      updateLiveActivity(prev.currentTime, prev.totalTime, false);
      
      return {
        ...prev,
        isPaused: false,
      };
    });
  }, [updateLiveActivity]);

  const stopTimer = useCallback(async () => {
    console.log('[TimerStore] Stopping timer');
    
    if (state.notificationId) {
      await cancelNotification(state.notificationId);
    }
    
    await endLiveActivity(false);
    await cancelBackgroundNotification();
    await clearBackgroundState();
    await cancelLiveTimerNotification();
    
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentTime: prev.totalTime,
      notificationId: undefined,
    }));
  }, [state.notificationId, cancelNotification, endLiveActivity, cancelBackgroundNotification, clearBackgroundState, cancelLiveTimerNotification]);

  const skipTimer = useCallback(() => {
    handleTimerComplete();
  }, [handleTimerComplete]);

  const setMode = useCallback((mode: 'focus' | 'shortBreak' | 'longBreak') => {
    console.log('[TimerStore] Manual mode change to:', mode);
    
    setState(prev => {
      let duration: number;
      
      if (mode === 'focus') {
        duration = prev.totalTime === prev.currentTime && prev.mode === 'focus' ? prev.totalTime : TIMER_DURATIONS.focus;
      } else if (mode === 'shortBreak') {
        const focusTime = prev.mode === 'focus' ? prev.totalTime : TIMER_DURATIONS.focus;
        duration = Math.round(focusTime / 5);
      } else {
        const focusTime = prev.mode === 'focus' ? prev.totalTime : TIMER_DURATIONS.focus;
        duration = Math.round(focusTime / 3);
      }
      
      return {
        ...prev,
        mode,
        currentTime: duration,
        totalTime: duration,
        isRunning: false,
        isPaused: false,
      };
    });
  }, []);

  const setNotificationSound = useCallback((sound: SoundId) => {
    console.log('[TimerStore] Setting sound:', sound);
    setState(prev => ({
      ...prev,
      notificationSound: sound,
    }));
    safeStorageSet('notificationSound', sound);
  }, []);

  const setCustomDuration = useCallback((seconds: number) => {
    console.log('[TimerStore] Setting duration:', seconds);
    setState(prev => ({
      ...prev,
      currentTime: seconds,
      totalTime: seconds,
    }));
  }, []);

  const getTodaySessions = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return state.sessions.filter(session => {
      const sessionDate = new Date(session.completedAt);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  }, [state.sessions]);

  const getSessionsByGoal = useCallback((goalId: string) => {
    return state.sessions.filter(session => session.goalId === goalId);
  }, [state.sessions]);

  useEffect(() => {
    if (!Notifications || Platform.OS === 'web') return;

    const handleNotificationAction = (actionIdentifier: string) => {
      console.log('[TimerStore] Notification action received:', actionIdentifier);
      
      switch (actionIdentifier) {
        case TIMER_ACTION_PAUSE:
          pauseTimer();
          break;
        case TIMER_ACTION_RESUME:
          resumeTimer();
          break;
        case TIMER_ACTION_STOP:
          stopTimer();
          break;
        default:
          console.log('[TimerStore] Unknown action:', actionIdentifier);
      }
    };

    notificationResponseSubscription.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const actionIdentifier = response?.actionIdentifier;
        const notificationData = response?.notification?.request?.content?.data;
        
        console.log('[TimerStore] Notification response:', actionIdentifier, notificationData);
        
        if (notificationData?.type === 'timer_live' && actionIdentifier) {
          if (actionIdentifier !== 'expo.modules.notifications.actions.DEFAULT') {
            handleNotificationAction(actionIdentifier);
          }
        }
      }
    );

    return () => {
      if (notificationResponseSubscription.current) {
        notificationResponseSubscription.current.remove();
      }
    };
  }, [pauseTimer, resumeTimer, stopTimer]);

  return useMemo(() => ({
    ...state,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    skipTimer,
    setMode,
    setNotificationSound,
    setCustomDuration,
    getTodaySessions,
    getSessionsByGoal,
  }), [state, startTimer, pauseTimer, resumeTimer, stopTimer, skipTimer, setMode, setNotificationSound, setCustomDuration, getTodaySessions, getSessionsByGoal]);
});
