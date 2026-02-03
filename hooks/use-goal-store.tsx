import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Goal, DailyTask, UserProfile, PomodoroSession, PomodoroStats, TaskFeedback } from '@/types/goal';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import {
  getLocalDateKey,
  getMonthRangeLocal,
  getTaskLocalDateKey as getTaskLocalDateKeyUtil,
  getWeekRangeLocal,
  isDateInRangeLocal,
  parseLocalDateKey,
  safeDateFromAny,
} from '@/utils/date';
import { useAuth } from '@/hooks/use-auth-store';
import { 
  getUserGoals, 
  saveUserGoals, 
  getUserTasks, 
  saveUserTasks,
  getUserPomodoroSessions,
  saveUserPomodoroSessions,
  getUserFullProfile,
  saveUserFullProfile
} from '@/lib/firebase';

const getStorageKeys = (userId: string) => ({
  PROFILE: `user_profile_${userId}`,
  GOALS: `goals_${userId}`,
  TASKS: `daily_tasks_${userId}`,
  ONBOARDING: `onboarding_answers_${userId}`,
  POMODORO_SESSIONS: `pomodoro_sessions_${userId}`,
});

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  onboardingCompleted: false,
  totalGoalsCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  joinedAt: new Date().toISOString(),
  preferences: {
    motivationalQuotes: true,
  },
};

