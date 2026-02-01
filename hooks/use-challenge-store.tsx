import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { 
  ActiveChallenge, 
  ChallengeCustomization, 
  ChallengeTask, 
  ChallengeDay,
  ChallengeStats,
  ChallengeStatus 
} from '@/types/challenge';
import { CHALLENGE_TEMPLATES, getChallengeById } from '@/constants/challenges';
import { useAuth } from '@/hooks/use-auth-store';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

const getStorageKeys = (userId: string) => ({
  ACTIVE_CHALLENGES: `active_challenges_${userId}`,
  CHALLENGE_STATS: `challenge_stats_${userId}`,
  CHALLENGE_HISTORY: `challenge_history_${userId}`,
});

const DEFAULT_STATS: ChallengeStats = {
  totalChallengesStarted: 0,
  totalChallengesCompleted: 0,
  totalChallengeFailed: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalDaysCompleted: 0,
};

const GeneratedPlanSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    duration: z.number(),
    order: z.number(),
  })),
  tips: z.array(z.string()),
  motivationalMessage: z.string(),
});

export const [ChallengeProvider, useChallengeStore] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [stats, setStats] = useState<ChallengeStats>(DEFAULT_STATS);

  const STORAGE_KEYS = getStorageKeys(user?.id || 'default');

  const challengesQuery = useQuery({
    queryKey: ['activeChallenges', user?.id, STORAGE_KEYS.ACTIVE_CHALLENGES],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('[ChallengeStore] Loading active challenges for user:', user.id);
      return await safeStorageGet<ActiveChallenge[]>(STORAGE_KEYS.ACTIVE_CHALLENGES, []);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  const statsQuery = useQuery({
    queryKey: ['challengeStats', user?.id, STORAGE_KEYS.CHALLENGE_STATS],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_STATS;
      console.log('[ChallengeStore] Loading challenge stats for user:', user.id);
      return await safeStorageGet<ChallengeStats>(STORAGE_KEYS.CHALLENGE_STATS, DEFAULT_STATS);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (challengesQuery.data) {
      setActiveChallenges(challengesQuery.data);
    }
  }, [challengesQuery.data]);

  useEffect(() => {
    if (statsQuery.data) {
      setStats(statsQuery.data);
    }
  }, [statsQuery.data]);

  const { mutateAsync: saveChallenges } = useMutation({
    mutationFn: async (challenges: ActiveChallenge[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[ChallengeStore] Saving challenges');
      await safeStorageSet(STORAGE_KEYS.ACTIVE_CHALLENGES, challenges);
      return challenges;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeChallenges', user?.id] });
    },
  });

  const { mutateAsync: saveStatsAsync } = useMutation({
    mutationFn: async (newStats: ChallengeStats) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[ChallengeStore] Saving stats');
      await safeStorageSet(STORAGE_KEYS.CHALLENGE_STATS, newStats);
      return newStats;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challengeStats', user?.id] });
    },
  });

  const generatePersonalizedPlan = useCallback(async (
    templateId: string,
    customization: ChallengeCustomization
  ): Promise<{ tasks: ChallengeTask[]; tips: string[]; motivationalMessage: string }> => {
    const template = getChallengeById(templateId);
    if (!template) throw new Error('Challenge template not found');

    console.log('[ChallengeStore] Generating personalized plan for:', templateId);

    try {
      const result = await generateObject({
        messages: [{
          role: 'user',
          content: `Generate a personalized daily task plan for the "${template.name}" challenge.

Challenge Info:
- Name: ${template.name}
- Duration: ${template.durationDays} days
- Original daily tasks: ${template.dailyTasks.join(', ')}
- Rules: ${template.rules.map(r => r.text).join('; ')}

User Customization:
- Fitness Level: ${customization.fitnessLevel}
- Available Time: ${customization.availableTimeMinutes} minutes per day
- Preferred Time: ${customization.preferredTime}
- Health Restrictions: ${customization.healthRestrictions.length > 0 ? customization.healthRestrictions.join(', ') : 'None'}
- Goals: ${customization.goals.join(', ')}

Generate 4-6 daily tasks adapted to this user's level and constraints. Each task should have a title, description, estimated duration in minutes, and order. Also provide 3 helpful tips and a motivational message.`
        }],
        schema: GeneratedPlanSchema,
      });

      const tasks: ChallengeTask[] = result.tasks.map((t, idx) => ({
        id: `task_${Date.now()}_${idx}`,
        title: t.title,
        description: t.description,
        duration: t.duration,
        completed: false,
        order: t.order,
      }));

      return {
        tasks,
        tips: result.tips,
        motivationalMessage: result.motivationalMessage,
      };
    } catch (error) {
      console.error('[ChallengeStore] AI generation failed, using default tasks:', error);
      
      const tasks: ChallengeTask[] = template.dailyTasks.map((task, idx) => ({
        id: `task_${Date.now()}_${idx}`,
        title: task,
        description: `Complete: ${task}`,
        duration: Math.floor(customization.availableTimeMinutes / template.dailyTasks.length),
        completed: false,
        order: idx,
      }));

      return {
        tasks,
        tips: ['Stay consistent', 'Track your progress daily', 'Don\'t be too hard on yourself'],
        motivationalMessage: 'You\'ve got this! Every day is a step forward.',
      };
    }
  }, []);

  const startChallenge = useCallback(async (
    templateId: string,
    customization: ChallengeCustomization
  ): Promise<ActiveChallenge> => {
    const template = getChallengeById(templateId);
    if (!template) throw new Error('Challenge template not found');

    console.log('[ChallengeStore] Starting challenge:', templateId);

    const { tasks } = await generatePersonalizedPlan(templateId, customization);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + template.durationDays - 1);

    const days: ChallengeDay[] = Array.from({ length: template.durationDays }, (_, idx) => {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + idx);
      
      return {
        day: idx + 1,
        date: dayDate.toISOString(),
        tasks: tasks.map(t => ({ ...t, id: `${t.id}_day${idx + 1}`, completed: false })),
        completed: false,
      };
    });

    const newChallenge: ActiveChallenge = {
      id: `challenge_${Date.now()}`,
      templateId,
      userId: user?.id || 'default',
      name: template.name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      currentDay: 1,
      totalDays: template.durationDays,
      status: 'active',
      streak: 0,
      bestStreak: 0,
      customization,
      days,
      createdAt: new Date().toISOString(),
    };

    const updatedChallenges = [...activeChallenges, newChallenge];
    setActiveChallenges(updatedChallenges);
    await saveChallenges(updatedChallenges);

    const newStats = {
      ...stats,
      totalChallengesStarted: stats.totalChallengesStarted + 1,
    };
    setStats(newStats);
    await saveStatsAsync(newStats);

    return newChallenge;
  }, [activeChallenges, stats, user?.id, generatePersonalizedPlan, saveChallenges, saveStatsAsync]);

  const toggleTaskCompletion = useCallback(async (
    challengeId: string,
    dayNumber: number,
    taskId: string
  ) => {
    const updatedChallenges = activeChallenges.map(challenge => {
      if (challenge.id !== challengeId) return challenge;

      const updatedDays = challenge.days.map(day => {
        if (day.day !== dayNumber) return day;

        const updatedTasks = day.tasks.map(task => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : undefined,
          };
        });

        const allCompleted = updatedTasks.every(t => t.completed);

        return {
          ...day,
          tasks: updatedTasks,
          completed: allCompleted,
          completedAt: allCompleted ? new Date().toISOString() : undefined,
        };
      });

      let newStreak = 0;
      for (let i = updatedDays.length - 1; i >= 0; i--) {
        if (updatedDays[i].completed) newStreak++;
        else break;
      }

      return {
        ...challenge,
        days: updatedDays,
        streak: newStreak,
        bestStreak: Math.max(challenge.bestStreak, newStreak),
      };
    });

    setActiveChallenges(updatedChallenges);
    await saveChallenges(updatedChallenges);
  }, [activeChallenges, saveChallenges]);

  const completeDay = useCallback(async (challengeId: string, dayNumber: number) => {
    const updatedChallenges = activeChallenges.map(challenge => {
      if (challenge.id !== challengeId) return challenge;

      const updatedDays = challenge.days.map(day => {
        if (day.day !== dayNumber) return day;
        
        const completedTasks = day.tasks.map(task => ({
          ...task,
          completed: true,
          completedAt: new Date().toISOString(),
        }));

        return {
          ...day,
          tasks: completedTasks,
          completed: true,
          completedAt: new Date().toISOString(),
        };
      });

      const allDaysCompleted = updatedDays.every(d => d.completed);
      let newStreak = 0;
      for (let i = 0; i < updatedDays.length; i++) {
        if (updatedDays[i].completed) newStreak++;
        else break;
      }

      return {
        ...challenge,
        days: updatedDays,
        currentDay: Math.min(dayNumber + 1, challenge.totalDays),
        streak: newStreak,
        bestStreak: Math.max(challenge.bestStreak, newStreak),
        status: allDaysCompleted ? 'completed' as ChallengeStatus : challenge.status,
        completedAt: allDaysCompleted ? new Date().toISOString() : undefined,
      };
    });

    setActiveChallenges(updatedChallenges);
    await saveChallenges(updatedChallenges);

    const completedChallenge = updatedChallenges.find(c => c.id === challengeId);
    if (completedChallenge?.status === 'completed') {
      const newStats = {
        ...stats,
        totalChallengesCompleted: stats.totalChallengesCompleted + 1,
        totalDaysCompleted: stats.totalDaysCompleted + completedChallenge.totalDays,
        currentStreak: stats.currentStreak + 1,
        bestStreak: Math.max(stats.bestStreak, stats.currentStreak + 1),
      };
      setStats(newStats);
      await saveStatsAsync(newStats);
    }
  }, [activeChallenges, stats, saveChallenges, saveStatsAsync]);

  const failChallenge = useCallback(async (challengeId: string) => {
    const updatedChallenges = activeChallenges.map(challenge => {
      if (challenge.id !== challengeId) return challenge;

      return {
        ...challenge,
        status: 'failed' as ChallengeStatus,
        failedAt: new Date().toISOString(),
      };
    });

    setActiveChallenges(updatedChallenges);
    await saveChallenges(updatedChallenges);

    const newStats = {
      ...stats,
      totalChallengeFailed: stats.totalChallengeFailed + 1,
      currentStreak: 0,
    };
    setStats(newStats);
    await saveStatsAsync(newStats);
  }, [activeChallenges, stats, saveChallenges, saveStatsAsync]);

  const restartChallenge = useCallback(async (challengeId: string) => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return;

    const template = getChallengeById(challenge.templateId);
    if (!template) return;

    console.log('[ChallengeStore] Restarting challenge:', challengeId);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + template.durationDays - 1);

    const resetDays: ChallengeDay[] = challenge.days.map((day, idx) => {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + idx);
      
      return {
        ...day,
        date: dayDate.toISOString(),
        tasks: day.tasks.map(t => ({ ...t, completed: false, completedAt: undefined })),
        completed: false,
        completedAt: undefined,
      };
    });

    const updatedChallenges = activeChallenges.map(c => {
      if (c.id !== challengeId) return c;

      return {
        ...c,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currentDay: 1,
        status: 'active' as ChallengeStatus,
        streak: 0,
        days: resetDays,
        failedAt: undefined,
        completedAt: undefined,
      };
    });

    setActiveChallenges(updatedChallenges);
    await saveChallenges(updatedChallenges);
  }, [activeChallenges, saveChallenges]);

  const deleteChallenge = useCallback(async (challengeId: string) => {
    const updatedChallenges = activeChallenges.filter(c => c.id !== challengeId);
    setActiveChallenges(updatedChallenges);
    await saveChallenges(updatedChallenges);
  }, [activeChallenges, saveChallenges]);

  const getActiveChallenge = useCallback((): ActiveChallenge | null => {
    return activeChallenges.find(c => c.status === 'active') || null;
  }, [activeChallenges]);

  const getTodayTasks = useCallback((challengeId: string): ChallengeTask[] => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDay = challenge.days.find(day => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === today.getTime();
    });

    return todayDay?.tasks || [];
  }, [activeChallenges]);

  const getChallengeProgress = useCallback((challengeId: string): number => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return 0;

    const completedDays = challenge.days.filter(d => d.completed).length;
    return (completedDays / challenge.totalDays) * 100;
  }, [activeChallenges]);

  const getCurrentDayNumber = useCallback((challengeId: string): number => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return 1;

    const startDate = new Date(challenge.startDate);
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.min(Math.max(diffDays + 1, 1), challenge.totalDays);
  }, [activeChallenges]);

  return {
    activeChallenges,
    stats,
    isLoading: challengesQuery.isLoading || statsQuery.isLoading,
    templates: CHALLENGE_TEMPLATES,
    startChallenge,
    toggleTaskCompletion,
    completeDay,
    failChallenge,
    restartChallenge,
    deleteChallenge,
    getActiveChallenge,
    getTodayTasks,
    getChallengeProgress,
    getCurrentDayNumber,
    generatePersonalizedPlan,
  };
});
