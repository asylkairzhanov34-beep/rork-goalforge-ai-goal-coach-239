import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIVE_ACTIVITY_STATE_KEY = 'live_activity_state_v2';

export interface LiveActivityState {
  activityId: string | null;
  isActive: boolean;
  remainingTime: number;
  totalTime: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  isPaused: boolean;
  startedAt: number;
  endTime: number;
}

export interface LiveActivityAttributes {
  timerName: string;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  totalDuration: number;
  appIcon: string;
}

export interface LiveActivityContentState {
  remainingTime: number;
  isPaused: boolean;
  progress: number;
  endTime: number;
}

const LiveActivityModule = NativeModules.LiveActivityModule;

const MODE_LABELS = {
  focus: 'Focus Session',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
} as const;

export const isLiveActivitySupported = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  const majorVersion = parseInt(Platform.Version as string, 10);
  const hasModule = !!LiveActivityModule;
  console.log('[LiveActivity] Support check - iOS:', majorVersion, 'Module:', hasModule);
  return majorVersion >= 16 && hasModule;
};

export const checkLiveActivityPermission = async (): Promise<boolean> => {
  if (!isLiveActivitySupported()) return false;
  
  try {
    const result = await LiveActivityModule.isSupported();
    console.log('[LiveActivity] Permission check:', result);
    return result?.supported ?? false;
  } catch (error) {
    console.log('[LiveActivity] Permission check error:', error);
    return false;
  }
};

