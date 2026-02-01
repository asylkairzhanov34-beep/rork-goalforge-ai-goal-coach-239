import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { FocusSession, FocusShieldSettings, FocusStats, DistractionLog } from '@/types/focus-shield';

const STORAGE_KEY = '@focus_shield_data';
const SESSIONS_KEY = '@focus_shield_sessions';
const LOGS_KEY = '@focus_shield_logs';

const DEFAULT_SETTINGS: FocusShieldSettings = {
  isEnabled: false,
  reminderInterval: 15,
  activeHours: {
    start: 9,
    end: 22,
  },
  blockedApps: ['instagram', 'tiktok'],
  motivationalMessages: true,
  strictMode: false,
};

const DEFAULT_STATS: FocusStats = {
  totalFocusTime: 0,
  totalSessions: 0,
  distractionsFlagged: 0,
  longestStreak: 0,
  currentStreak: 0,
  todayFocusTime: 0,
  weeklyFocusTime: 0,
};

const MOTIVATIONAL_MESSAGES = [
  "Your goals are waiting! Stay focused 💪",
  "Every minute of focus brings you closer to success",
  "Is scrolling worth your dreams? Choose wisely",
  "You're stronger than the urge to scroll",
  "Future you will thank present you for staying focused",
  "Your time is precious - invest it in your goals",
  "Small distractions steal big dreams",
  "Champions stay focused when others get distracted",
  "Your success story is being written right now",
  "Break the habit, build the future",
  "Focus is a superpower. Use it wisely",
  "The grind doesn't stop for reels",
  "Your goals > infinite scroll",
  "Stay in the zone. You've got this!",
  "Distractions are detours from success",
];

const EXIT_WARNING_MESSAGES = [
  "🛡️ Focus Shield is active! Stay focused on your goals.",
  "⚠️ You're leaving - remember your commitment!",
  "💪 Don't break your focus streak!",
  "🎯 Your goals are waiting for you!",
  "🔥 Stay strong! Avoid distractions.",
  "⏰ Every minute counts. Come back!",
  "🚫 TikTok/Reels can wait. Your dreams can't!",
];

const STRICT_MODE_MESSAGES = [
  "🔒 Strict Mode is ON! You committed to stay focused.",
  "⛔ You can't leave while Strict Mode is active!",
  "🎯 Disable Strict Mode first if you must leave.",
  "💪 Stay strong! You enabled Strict Mode for a reason.",
  "🔐 Strict Mode protects your focus. Keep going!",
];

