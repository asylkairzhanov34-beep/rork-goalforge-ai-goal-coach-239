import { getLocalDateKey, getTaskLocalDateKey, parseLocalDateKey } from './date';
import type { DailyTask } from '@/types/goal';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | undefined;
  totalActiveDays: number;
}

export interface ChallengeDay {
  date: string;
  tasks: { completed: boolean }[];
  completed?: boolean;
}

export interface ActiveChallengeForStreak {
  days: ChallengeDay[];
}

export function calculateUnifiedStreak(
  dailyTasks: DailyTask[],
  currentGoalId: string | undefined,
  activeChallenges: ActiveChallengeForStreak[] = [],
  previousBestStreak: number = 0
): StreakData {
  const completedDateSet = new Set<string>();

  if (currentGoalId) {
    dailyTasks.forEach(task => {
      if (task.goalId === currentGoalId && task.completed) {
        const dateKey = getTaskLocalDateKey(task.date);
        if (dateKey) completedDateSet.add(dateKey);
      }
    });
  }

  activeChallenges.forEach(challenge => {
    if (challenge?.days) {
      challenge.days.forEach(day => {
        const hasCompletedTask = day.tasks?.some(t => t.completed);
        if (hasCompletedTask && day.date) {
          try {
            const dateKey = getLocalDateKey(new Date(day.date));
            completedDateSet.add(dateKey);
          } catch {
            console.warn('[Streak] Invalid challenge day date:', day.date);
          }
        }
      });
    }
  });

  const totalActiveDays = completedDateSet.size;

  if (totalActiveDays === 0) {
    console.log('[Streak] No completed activity found');
    return {
      currentStreak: 0,
      bestStreak: previousBestStreak,
      lastActivityDate: undefined,
      totalActiveDays: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getLocalDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  const sortedDates = Array.from(completedDateSet).sort((a, b) => {
    const dateA = parseLocalDateKey(a);
    const dateB = parseLocalDateKey(b);
    return dateB.getTime() - dateA.getTime();
  });

  const lastActivityDate = sortedDates[0];
  
  const hasTodayActivity = completedDateSet.has(todayKey);
  const hasYesterdayActivity = completedDateSet.has(yesterdayKey);

  if (!hasTodayActivity && !hasYesterdayActivity) {
    console.log('[Streak] No recent activity, streak is 0', {
      lastActivityDate,
      today: todayKey,
      yesterday: yesterdayKey,
    });
    return {
      currentStreak: 0,
      bestStreak: previousBestStreak,
      lastActivityDate,
      totalActiveDays,
    };
  }

  let currentStreak = 0;
  let checkDate = new Date(today);

  if (!hasTodayActivity && hasYesterdayActivity) {
    checkDate = new Date(yesterday);
  }

  while (true) {
    const dateKey = getLocalDateKey(checkDate);
    if (completedDateSet.has(dateKey)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    
    if (currentStreak > 365) break;
  }

  let tempStreak = 0;
  let calculatedBestStreak = 0;
  
  const chronologicalDates = [...sortedDates].reverse();
  
  for (let i = 0; i < chronologicalDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = parseLocalDateKey(chronologicalDates[i - 1]);
      const currDate = parseLocalDateKey(chronologicalDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    calculatedBestStreak = Math.max(calculatedBestStreak, tempStreak);
  }

  const bestStreak = Math.max(calculatedBestStreak, currentStreak, previousBestStreak);

  console.log('[Streak] Calculated unified streak:', {
    currentStreak,
    bestStreak,
    lastActivityDate,
    totalActiveDays,
    hasTodayActivity,
    hasYesterdayActivity,
  });

  return {
    currentStreak,
    bestStreak,
    lastActivityDate,
    totalActiveDays,
  };
}

export function getWeekProgress(
  dailyTasks: DailyTask[],
  currentGoalId: string | undefined,
  activeChallenges: ActiveChallengeForStreak[] = []
): boolean[] {
  const completedDateSet = new Set<string>();

  if (currentGoalId) {
    dailyTasks.forEach(task => {
      if (task.goalId === currentGoalId && task.completed) {
        const dateKey = getTaskLocalDateKey(task.date);
        if (dateKey) completedDateSet.add(dateKey);
      }
    });
  }

  activeChallenges.forEach(challenge => {
    if (challenge?.days) {
      challenge.days.forEach(day => {
        const hasCompletedTask = day.tasks?.some(t => t.completed);
        if (hasCompletedTask && day.date) {
          try {
            const dateKey = getLocalDateKey(new Date(day.date));
            completedDateSet.add(dateKey);
          } catch {}
        }
      });
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  const weekProgress: boolean[] = [];
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(monday);
    checkDate.setDate(monday.getDate() + i);
    const dateKey = getLocalDateKey(checkDate);
    weekProgress.push(completedDateSet.has(dateKey));
  }

  return weekProgress;
}