export function useLiveActivity() {
  const [state, setState] = useState<LiveActivityState>({
    activityId: null,
    isActive: false,
    remainingTime: 0,
    totalTime: 0,
    mode: 'focus',
    isPaused: false,
    startedAt: 0,
    endTime: 0,
  });

  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(false);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const isSupported = isLiveActivitySupported();
  const isNativeModuleAvailable = !!LiveActivityModule;

  useEffect(() => {
    const initialize = async () => {
      // Check permission
      if (isNativeModuleAvailable) {
        const hasPermission = await checkLiveActivityPermission();
        setIsPermissionGranted(hasPermission);
        console.log('[LiveActivity] Permission granted:', hasPermission);
      }

      // Load persisted state
      try {
        const stored = await AsyncStorage.getItem(LIVE_ACTIVITY_STATE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as LiveActivityState;
          if (parsed.isActive && parsed.startedAt > 0 && !parsed.isPaused) {
            const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
            const newRemaining = Math.max(0, parsed.remainingTime - elapsed);
            
            if (newRemaining > 0) {
              setState({
                ...parsed,
                remainingTime: newRemaining,
                isActive: true,
              });
              console.log('[LiveActivity] Restored state:', newRemaining, 'sec remaining');
            } else {
              // Timer completed while app was closed
              await AsyncStorage.removeItem(LIVE_ACTIVITY_STATE_KEY);
            }
          }
        }
      } catch (error) {
        console.log('[LiveActivity] Failed to load state:', error);
      }
    };

    initialize();

    // Setup event listener for native actions
    if (isNativeModuleAvailable) {
      try {
        eventEmitterRef.current = new NativeEventEmitter(LiveActivityModule);
        
        const actionSubscription = eventEmitterRef.current.addListener(
          'LiveActivityAction',
          (event: { action: string; activityId: string }) => {
            console.log('[LiveActivity] Received action:', event);
          }
        );

        const stateSubscription = eventEmitterRef.current.addListener(
          'LiveActivityStateChange',
          (event: { state: string; activityId: string }) => {
            console.log('[LiveActivity] State changed:', event);
            if (event.state === 'dismissed' || event.state === 'ended') {
              setState(prev => ({ ...prev, isActive: false, activityId: null }));
            }
          }
        );

        return () => {
          actionSubscription?.remove();
          stateSubscription?.remove();
        };
      } catch (error) {
        console.log('[LiveActivity] Event emitter setup error:', error);
      }
    }
  }, [isNativeModuleAvailable]);

  const saveState = useCallback(async (newState: LiveActivityState) => {
    try {
      await AsyncStorage.setItem(LIVE_ACTIVITY_STATE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.log('[LiveActivity] Failed to save state:', error);
    }
  }, []);

  const clearState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(LIVE_ACTIVITY_STATE_KEY);
    } catch (error) {
      console.log('[LiveActivity] Failed to clear state:', error);
    }
  }, []);

  const startActivity = useCallback(async (
    timerName: string,
    mode: 'focus' | 'shortBreak' | 'longBreak',
    durationSeconds: number
  ): Promise<string | null> => {
    console.log('[LiveActivity] Starting activity:', { timerName, mode, durationSeconds });

    if (!isSupported) {
      console.log('[LiveActivity] Not supported on this device/OS');
      return null;
    }

    const now = Date.now();
    const endTimeMs = now + durationSeconds * 1000;
    const endTimeUnix = Math.floor(endTimeMs / 1000);
    const localActivityId = `timer_${now}`;

    const newState: LiveActivityState = {
      activityId: localActivityId,
      isActive: true,
      remainingTime: durationSeconds,
      totalTime: durationSeconds,
      mode,
      isPaused: false,
      startedAt: now,
      endTime: endTimeMs,
    };

    setState(newState);
    await saveState(newState);

    if (isNativeModuleAvailable) {
      try {
        // End any existing activities first
        try {
          await LiveActivityModule.endAllActivities();
        } catch (e) {
          console.log('[LiveActivity] No existing activities to end');
        }

        const result = await LiveActivityModule.startActivity({
          timerName: MODE_LABELS[mode],
          mode,
          totalDuration: durationSeconds,
          remainingTime: durationSeconds,
          endTime: endTimeUnix,
          isPaused: false,
          progress: 0,
        });

        console.log('[LiveActivity] Native activity started:', result);
        
        if (result?.activityId) {
          const updatedState = { ...newState, activityId: result.activityId };
          setState(updatedState);
          await saveState(updatedState);
          return result.activityId;
        }
      } catch (error) {
        console.log('[LiveActivity] Native module error:', error);
      }
    }

    return localActivityId;
  }, [isSupported, isNativeModuleAvailable, saveState]);

  const updateActivity = useCallback(async (
    remainingTime: number,
    isPaused: boolean = false,
    totalTime?: number
  ) => {
    const total = totalTime || state.totalTime;
    if (total <= 0) return;

    // Throttle updates to max once per second
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000) {
      return;
    }
    lastUpdateRef.current = now;

    const progress = Math.min(1, Math.max(0, 1 - (remainingTime / total)));
    const endTimeMs = isPaused ? now : now + remainingTime * 1000;
    const endTimeUnix = Math.floor(endTimeMs / 1000);

    const newState: LiveActivityState = {
      ...state,
      remainingTime,
      totalTime: total,
      isPaused,
      startedAt: isPaused ? 0 : now,
      endTime: endTimeMs,
    };

    setState(newState);
    await saveState(newState);

    if (isNativeModuleAvailable && state.activityId) {
      try {
        await LiveActivityModule.updateActivity({
          activityId: state.activityId,
          remainingTime,
          isPaused,
          progress,
          endTime: endTimeUnix,
        });
        console.log('[LiveActivity] Updated:', remainingTime, 'sec, paused:', isPaused, 'progress:', (progress * 100).toFixed(0) + '%');
      } catch (error) {
        console.log('[LiveActivity] Update error:', error);
      }
    }
  }, [state, isNativeModuleAvailable, saveState]);

  const pauseActivity = useCallback(async (remainingTime: number) => {
    console.log('[LiveActivity] Pausing at:', remainingTime, 'seconds');
    await updateActivity(remainingTime, true);
  }, [updateActivity]);

  const resumeActivity = useCallback(async (remainingTime: number) => {
    console.log('[LiveActivity] Resuming at:', remainingTime, 'seconds');
    lastUpdateRef.current = 0; // Reset throttle for immediate update
    await updateActivity(remainingTime, false);
  }, [updateActivity]);

  const endActivity = useCallback(async (completed: boolean = true) => {
    console.log('[LiveActivity] Ending activity, completed:', completed);

    if (isNativeModuleAvailable) {
      try {
        await LiveActivityModule.endActivity({
          activityId: state.activityId || '',
          completed,
        });
      } catch (error) {
        console.log('[LiveActivity] End error:', error);
      }
    }

    const newState: LiveActivityState = {
      activityId: null,
      isActive: false,
      remainingTime: 0,
      totalTime: 0,
      mode: 'focus',
      isPaused: false,
      startedAt: 0,
      endTime: 0,
    };

    setState(newState);
    await clearState();

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, [state.activityId, isNativeModuleAvailable, clearState]);

  const endAllActivities = useCallback(async () => {
    console.log('[LiveActivity] Ending all activities');
    
    if (isNativeModuleAvailable) {
      try {
        await LiveActivityModule.endAllActivities();
      } catch (error) {
        console.log('[LiveActivity] End all error:', error);
      }
    }

    setState({
      activityId: null,
      isActive: false,
      remainingTime: 0,
      totalTime: 0,
      mode: 'focus',
      isPaused: false,
      startedAt: 0,
      endTime: 0,
    });
    await clearState();
  }, [isNativeModuleAvailable, clearState]);

  const checkActivityStatus = useCallback(async (): Promise<boolean> => {
    if (!isNativeModuleAvailable) return state.isActive;

    try {
      const status = await LiveActivityModule.getActivityStatus();
      console.log('[LiveActivity] Status:', status);
      return status?.isActive ?? false;
    } catch (error) {
      console.log('[LiveActivity] Status check error:', error);
      return state.isActive;
    }
  }, [isNativeModuleAvailable, state.isActive]);

  return {
    isSupported,
    isNativeModuleAvailable,
    isPermissionGranted,
    isActive: state.isActive,
    activityId: state.activityId,
    startActivity,
    updateActivity,
    pauseActivity,
    resumeActivity,
    endActivity,
    endAllActivities,
    checkActivityStatus,
  };
}