function useFocusShieldProvider() {
  const [settings, setSettings] = useState<FocusShieldSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<FocusStats>(DEFAULT_STATS);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [distractionLogs, setDistractionLogs] = useState<DistractionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const scheduledNotificationIdsRef = useRef<string[]>([]);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastExitNotificationRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    
    const loadData = async () => {
      try {
        console.log('[FocusShield] Loading data...');
        const [settingsData, sessionsData, logsData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SESSIONS_KEY),
          AsyncStorage.getItem(LOGS_KEY),
        ]);

        if (!isMountedRef.current) return;

        if (settingsData) {
          try {
            const parsed = JSON.parse(settingsData);
            setSettings(prev => ({ ...prev, ...parsed.settings }));
            setStats(prev => ({ ...prev, ...parsed.stats }));
          } catch (e) {
            console.error('[FocusShield] Error parsing settings:', e);
          }
        }

        if (sessionsData) {
          try {
            setSessions(JSON.parse(sessionsData));
          } catch (e) {
            console.error('[FocusShield] Error parsing sessions:', e);
          }
        }

        if (logsData) {
          try {
            setDistractionLogs(JSON.parse(logsData));
          } catch (e) {
            console.error('[FocusShield] Error parsing logs:', e);
          }
        }

        console.log('[FocusShield] Data loaded successfully');
      } catch (error) {
        console.error('[FocusShield] Error loading data:', error);
      } finally {
        if (isMountedRef.current) {
          isInitializedRef.current = true;
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitializedRef.current || isLoading) return;
    
    const saveData = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, stats })),
          AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)),
          AsyncStorage.setItem(LOGS_KEY, JSON.stringify(distractionLogs)),
        ]);
      } catch (error) {
        console.error('[FocusShield] Error saving data:', error);
      }
    };
    
    saveData();
  }, [settings, stats, sessions, distractionLogs, isLoading]);

  const isSessionActive = currentSession?.isActive ?? false;
  const reminderInterval = settings.reminderInterval;
  const isEnabled = settings.isEnabled;

  useEffect(() => {
    if (Platform.OS === 'web' || isLoading) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        isSessionActive &&
        prevState === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        const now = Date.now();
        if (now - lastExitNotificationRef.current < 5000) {
          return;
        }
        lastExitNotificationRef.current = now;

        console.log('[FocusShield] App going to background while session active');
        
        try {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') return;

          const randomMessage = EXIT_WARNING_MESSAGES[Math.floor(Math.random() * EXIT_WARNING_MESSAGES.length)];
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🛡️ Focus Shield Warning',
              body: randomMessage,
              data: { type: 'focus_shield_exit_warning' },
              sound: 'default',
            },
            trigger: null,
          });
          console.log('[FocusShield] Exit warning notification sent');
        } catch (error) {
          console.error('[FocusShield] Error sending exit notification:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isSessionActive, isLoading]);

  useEffect(() => {
    if (Platform.OS === 'web' || isLoading) return;

    const setupReminders = async () => {
      if (!isMountedRef.current) return;
      
      if (isEnabled && isSessionActive) {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            console.log('[FocusShield] Notification permission not granted');
            return;
          }

          for (const id of scheduledNotificationIdsRef.current) {
            try {
              await Notifications.cancelScheduledNotificationAsync(id);
            } catch {
              // Ignore errors when cancelling
            }
          }
          scheduledNotificationIdsRef.current = [];

          if (!isMountedRef.current) return;

          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Focus Shield Active',
              body: MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)],
              data: { type: 'focus_reminder' },
              sound: 'default',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: reminderInterval * 60,
              repeats: true,
            },
          });

          if (id && isMountedRef.current) {
            scheduledNotificationIdsRef.current = [id];
            console.log('[FocusShield] Reminders scheduled');
          }
        } catch (error) {
          console.error('[FocusShield] Error scheduling reminders:', error);
        }
      } else {
        for (const id of scheduledNotificationIdsRef.current) {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch {
            // Ignore errors when cancelling
          }
        }
        scheduledNotificationIdsRef.current = [];
      }
    };

    setupReminders();
  }, [isEnabled, reminderInterval, isSessionActive, isLoading]);

  const getRandomMessage = useCallback(() => {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
  }, []);

  const startSession = useCallback(() => {
    const now = new Date();
    const session: FocusSession = {
      id: `session_${Date.now()}`,
      startTime: now.toISOString(),
      duration: 0,
      distractionCount: 0,
      isActive: true,
    };

    setCurrentSession(session);
    setSettings(prev => ({ ...prev, isEnabled: true }));

    console.log('[FocusShield] Session started:', session.id);
  }, []);

  const endSession = useCallback(() => {
    if (!currentSession) return;

    const now = new Date();
    const startTime = new Date(currentSession.startTime);
    const duration = Math.round((now.getTime() - startTime.getTime()) / 60000);

    const completedSession: FocusSession = {
      ...currentSession,
      endTime: now.toISOString(),
      duration,
      isActive: false,
    };

    setSessions(prev => [completedSession, ...prev].slice(0, 100));

    setStats(prev => {
      const today = new Date().toDateString();
      const todaySessionTime = sessions
        .filter(s => new Date(s.startTime).toDateString() === today)
        .reduce((acc, s) => acc + s.duration, 0) + duration;

      return {
        ...prev,
        totalFocusTime: prev.totalFocusTime + duration,
        totalSessions: prev.totalSessions + 1,
        todayFocusTime: todaySessionTime,
      };
    });

    setCurrentSession(null);
    setSettings(prev => ({ ...prev, isEnabled: false }));

    console.log('[FocusShield] Session ended. Duration:', duration, 'minutes');
  }, [currentSession, sessions]);

  const logDistraction = useCallback((app: string, skipped: boolean) => {
    const log: DistractionLog = {
      id: `distraction_${Date.now()}`,
      timestamp: new Date().toISOString(),
      app,
      skipped,
    };

    setDistractionLogs(prev => [log, ...prev].slice(0, 500));

    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        distractionCount: prev.distractionCount + 1,
      } : null);
    }

    setStats(prev => ({
      ...prev,
      distractionsFlagged: prev.distractionsFlagged + 1,
    }));

    console.log('[FocusShield] Distraction logged:', app, skipped ? '(skipped)' : '(blocked)');
  }, [currentSession]);

  const updateSettings = useCallback((newSettings: Partial<FocusShieldSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleApp = useCallback((app: string) => {
    setSettings(prev => {
      const blockedApps = prev.blockedApps.includes(app)
        ? prev.blockedApps.filter(a => a !== app)
        : [...prev.blockedApps, app];
      return { ...prev, blockedApps };
    });
  }, []);

  const getTodayStats = useCallback(() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(
      s => new Date(s.startTime).toDateString() === today
    );
    const todayLogs = distractionLogs.filter(
      l => new Date(l.timestamp).toDateString() === today
    );

    const totalMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0) +
      (currentSession?.isActive ? Math.round((Date.now() - new Date(currentSession.startTime).getTime()) / 60000) : 0);

    return {
      focusTime: totalMinutes,
      sessionsCount: todaySessions.length + (currentSession?.isActive ? 1 : 0),
      distractionsBlocked: todayLogs.filter(l => !l.skipped).length,
      distractionsSkipped: todayLogs.filter(l => l.skipped).length,
    };
  }, [sessions, distractionLogs, currentSession]);

  const sendInstantReminder = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('[FocusShield] Web reminder:', getRandomMessage());
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🛡️ Stay Focused!',
          body: getRandomMessage(),
          data: { type: 'focus_reminder_instant' },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('[FocusShield] Error sending instant reminder:', error);
    }
  }, [getRandomMessage]);

  const toggleStrictMode = useCallback(() => {
    setSettings(prev => ({ ...prev, strictMode: !prev.strictMode }));
    console.log('[FocusShield] Strict mode toggled:', !settings.strictMode);
  }, [settings.strictMode]);

  const getStrictModeMessage = useCallback(() => {
    return STRICT_MODE_MESSAGES[Math.floor(Math.random() * STRICT_MODE_MESSAGES.length)];
  }, []);

  return {
    settings,
    stats,
    currentSession,
    sessions,
    distractionLogs,
    isLoading,
    startSession,
    endSession,
    logDistraction,
    updateSettings,
    toggleApp,
    getTodayStats,
    getRandomMessage,
    sendInstantReminder,
    isActive: currentSession?.isActive ?? false,
    isStrictMode: settings.strictMode,
    toggleStrictMode,
    getStrictModeMessage,
  };
}

export const [FocusShieldProvider, useFocusShield] = createContextHook(useFocusShieldProvider);