export const [GoalProvider, useGoalStore] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  const STORAGE_KEYS = getStorageKeys(user?.id || 'default');

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id, STORAGE_KEYS.PROFILE],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_PROFILE;
      
      console.log('[GoalStore] Loading profile for user:', user.id);
      const firebaseProfile = await getUserFullProfile(user.id);
      
      if (firebaseProfile) {
        console.log('[GoalStore] Profile loaded from Firebase');
        await safeStorageSet(STORAGE_KEYS.PROFILE, firebaseProfile);
        return firebaseProfile;
      }
      
      console.log('[GoalStore] No Firebase profile, checking local storage');
      return await safeStorageGet(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  const goalsQuery = useQuery({
    queryKey: ['goals', user?.id, STORAGE_KEYS.GOALS],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] Loading goals for user:', user.id);
      const firebaseGoals = await getUserGoals(user.id);
      
      if (firebaseGoals && firebaseGoals.length > 0) {
        console.log('[GoalStore] Goals loaded from Firebase:', firebaseGoals.length);
        await safeStorageSet(STORAGE_KEYS.GOALS, firebaseGoals);
        return firebaseGoals;
      }
      
      console.log('[GoalStore] No Firebase goals, checking local storage');
      return await safeStorageGet(STORAGE_KEYS.GOALS, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id, STORAGE_KEYS.TASKS],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] Loading tasks for user:', user.id);
      const firebaseTasks = await getUserTasks(user.id);
      
      if (firebaseTasks && firebaseTasks.length > 0) {
        console.log('[GoalStore] Tasks loaded from Firebase:', firebaseTasks.length);
        await safeStorageSet(STORAGE_KEYS.TASKS, firebaseTasks);
        return firebaseTasks;
      }
      
      console.log('[GoalStore] No Firebase tasks, checking local storage');
      return await safeStorageGet(STORAGE_KEYS.TASKS, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  const pomodoroQuery = useQuery({
    queryKey: ['pomodoro', user?.id, STORAGE_KEYS.POMODORO_SESSIONS],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] Loading pomodoro sessions for user:', user.id);
      const firebaseSessions = await getUserPomodoroSessions(user.id);
      
      if (firebaseSessions && firebaseSessions.length > 0) {
        console.log('[GoalStore] Pomodoro sessions loaded from Firebase:', firebaseSessions.length);
        const sessions = firebaseSessions.map((session: any) => ({
          ...session,
          completedAt: session.completedAt ? new Date(session.completedAt) : undefined
        }));
        await safeStorageSet(STORAGE_KEYS.POMODORO_SESSIONS, sessions);
        return sessions;
      }
      
      console.log('[GoalStore] No Firebase sessions, checking local storage');
      const sessions = await safeStorageGet(STORAGE_KEYS.POMODORO_SESSIONS, []);
      return sessions.map((session: any) => ({
        ...session,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const getTaskLocalDateKey = useCallback(
    (task: DailyTask): string => {
      const key = getTaskLocalDateKeyUtil(task.date);
      return key ?? getLocalDateKey(new Date());
    },
    [],
  );

  const calculateStreakFromHistory = useCallback(
    (tasks: DailyTask[], goalId: string | undefined): { currentStreak: number; lastStreakDate: string | undefined } => {
      if (!goalId) return { currentStreak: 0, lastStreakDate: undefined };

      const goalTasks = tasks.filter((t) => t.goalId === goalId);

      const tasksByDate = new Map<string, DailyTask[]>();
      goalTasks.forEach((task) => {
        const dateKey = getTaskLocalDateKey(task);
        const existing = tasksByDate.get(dateKey) || [];
        existing.push(task);
        tasksByDate.set(dateKey, existing);
      });

      const completedDates: string[] = [];
      tasksByDate.forEach((dateTasks, dateKey) => {
        if (dateTasks.length > 0 && dateTasks.every((t) => t.completed)) {
          completedDates.push(dateKey);
        }
      });

      completedDates.sort((a, b) => parseLocalDateKey(b).getTime() - parseLocalDateKey(a).getTime());

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = getLocalDateKey(today);

      if (completedDates.length === 0) {
        const hasAnyTasks = goalTasks.length > 0;
        const earliestTaskDate = hasAnyTasks
          ? goalTasks
              .map((t) => parseLocalDateKey(getTaskLocalDateKey(t)))
              .sort((a, b) => a.getTime() - b.getTime())[0]
          : undefined;

        const isStarted = !!earliestTaskDate && earliestTaskDate.getTime() <= today.getTime();

        console.log('[Streak] No completed dates found', {
          hasAnyTasks,
          earliestTaskDate: earliestTaskDate?.toISOString(),
          today: todayStr,
          isStarted,
        });

        return { currentStreak: hasAnyTasks && isStarted ? 1 : 0, lastStreakDate: undefined };
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateKey(yesterday);

      const lastCompletedDate = completedDates[0];
      if (lastCompletedDate !== todayStr && lastCompletedDate !== yesterdayStr) {
        console.log('[Streak] No recent activity, streak broken', {
          lastCompletedDate,
          today: todayStr,
          yesterday: yesterdayStr,
        });
        return { currentStreak: 0, lastStreakDate: undefined };
      }

      let streak = 0;
      const completedSet = new Set(completedDates);
      let checkDate = parseLocalDateKey(lastCompletedDate);

      while (completedSet.has(getLocalDateKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      console.log('[Streak] Calculated from history:', {
        streak,
        lastCompletedDate,
        totalCompletedDates: completedDates.length,
        allCompletedDates: Array.from(completedDates),
      });

      return { currentStreak: streak, lastStreakDate: lastCompletedDate };
    },
    [getTaskLocalDateKey],
  );

  useEffect(() => {
    if (goalsQuery.data && Array.isArray(goalsQuery.data) && goalsQuery.data.length > 0) {
      const goals = goalsQuery.data as Goal[];
      const activeGoal = goals.find((g: Goal) => g.isActive);
      if (activeGoal) {
        const goalTasks = dailyTasks.filter(task => task.goalId === activeGoal.id);
        const completedCount = goalTasks.filter(task => task.completed).length;
        const totalCount = goalTasks.length;
        
        const updatedGoal: Goal = {
          ...activeGoal,
          completedTasksCount: completedCount,
          totalTasksCount: totalCount
        };
        
        setCurrentGoal(updatedGoal);
      } else {
        const lastGoal = goals[goals.length - 1];
        if (lastGoal) {
          const goalTasks = dailyTasks.filter(task => task.goalId === lastGoal.id);
          const completedCount = goalTasks.filter(task => task.completed).length;
          const totalCount = goalTasks.length;
          
          const updatedGoal: Goal = { 
            ...lastGoal, 
            isActive: true,
            completedTasksCount: completedCount,
            totalTasksCount: totalCount
          };
          const updatedGoals = goals.map((g: Goal) => 
            g.id === lastGoal.id ? updatedGoal : { ...g, isActive: false }
          );
          
          (async () => {
            await safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
            await saveUserGoals(user?.id || 'default', updatedGoals).catch((err: Error) => {
              console.error('[GoalStore] Failed to sync goals to Firebase:', err);
            });
          })();
          
          setCurrentGoal(updatedGoal);
          queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
        }
      }
    } else {
      setCurrentGoal(null);
    }
  }, [goalsQuery.data, dailyTasks, queryClient, user?.id, STORAGE_KEYS.GOALS]);

  useEffect(() => {
    if (tasksQuery.data) {
      setDailyTasks(tasksQuery.data);
    }
  }, [tasksQuery.data]);

  useEffect(() => {
    if (pomodoroQuery.data) {
      setPomodoroSessions(pomodoroQuery.data);
    }
  }, [pomodoroQuery.data]);

  const streakCheckedRef = useRef<string | null>(null);

  const saveProfileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Saving profile to Firebase and local storage');
      await safeStorageSet(STORAGE_KEYS.PROFILE, newProfile);
      await saveUserFullProfile(user.id, newProfile).catch((err: Error) => {
        console.error('[GoalStore] Failed to save profile to Firebase:', err);
      });
      return newProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const { mutate: saveProfile } = saveProfileMutation;

  // Recalculate streak when tasks or goal changes
  useEffect(() => {
    if (!currentGoal?.id || dailyTasks.length === 0) return;
    
    const checkKey = `${currentGoal.id}_${dailyTasks.map((t) => `${t.id}:${t.date}:${t.completed}`).join(',')}`;
    if (streakCheckedRef.current === checkKey) return;
    
    streakCheckedRef.current = checkKey;
    
    const calculated = calculateStreakFromHistory(dailyTasks, currentGoal.id);
    
    setProfile(prev => {
      if (calculated.currentStreak === prev.currentStreak && 
          calculated.lastStreakDate === prev.lastStreakDate) {
        return prev;
      }
      
      const bestStreak = Math.max(calculated.currentStreak, prev.bestStreak || 0);
      const newProfile = { 
        ...prev,
        currentStreak: calculated.currentStreak,
        bestStreak,
        lastStreakDate: calculated.lastStreakDate,
      };
      
      saveProfile(newProfile);
      return newProfile;
    });
  }, [dailyTasks, currentGoal?.id, saveProfile, calculateStreakFromHistory]);

  const saveTasksMutation = useMutation({
    mutationFn: async (tasks: DailyTask[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Saving tasks to Firebase and local storage');
      await safeStorageSet(STORAGE_KEYS.TASKS, tasks);
      await saveUserTasks(user.id, tasks).catch((err: Error) => {
        console.error('[GoalStore] Failed to save tasks to Firebase:', err);
      });
      return tasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const savePomodoroMutation = useMutation({
    mutationFn: async (sessions: PomodoroSession[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Saving pomodoro sessions to Firebase and local storage');
      await safeStorageSet(STORAGE_KEYS.POMODORO_SESSIONS, sessions);
      await saveUserPomodoroSessions(user.id, sessions).catch((err: Error) => {
        console.error('[GoalStore] Failed to save pomodoro sessions to Firebase:', err);
      });
      return sessions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro', user?.id] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[GoalStore] Deleting task from Firebase and local storage');
      const updated = dailyTasks.filter(t => t.id !== taskId);
      await safeStorageSet(STORAGE_KEYS.TASKS, updated);
      await saveUserTasks(user.id, updated).catch((err: Error) => {
        console.error('[GoalStore] Failed to delete task from Firebase:', err);
      });
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const updateTask = (taskId: string, updates: Partial<DailyTask>) => {
    const updatedTasks = dailyTasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    setDailyTasks(updatedTasks);
    saveTasksMutation.mutate(updatedTasks);
  };

  const saveTaskFeedback = (taskId: string, feedback: TaskFeedback) => {
    console.log('[GoalStore] Saving task feedback:', { taskId, feedback });
    const updatedTasks = dailyTasks.map(task => 
      task.id === taskId ? { ...task, feedback } : task
    );
    setDailyTasks(updatedTasks);
    saveTasksMutation.mutate(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = dailyTasks.filter(task => task.id !== taskId);
    setDailyTasks(updatedTasks);
    deleteTaskMutation.mutate(taskId);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    saveProfileMutation.mutate(newProfile);
  };

  const createGoal = async (
    goalData: Omit<Goal, 'id' | 'createdAt' | 'isActive' | 'completedTasksCount' | 'totalTasksCount'>,
    tasks: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>[]
  ) => {
    const goalId = Date.now().toString();
    const newGoal: Goal = {
      ...goalData,
      id: goalId,
      createdAt: new Date().toISOString(),
      isActive: true,
      completedTasksCount: 0,
      totalTasksCount: tasks.length,
      planType: goalData.planType || 'free',
    };

    const newTasks: DailyTask[] = tasks.map((task, index) => ({
      ...task,
      id: `${goalId}_task_${index}`,
      goalId,
      completed: false,
    }));

    const existingGoals = goalsQuery.data || [];
    const updatedExistingGoals = existingGoals.map((g: Goal) => ({ ...g, isActive: false }));
    const allGoals = [...updatedExistingGoals, newGoal];

    setCurrentGoal(newGoal);
    setDailyTasks(newTasks);
    
    console.log('[GoalStore] Creating new goal and syncing to Firebase');
    await safeStorageSet(STORAGE_KEYS.GOALS, allGoals);
    await saveUserGoals(user?.id || 'default', allGoals).catch((err: Error) => {
      console.error('[GoalStore] Failed to sync goals to Firebase:', err);
    });
    await saveTasksMutation.mutateAsync(newTasks);
    
    queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    
    updateProfile({ currentGoalId: goalId });
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const updatedTasks = dailyTasks.map(task => {
      if (task.id === taskId) {
        const completed = !task.completed;
        return {
          ...task,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });

    setDailyTasks(updatedTasks);
    await saveTasksMutation.mutateAsync(updatedTasks);

    if (currentGoal) {
      const goalTasks = updatedTasks.filter(t => t.goalId === currentGoal.id);
      const completedCount = goalTasks.filter(t => t.completed).length;
      const totalCount = goalTasks.length;
      
      const updatedGoal = { 
        ...currentGoal, 
        completedTasksCount: completedCount,
        totalTasksCount: totalCount
      };
      setCurrentGoal(updatedGoal);
      
      const goals = goalsQuery.data || [];
      const updatedGoals = goals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g);
      await safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
      await saveUserGoals(user?.id || 'default', updatedGoals).catch((err: Error) => {
        console.error('[GoalStore] Failed to sync goals to Firebase:', err);
      });
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    }

    updateStreak(updatedTasks);
  };

  const updateStreak = (tasksOverride?: DailyTask[]) => {
    const tasksForCalc = tasksOverride ?? dailyTasks;

    // Recalculate streak from actual task history
    const calculated = calculateStreakFromHistory(tasksForCalc, currentGoal?.id);
    
    console.log('[Streak] Update after task change:', {
      calculated: calculated.currentStreak,
      stored: profile.currentStreak
    });
    
    if (calculated.currentStreak !== profile.currentStreak || 
        calculated.lastStreakDate !== profile.lastStreakDate) {
      const bestStreak = Math.max(calculated.currentStreak, profile.bestStreak || 0);
      
      updateProfile({ 
        currentStreak: calculated.currentStreak, 
        bestStreak,
        lastStreakDate: calculated.lastStreakDate
      });
    }
  };

  const getTodayTasks = () => {
    const today = new Date();
    const todayKey = getLocalDateKey(today);

    return dailyTasks.filter((task) => {
      if (task.goalId !== currentGoal?.id) return false;
      const key = getTaskLocalDateKeyUtil(task.date);
      if (!key) return false;
      return key === todayKey;
    });
  };

  const getProgress = () => {
    if (!currentGoal) return 0;
    
    const goalTasks = dailyTasks.filter(task => task.goalId === currentGoal.id);
    const completedTasks = goalTasks.filter(task => task.completed);
    
    return goalTasks.length > 0 
      ? (completedTasks.length / goalTasks.length) * 100 
      : 0;
  };

  const getProgressForPeriod = (period: 'day' | 'week' | 'month') => {
    if (!currentGoal) return { completed: 0, total: 0, percentage: 0 };

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateKey(today);

    const goalTasks = dailyTasks.filter((task) => task.goalId === currentGoal.id);

    if (period === 'day') {
      const todayTasks = goalTasks.filter((task) => getTaskLocalDateKey(task) === todayKey);

      const completed = todayTasks.filter((t) => t.completed).length;
      const total = todayTasks.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      console.log('[GoalStore] Progress for day:', {
        period,
        todayKey,
        completed,
        total,
        percentage,
        allTaskDates: goalTasks.map((t) => ({ id: t.id, date: getTaskLocalDateKey(t), completed: t.completed })),
      });

      return { completed, total, percentage };
    }

    if (period === 'week') {
      const range = getWeekRangeLocal(today, 'monday');
      const weekStartKey = getLocalDateKey(range.start);
      const weekEndKey = getLocalDateKey(range.end);

      const weekTasks = goalTasks.filter((task) => {
        const taskDate = safeDateFromAny(task.date);
        if (!taskDate) return false;
        return isDateInRangeLocal(taskDate, range);
      });

      const completed = weekTasks.filter((t) => t.completed).length;
      const total = weekTasks.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      console.log('[GoalStore] Progress for week:', {
        period,
        weekStartKey,
        weekEndKey,
        completed,
        total,
        percentage,
        rangeStart: range.start.toISOString(),
        rangeEnd: range.end.toISOString(),
      });

      return { completed, total, percentage };
    }

    const range = getMonthRangeLocal(today);
    const monthStartKey = getLocalDateKey(range.start);
    const monthEndKey = getLocalDateKey(range.end);

    const monthTasks = goalTasks.filter((task) => {
      const taskDate = safeDateFromAny(task.date);
      if (!taskDate) return false;
      return isDateInRangeLocal(taskDate, range);
    });

    const completed = monthTasks.filter((t) => t.completed).length;
    const total = monthTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    console.log('[GoalStore] Progress for month:', {
      period,
      monthStartKey,
      monthEndKey,
      completed,
      total,
      percentage,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
    });

    return { completed, total, percentage };
  };

  const resetGoal = async () => {
    if (!user?.id) return;
    console.log('[GoalStore] Resetting goal for user:', user.id);
    
    setCurrentGoal(null);
    setDailyTasks([]);
    
    // Clear local storage
    await AsyncStorage.removeItem(STORAGE_KEYS.GOALS);
    await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
    
    // Clear Firebase data
    await saveUserGoals(user.id, []).catch((err: Error) => {
      console.error('[GoalStore] Failed to clear goals from Firebase:', err);
    });
    await saveUserTasks(user.id, []).catch((err: Error) => {
      console.error('[GoalStore] Failed to clear tasks from Firebase:', err);
    });
    
    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    
    updateProfile({ currentGoalId: undefined });
    console.log('[GoalStore] Goal reset complete');
  };

  const addPomodoroSession = (session: Omit<PomodoroSession, 'id'>) => {
    const newSession: PomodoroSession = {
      ...session,
      id: Date.now().toString(),
    };
    const updatedSessions = [...pomodoroSessions, newSession];
    setPomodoroSessions(updatedSessions);
    savePomodoroMutation.mutate(updatedSessions);
  };

  const updatePomodoroSession = (sessionId: string, updates: Partial<PomodoroSession>) => {
    const updatedSessions = pomodoroSessions.map(session => 
      session.id === sessionId ? { ...session, ...updates } : session
    );
    setPomodoroSessions(updatedSessions);
    savePomodoroMutation.mutate(updatedSessions);
  };

  const getPomodoroStats = (): PomodoroStats => {
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    
    const completedSessions = pomodoroSessions.filter(s => s.completed);
    const todaySessions = completedSessions.filter(s => new Date(s.startTime).toDateString() === today);
    const weekSessions = completedSessions.filter(s => new Date(s.startTime) >= weekStart);
    
    const totalWorkTime = completedSessions
      .filter(s => s.type === 'work')
      .reduce((total, s) => total + s.duration, 0);
    
    const todayWorkTime = todaySessions
      .filter(s => s.type === 'work')
      .reduce((total, s) => total + s.duration, 0);
    
    const weekWorkTime = weekSessions
      .filter(s => s.type === 'work')
      .reduce((total, s) => total + s.duration, 0);
    
    const daysSinceJoined = Math.max(1, Math.floor((now.getTime() - new Date(profile.joinedAt).getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      totalSessions: completedSessions.length,
      totalWorkTime,
      todaySessions: todaySessions.length,
      todayWorkTime,
      weekSessions: weekSessions.length,
      weekWorkTime,
      averageSessionsPerDay: completedSessions.length / daysSinceJoined,
    };
  };

  const addTask = async (taskData: Omit<DailyTask, 'id' | 'goalId' | 'completed'> & { completed?: boolean }) => {
    const newTask: DailyTask = {
      ...taskData,
      completed: taskData.completed ?? false,
      id: `task_${Date.now()}`,
      goalId: currentGoal?.id || 'default',
    };
    
    const updatedTasks = [...dailyTasks, newTask];
    setDailyTasks(updatedTasks);
    await saveTasksMutation.mutateAsync(updatedTasks);

    if (newTask.completed) {
       if (currentGoal) {
          const goalTasks = updatedTasks.filter(t => t.goalId === currentGoal.id);
          const completedCount = goalTasks.filter(t => t.completed).length;
          const totalCount = goalTasks.length;
          
          const updatedGoal = { 
            ...currentGoal, 
            completedTasksCount: completedCount,
            totalTasksCount: totalCount
          };
          setCurrentGoal(updatedGoal);
          
          const goals = goalsQuery.data || [];
          const updatedGoals = goals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g);
          await safeStorageSet(STORAGE_KEYS.GOALS, updatedGoals);
          await saveUserGoals(user?.id || 'default', updatedGoals).catch((err: Error) => {
            console.error('[GoalStore] Failed to sync goals to Firebase:', err);
          });
          queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
       }
       updateStreak(updatedTasks);
    }
  };

  return {
    profile,
    currentGoal,
    dailyTasks,
    pomodoroSessions,
    isLoading: profileQuery.isLoading || goalsQuery.isLoading || tasksQuery.isLoading || pomodoroQuery.isLoading,
    isReady: !profileQuery.isLoading && !goalsQuery.isLoading && !tasksQuery.isLoading && !pomodoroQuery.isLoading,
    updateProfile,
    createGoal,
    addTask,
    toggleTaskCompletion,
    getTodayTasks,
    getProgress,
    getProgressForPeriod,
    resetGoal,
    addPomodoroSession,
    updatePomodoroSession,
    getPomodoroStats,
    updateTask,
    deleteTask,
    saveTaskFeedback,
  };
});
