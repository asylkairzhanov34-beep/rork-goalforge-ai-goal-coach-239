import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { InteractionManager } from 'react-native';
import { Goal, DailyTask, UserProfile, PomodoroSession, PomodoroStats, TaskFeedback } from '@/types/goal';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { debounce } from '@/utils/performance';
import {
  getLocalDateKey,
  getMonthRangeLocal,
  getTaskLocalDateKey as getTaskLocalDateKeyUtil,
  getWeekRangeLocal,
  isDateInRangeLocal,
  safeDateFromAny,
} from '@/utils/date';
import { calculateUnifiedStreak, getWeekProgress, type ActiveChallengeForStreak } from '@/utils/streak';
import { useAuth } from '@/hooks/use-auth-store';
import { 
  getUserGoals, 
  saveUserGoals, 
  getUserTasks, 
  saveUserTasks,
  getUserPomodoroSessions,
  saveUserPomodoroSessions,
  getUserFullProfile,
  saveUserFullProfile,
  testFirestoreConnection
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
  const [activeChallengesForStreak, setActiveChallengesForStreak] = useState<ActiveChallengeForStreak[]>([]);

  const STORAGE_KEYS = getStorageKeys(user?.id || 'default');
  const [firebaseSyncOk, setFirebaseSyncOk] = useState<boolean | null>(null);
  const [firebaseSyncError, setFirebaseSyncError] = useState<string | null>(null);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = currentUserId;
      return;
    }
    if (prevUserIdRef.current !== currentUserId) {
      console.log('[GoalStore] User changed from', prevUserIdRef.current, 'to', currentUserId, '- resetting local state and forcing refetch');
      setCurrentGoal(null);
      setDailyTasks([]);
      setPomodoroSessions([]);
      setProfile(DEFAULT_PROFILE);
      setActiveChallengesForStreak([]);
      setFirebaseSyncOk(null);
      setFirebaseSyncError(null);
      streakCheckedRef.current = null;
      
      queryClient.removeQueries({ queryKey: ['profile'] });
      queryClient.removeQueries({ queryKey: ['goals'] });
      queryClient.removeQueries({ queryKey: ['tasks'] });
      queryClient.removeQueries({ queryKey: ['pomodoro'] });
      
      prevUserIdRef.current = currentUserId;
    }
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!user?.id || user.id.startsWith('dev_guest_')) return;
    
    const checkConnection = async () => {
      console.log('[GoalStore] Testing Firebase Firestore connection...');
      const result = await testFirestoreConnection(user.id);
      setFirebaseSyncOk(result.success);
      if (!result.success) {
        setFirebaseSyncError(result.error || 'Unknown error');
        console.error('[GoalStore] ⚠️ Firebase sync is NOT working:', result.error);
        console.error('[GoalStore] ⚠️ Data will only be stored locally and will be LOST if app is deleted!');
      } else {
        setFirebaseSyncError(null);
        console.log('[GoalStore] ✅ Firebase sync is working correctly');
      }
    };
    
    checkConnection();
  }, [user?.id]);

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_PROFILE;
      
      if (!user.id.startsWith('dev_guest_')) {
        try {
          const firebaseProfile = await getUserFullProfile(user.id);
          if (firebaseProfile) {
            await safeStorageSet(STORAGE_KEYS.PROFILE, firebaseProfile);
            return firebaseProfile;
          }
        } catch {
          // fallback to local
        }
      }
      
      const localProfile = await safeStorageGet(STORAGE_KEYS.PROFILE, null);
      return localProfile || DEFAULT_PROFILE;
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
    refetchOnMount: 'always',
  });

  const goalsQuery = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] ======= LOADING GOALS =======');
      console.log('[GoalStore] User ID:', user.id);
      console.log('[GoalStore] Is real user:', !user.id.startsWith('dev_guest_'));
      
      if (!user.id.startsWith('dev_guest_')) {
        try {
          console.log('[GoalStore] Step 1: Fetching goals from Firebase...');
          const firebaseGoals = await getUserGoals(user.id);
          
          console.log('[GoalStore] Firebase goals response:', {
            found: !!firebaseGoals,
            count: firebaseGoals?.length || 0,
          });
          
          if (firebaseGoals && firebaseGoals.length > 0) {
            console.log('[GoalStore] ✅ Goals loaded from Firebase:', firebaseGoals.length);
            firebaseGoals.forEach((g: Goal, i: number) => {
              console.log(`[GoalStore] - Goal ${i + 1}: ${g.title} (active: ${g.isActive})`);
            });
            await safeStorageSet(STORAGE_KEYS.GOALS, firebaseGoals);
            return firebaseGoals;
          } else {
            console.log('[GoalStore] No goals in Firebase, checking local cache...');
          }
        } catch (error: any) {
          console.error('[GoalStore] Firebase goals fetch failed:', error?.message || error);
        }
      }
      
      console.log('[GoalStore] Step 2: Checking local storage...');
      const localGoals = await safeStorageGet<Goal[] | null>(STORAGE_KEYS.GOALS, null);
      
      if (localGoals && localGoals.length > 0) {
        console.log('[GoalStore] ✅ Found local goals:', localGoals.length);
        
        if (!user.id.startsWith('dev_guest_')) {
          console.log('[GoalStore] ⬆️ Syncing local goals to Firebase...');
          InteractionManager.runAfterInteractions(async () => {
            try {
              await saveUserGoals(user.id, localGoals);
              console.log('[GoalStore] ✅ Local goals synced to Firebase');
            } catch (syncError: any) {
              console.error('[GoalStore] Failed to sync goals to Firebase:', syncError?.message);
            }
          });
        }
        return localGoals;
      }
      
      console.log('[GoalStore] No goals found anywhere - user needs to create first goal');
      return [];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
    refetchOnMount: 'always',
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[GoalStore] ======= LOADING TASKS =======');
      
      if (!user.id.startsWith('dev_guest_')) {
        try {
          console.log('[GoalStore] Fetching tasks from Firebase...');
          const firebaseTasks = await getUserTasks(user.id);
          
          if (firebaseTasks && firebaseTasks.length > 0) {
            console.log('[GoalStore] ✅ Tasks loaded from Firebase:', firebaseTasks.length);
            await safeStorageSet(STORAGE_KEYS.TASKS, firebaseTasks);
            return firebaseTasks;
          } else {
            console.log('[GoalStore] No tasks in Firebase');
          }
        } catch (error: any) {
          console.error('[GoalStore] Firebase tasks fetch failed:', error?.message || error);
        }
      }
      
      const localTasks = await safeStorageGet<DailyTask[] | null>(STORAGE_KEYS.TASKS, null);
      if (localTasks && localTasks.length > 0) {
        console.log('[GoalStore] ✅ Found local tasks:', localTasks.length);
        if (!user.id.startsWith('dev_guest_')) {
          InteractionManager.runAfterInteractions(async () => {
            try {
              await saveUserTasks(user.id, localTasks);
              console.log('[GoalStore] ✅ Local tasks synced to Firebase');
            } catch (syncError: any) {
              console.error('[GoalStore] Failed to sync tasks:', syncError?.message);
            }
          });
        }
        return localTasks;
      }
      
      console.log('[GoalStore] No tasks found');
      return [];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
    refetchOnMount: 'always',
  });

  const pomodoroQuery = useQuery({
    queryKey: ['pomodoro', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const parseSessions = (sessions: any[]) => sessions.map((session: any) => ({
        ...session,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined
      }));
      
      if (!user.id.startsWith('dev_guest_')) {
        try {
          const firebaseSessions = await getUserPomodoroSessions(user.id);
          if (firebaseSessions && firebaseSessions.length > 0) {
            const sessions = parseSessions(firebaseSessions);
            await safeStorageSet(STORAGE_KEYS.POMODORO_SESSIONS, sessions);
            return sessions;
          } else {
            return [];
          }
        } catch {
          // fallback to local
        }
      }
      
      const localSessions = await safeStorageGet<PomodoroSession[] | null>(STORAGE_KEYS.POMODORO_SESSIONS, null);
      if (localSessions && localSessions.length > 0) {
        return parseSessions(localSessions);
      }
      
      return [];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
    refetchOnMount: 'always',
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
    (tasks: DailyTask[], goalId: string | undefined, challenges: ActiveChallengeForStreak[] = []) => {
      return calculateUnifiedStreak(tasks, goalId, challenges, profile.bestStreak || 0);
    },
    [profile.bestStreak],
  );

  const updateActiveChallenges = useCallback((challenges: ActiveChallengeForStreak[]) => {
    setActiveChallengesForStreak(challenges);
  }, []);

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
      await safeStorageSet(STORAGE_KEYS.PROFILE, newProfile);
      if (!user.id.startsWith('dev_guest_')) {
        await saveUserFullProfile(user.id, newProfile).catch(() => {});
      }
      return newProfile;
    },
  });

  const { mutate: saveProfile } = saveProfileMutation;

  const recalculateStreak = useCallback(() => {
    if (!currentGoal?.id) return;
    
    const calculated = calculateStreakFromHistory(dailyTasks, currentGoal.id, activeChallengesForStreak);
    
    console.log('[GoalStore] Recalculating streak:', {
      currentStreak: calculated.currentStreak,
      bestStreak: calculated.bestStreak,
      storedStreak: profile.currentStreak,
    });
    
    if (calculated.currentStreak !== profile.currentStreak || 
        calculated.bestStreak !== profile.bestStreak ||
        calculated.lastActivityDate !== profile.lastStreakDate) {
      
      const newProfile = { 
        ...profile,
        currentStreak: calculated.currentStreak,
        bestStreak: calculated.bestStreak,
        lastStreakDate: calculated.lastActivityDate,
      };
      
      setProfile(newProfile);
      saveProfile(newProfile);
    }
  }, [currentGoal?.id, dailyTasks, activeChallengesForStreak, profile, calculateStreakFromHistory, saveProfile]);

  const debouncedRecalculateStreak = useMemo(
    () => debounce(() => recalculateStreak(), 500),
    [recalculateStreak]
  );

  useEffect(() => {
    if (!currentGoal?.id) return;
    
    let checkKey = `${currentGoal.id}_`;
    for (const t of dailyTasks) {
      checkKey += `${t.id}:${t.completed ? 1 : 0},`;
    }
    for (const c of activeChallengesForStreak) {
      if (c.days) {
        for (const d of c.days) {
          checkKey += `${d.tasks?.filter(t => t.completed).length || 0},`;
        }
      }
    }
    
    if (streakCheckedRef.current === checkKey) return;
    
    streakCheckedRef.current = checkKey;
    debouncedRecalculateStreak();
  }, [dailyTasks, currentGoal?.id, activeChallengesForStreak, debouncedRecalculateStreak]);

  const saveTasksMutation = useMutation({
    mutationFn: async (tasks: DailyTask[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      await safeStorageSet(STORAGE_KEYS.TASKS, tasks);
      if (!user.id.startsWith('dev_guest_')) {
        await saveUserTasks(user.id, tasks).catch(() => {});
      }
      return tasks;
    },
  });

  const savePomodoroMutation = useMutation({
    mutationFn: async (sessions: PomodoroSession[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      await safeStorageSet(STORAGE_KEYS.POMODORO_SESSIONS, sessions);
      if (!user.id.startsWith('dev_guest_')) {
        await saveUserPomodoroSessions(user.id, sessions).catch(() => {});
      }
      return sessions;
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      const updated = dailyTasks.filter(t => t.id !== taskId);
      await safeStorageSet(STORAGE_KEYS.TASKS, updated);
      if (!user.id.startsWith('dev_guest_')) {
        await saveUserTasks(user.id, updated).catch(() => {});
      }
      return updated;
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
    console.log('[GoalStore] ======= CREATING NEW GOAL =======');
    console.log('[GoalStore] Goal title:', goalData.title);
    console.log('[GoalStore] Tasks count:', tasks.length);
    
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
    
    // Step 1: Save to local storage
    console.log('[GoalStore] Step 1: Saving to local storage...');
    await safeStorageSet(STORAGE_KEYS.GOALS, allGoals);
    await safeStorageSet(STORAGE_KEYS.TASKS, newTasks);
    console.log('[GoalStore] ✅ Local storage saved');
    
    // Step 2: Save to Firebase
    if (user?.id && !user.id.startsWith('dev_guest_')) {
      console.log('[GoalStore] Step 2: Syncing to Firebase...');
      try {
        await saveUserGoals(user.id, allGoals);
        console.log('[GoalStore] ✅ Goals synced to Firebase');
        
        await saveUserTasks(user.id, newTasks);
        console.log('[GoalStore] ✅ Tasks synced to Firebase');
        
        // Verify
        const verification = await getUserGoals(user.id);
        if (verification && verification.length > 0) {
          console.log('[GoalStore] ✅ Firebase verification passed - goals persisted');
        } else {
          console.warn('[GoalStore] ⚠️ Firebase verification failed');
        }
      } catch (err: any) {
        console.error('[GoalStore] ❌ Firebase sync failed:', err?.message || err);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    
    updateProfile({ currentGoalId: goalId });
    
    console.log('[GoalStore] ======= GOAL CREATED SUCCESSFULLY =======');
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

  const updateStreak = useCallback((tasksOverride?: DailyTask[]) => {
    const tasksForCalc = tasksOverride ?? dailyTasks;

    const calculated = calculateStreakFromHistory(tasksForCalc, currentGoal?.id, activeChallengesForStreak);
    
    console.log('[Streak] Update after task change:', {
      calculated: calculated.currentStreak,
      stored: profile.currentStreak
    });
    
    if (calculated.currentStreak !== profile.currentStreak || 
        calculated.bestStreak !== profile.bestStreak ||
        calculated.lastActivityDate !== profile.lastStreakDate) {
      
      const newProfile = {
        ...profile,
        currentStreak: calculated.currentStreak, 
        bestStreak: calculated.bestStreak,
        lastStreakDate: calculated.lastActivityDate
      };
      setProfile(newProfile);
      saveProfile(newProfile);
    }
  }, [dailyTasks, currentGoal?.id, activeChallengesForStreak, profile, calculateStreakFromHistory, saveProfile]);

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

  const getCurrentWeekProgress = useCallback(() => {
    return getWeekProgress(dailyTasks, currentGoal?.id, activeChallengesForStreak);
  }, [dailyTasks, currentGoal?.id, activeChallengesForStreak]);

  return {
    profile,
    currentGoal,
    dailyTasks,
    pomodoroSessions,
    isLoading: profileQuery.isLoading || goalsQuery.isLoading || tasksQuery.isLoading || pomodoroQuery.isLoading,
    isReady: !profileQuery.isLoading && !goalsQuery.isLoading && !tasksQuery.isLoading && !pomodoroQuery.isLoading,
    firebaseSyncOk,
    firebaseSyncError,
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
    updateActiveChallenges,
    getCurrentWeekProgress,
    recalculateStreak,
  };
});
