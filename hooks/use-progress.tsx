import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useGoalStore } from './use-goal-store';
import { useTimer } from './use-timer-store';
import { useChallengeStore } from './use-challenge-store';
import type { ActiveChallengeForStreak } from '@/utils/streak';

export interface ProgressData {
  currentStreak: number;
  bestStreak: number;
  totalCompletedTasks: number;
  todayCompletedTasks: number;
  focusTimeMinutes: number;
  focusTimeDisplay: string;
  todayFocusMinutes: number;
  weekProgress: boolean[];
  lastActivityDate: string | undefined;
}

export const [ProgressProvider, useProgress] = createContextHook(() => {
  const goalStore = useGoalStore();
  const timerStore = useTimer();
  const challengeStore = useChallengeStore();
  
  const lastSyncRef = useRef<string>('');
  const lastSessionCountRef = useRef(0);

  const syncChallengesForStreak = useCallback(() => {
    if (!goalStore?.updateActiveChallenges || !challengeStore?.activeChallenges) {
      return;
    }
    
    const activeChallenges = challengeStore.activeChallenges.filter(c => c.status === 'active');
    if (activeChallenges.length === 0) {
      if (lastSyncRef.current !== 'empty') {
        lastSyncRef.current = 'empty';
        goalStore.updateActiveChallenges([]);
      }
      return;
    }
    
    const challengesForStreak: ActiveChallengeForStreak[] = activeChallenges.map(c => ({ days: c.days }));
    
    let syncKey = '';
    for (const c of challengesForStreak) {
      if (c.days) {
        for (const d of c.days) {
          const completedCount = d.tasks?.filter(t => t.completed).length || 0;
          syncKey += `${d.date}:${completedCount},`;
        }
      }
    }
    
    if (syncKey !== lastSyncRef.current) {
      lastSyncRef.current = syncKey;
      InteractionManager.runAfterInteractions(() => {
        goalStore.updateActiveChallenges(challengesForStreak);
      });
    }
  }, [goalStore, challengeStore?.activeChallenges]);

  useEffect(() => {
    syncChallengesForStreak();
  }, [syncChallengesForStreak]);

  const syncTimerSessionsToGoalStore = useCallback(() => {
    if (!timerStore?.sessions || !goalStore?.addPomodoroSession) {
      return;
    }
    
    const timerSessions = timerStore.sessions || [];
    const existingSessions = goalStore.pomodoroSessions || [];
    
    if (timerSessions.length === 0) return;
    
    const existingIds = new Set(existingSessions.map(s => s.id));
    const newSessions = timerSessions.filter(s => !existingIds.has(s.id) && s.type === 'focus');
    
    if (newSessions.length === 0) return;
    
    InteractionManager.runAfterInteractions(() => {
      newSessions.forEach(session => {
        goalStore.addPomodoroSession({
          goalId: session.goalId || 'default',
          duration: session.duration,
          completed: true,
          startTime: session.completedAt.toISOString(),
          endTime: session.completedAt.toISOString(),
          type: 'work',
        });
      });
    });
  }, [timerStore?.sessions, goalStore]);

  useEffect(() => {
    syncTimerSessionsToGoalStore();
  }, [syncTimerSessionsToGoalStore]);

  useEffect(() => {
    const sessionCount = timerStore?.sessions?.length ?? 0;
    if (sessionCount > lastSessionCountRef.current) {
      lastSessionCountRef.current = sessionCount;
      
      InteractionManager.runAfterInteractions(() => {
        goalStore?.recalculateStreak?.();
      });
    }
  }, [timerStore?.sessions?.length, goalStore]);

  const totalFocusMinutes = useMemo(() => {
    const pomodoroStats = goalStore?.getPomodoroStats?.() || { totalWorkTime: 0 };
    const pomodoroMinutes = Math.floor((pomodoroStats.totalWorkTime || 0) / 60);
    
    const timerSessions = timerStore?.sessions || [];
    const timerMinutes = timerSessions
      .filter(s => s.type === 'focus')
      .reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);
    
    return Math.max(pomodoroMinutes, timerMinutes);
  }, [goalStore, timerStore?.sessions]);

  const todayFocusMinutes = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timerSessions = timerStore?.sessions || [];
    return timerSessions
      .filter(s => {
        const sessionDate = new Date(s.completedAt);
        sessionDate.setHours(0, 0, 0, 0);
        return s.type === 'focus' && sessionDate.getTime() === today.getTime();
      })
      .reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);
  }, [timerStore?.sessions]);

  const focusTimeDisplay = useMemo(() => {
    const hours = Math.floor(totalFocusMinutes / 60);
    const minutes = totalFocusMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, [totalFocusMinutes]);

  const totalCompletedTasks = useMemo(() => {
    const goalTasks = goalStore?.dailyTasks?.filter(t => t.completed).length || 0;
    
    let challengeTasks = 0;
    challengeStore?.activeChallenges?.forEach(challenge => {
      if (challenge.status === 'active' || challenge.status === 'completed') {
        challenge.days?.forEach(day => {
          challengeTasks += day.tasks?.filter(t => t.completed).length || 0;
        });
      }
    });
    
    return goalTasks + challengeTasks;
  }, [goalStore?.dailyTasks, challengeStore?.activeChallenges]);

  const todayCompletedTasks = useMemo(() => {
    const goalToday = goalStore?.getTodayTasks?.()?.filter(t => t.completed).length || 0;
    
    let challengeToday = 0;
    const activeChallenge = challengeStore?.getActiveChallenge?.();
    if (activeChallenge) {
      const todayTasks = challengeStore?.getTodayTasks?.(activeChallenge.id) || [];
      challengeToday = todayTasks.filter(t => t.completed).length;
    }
    
    return goalToday + challengeToday;
  }, [goalStore, challengeStore]);

  const currentStreak = useMemo(() => {
    return goalStore?.profile?.currentStreak ?? 0;
  }, [goalStore?.profile?.currentStreak]);

  const bestStreak = useMemo(() => {
    return goalStore?.profile?.bestStreak ?? 0;
  }, [goalStore?.profile?.bestStreak]);

  const lastActivityDate = useMemo(() => {
    return goalStore?.profile?.lastStreakDate;
  }, [goalStore?.profile?.lastStreakDate]);

  const weekProgress = useMemo(() => {
    return goalStore?.getCurrentWeekProgress?.() || [false, false, false, false, false, false, false];
  }, [goalStore]);

  const recalculateStreak = useCallback(() => {
    syncChallengesForStreak();
    goalStore?.recalculateStreak?.();
  }, [syncChallengesForStreak, goalStore]);

  const progressData: ProgressData = useMemo(() => ({
    currentStreak,
    bestStreak,
    totalCompletedTasks,
    todayCompletedTasks,
    focusTimeMinutes: totalFocusMinutes,
    focusTimeDisplay,
    todayFocusMinutes,
    weekProgress,
    lastActivityDate,
  }), [
    currentStreak,
    bestStreak,
    totalCompletedTasks,
    todayCompletedTasks,
    totalFocusMinutes,
    focusTimeDisplay,
    todayFocusMinutes,
    weekProgress,
    lastActivityDate,
  ]);

  return {
    ...progressData,
    recalculateStreak,
    syncChallengesForStreak,
    isLoading: goalStore?.isLoading ?? true,
    isReady: goalStore?.isReady ?? false,
  };
});

export function useStreakData() {
  const { currentStreak, bestStreak, weekProgress, lastActivityDate, recalculateStreak } = useProgress();
  return { currentStreak, bestStreak, weekProgress, lastActivityDate, recalculateStreak };
}

export function useFocusTimeData() {
  const { focusTimeMinutes, focusTimeDisplay, todayFocusMinutes } = useProgress();
  return { focusTimeMinutes, focusTimeDisplay, todayFocusMinutes };
}

export function useTaskCompletionData() {
  const { totalCompletedTasks, todayCompletedTasks } = useProgress();
  return { totalCompletedTasks, todayCompletedTasks };
}
