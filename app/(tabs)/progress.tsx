import React, { memo, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp,
  Award,
  Target,
  Zap,
  Trophy,
  Flame,
  CheckCircle2,
  Crown,
  Sparkles,
  CalendarDays,
  CalendarRange,
  Calendar,
  ChevronRight,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { ProgressRing } from '@/components/ProgressRing';
import { ProgressChart } from '@/components/ProgressChart';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useChallengeStore } from '@/hooks/use-challenge-store';
import { useJournal } from '@/hooks/use-journal-store';
import type { DailyTask } from '@/types/goal';
import { getTaskLocalDateKey, getLocalDateKey, type LocalDateKey } from '@/utils/date';

const EMPTY_TASKS: DailyTask[] = [];

type TimePeriod = 'day' | 'week' | 'month';

export default function ProgressScreen() {
  const store = useGoalStore();
  const challengeStore = useChallengeStore();
  const { entries: journalEntries } = useJournal();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const profile = store?.profile;
  const currentGoal = store?.currentGoal;
  const dailyTasks = store?.dailyTasks ?? EMPTY_TASKS;
  const activeChallenge = challengeStore?.getActiveChallenge?.();

  const goalTasks = useMemo(() => {
    if (!currentGoal?.id) return [];
    return dailyTasks.filter((task) => task.goalId === currentGoal.id);
  }, [currentGoal?.id, dailyTasks]);

  const completedTasks = useMemo(() => {
    return goalTasks.filter((task) => task.completed).length;
  }, [goalTasks]);

  const challengeTodayTasks = useMemo(() => {
    if (!activeChallenge || !challengeStore) return [];
    return challengeStore.getTodayTasks(activeChallenge.id);
  }, [activeChallenge, challengeStore]);

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let goalCompleted = 0;
    let goalTotal = 0;

    if (currentGoal?.id) {
      const todayTasks = dailyTasks.filter((t) => {
        const taskDate = new Date(t.date);
        taskDate.setHours(0, 0, 0, 0);
        return t.goalId === currentGoal.id && taskDate.getTime() === today.getTime();
      });
      goalCompleted = todayTasks.filter((t) => t.completed).length;
      goalTotal = todayTasks.length;
    }

    const challengeCompleted = challengeTodayTasks.filter((t) => t.completed).length;
    const challengeTotal = challengeTodayTasks.length;

    return { 
      completed: goalCompleted + challengeCompleted, 
      total: goalTotal + challengeTotal 
    };
  }, [currentGoal?.id, dailyTasks, challengeTodayTasks]);

  const challengeCompletedTasks = useMemo(() => {
    if (!activeChallenge) return 0;
    return activeChallenge.days.reduce((acc, day) => {
      return acc + day.tasks.filter(t => t.completed).length;
    }, 0);
  }, [activeChallenge]);

  const monthStats = useMemo(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const target = 30;
    let goalCompleted = 0;

    if (currentGoal?.id) {
      const monthTasks = dailyTasks.filter((t) => {
        const taskDate = new Date(t.date);
        return t.goalId === currentGoal.id && taskDate >= monthStart && taskDate <= monthEnd;
      });
      goalCompleted = monthTasks.filter((t) => t.completed).length;
    }

    let challengeMonthCompleted = 0;
    if (activeChallenge) {
      activeChallenge.days.forEach(day => {
        const dayDate = new Date(day.date);
        if (dayDate >= monthStart && dayDate <= monthEnd) {
          challengeMonthCompleted += day.tasks.filter(t => t.completed).length;
        }
      });
    }

    const completedRaw = goalCompleted + challengeMonthCompleted;
    return { completed: Math.min(target, completedRaw), target };
  }, [currentGoal?.id, dailyTasks, activeChallenge]);

  const periodStats = useMemo(() => {
    const goalStats = store?.getProgressForPeriod ? store.getProgressForPeriod(selectedPeriod) : { completed: 0, total: 0, percentage: 0 };
    
    let challengeCompleted = 0;
    let challengeTotal = 0;
    
    if (activeChallenge && challengeStore) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedPeriod === 'day') {
        const tasks = challengeStore.getTodayTasks(activeChallenge.id);
        challengeCompleted = tasks.filter(t => t.completed).length;
        challengeTotal = tasks.length;
      } else if (selectedPeriod === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        activeChallenge.days.forEach(day => {
          const dayDate = new Date(day.date);
          dayDate.setHours(0, 0, 0, 0);
          if (dayDate >= weekStart && dayDate <= weekEnd) {
            challengeCompleted += day.tasks.filter(t => t.completed).length;
            challengeTotal += day.tasks.length;
          }
        });
      } else {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        activeChallenge.days.forEach(day => {
          const dayDate = new Date(day.date);
          if (dayDate >= monthStart && dayDate <= monthEnd) {
            challengeCompleted += day.tasks.filter(t => t.completed).length;
            challengeTotal += day.tasks.length;
          }
        });
      }
    }
    
    const totalCompleted = goalStats.completed + challengeCompleted;
    const totalTasks = goalStats.total + challengeTotal;
    const percentage = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    return { completed: totalCompleted, total: totalTasks, percentage };
  }, [store, selectedPeriod, activeChallenge, challengeStore]);
  
  const totalCompletedAllTasks = completedTasks + challengeCompletedTasks;

  const calculateStreak = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedDateSet = new Set<string>();
    
    if (currentGoal?.id) {
      dailyTasks.forEach(task => {
        if (task.goalId === currentGoal.id && task.completed) {
          const dateKey = getTaskLocalDateKey(task.date);
          if (dateKey) completedDateSet.add(dateKey);
        }
      });
    }
    
    if (activeChallenge) {
      activeChallenge.days.forEach(day => {
        const hasCompletedTask = day.tasks.some(t => t.completed);
        if (hasCompletedTask) {
          const dateKey = getLocalDateKey(new Date(day.date));
          completedDateSet.add(dateKey);
        }
      });
    }
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const checkDate = new Date(today);
    const todayKey = getLocalDateKey(checkDate);
    const hasTodayActivity = completedDateSet.has(todayKey);
    
    if (!hasTodayActivity) {
      checkDate.setDate(checkDate.getDate() - 1);
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
    
    const allDates = Array.from(completedDateSet).sort();
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(allDates[i - 1]);
        const currDate = new Date(allDates[i]);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    }
    
    return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
  }, [currentGoal?.id, dailyTasks, activeChallenge]);

  const progressChartData = useMemo(() => {
    const dataPoints: { date: Date; value: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 9; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      let completed = 0;
      let total = 0;
      
      if (currentGoal?.id) {
        const dayTasks = dailyTasks.filter(t => {
          const taskDate = new Date(t.date);
          taskDate.setHours(0, 0, 0, 0);
          return t.goalId === currentGoal.id && taskDate.getTime() === date.getTime();
        });
        completed += dayTasks.filter(t => t.completed).length;
        total += dayTasks.length;
      }
      
      if (activeChallenge) {
        const challengeDay = activeChallenge.days.find(d => {
          const dayDate = new Date(d.date);
          dayDate.setHours(0, 0, 0, 0);
          return dayDate.getTime() === date.getTime();
        });
        if (challengeDay) {
          completed += challengeDay.tasks.filter(t => t.completed).length;
          total += challengeDay.tasks.length;
        }
      }
      
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      dataPoints.push({ date, value: percentage });
    }
    
    return dataPoints;
  }, [currentGoal?.id, dailyTasks, activeChallenge]);

  if (!store || !store.isReady || !profile) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </GradientBackground>
    );
  }

  const stats = [
    {
      icon: Zap,
      label: 'Current Streak',
      value: calculateStreak.currentStreak,
      unit: 'days',
      color: theme.colors.warning,
    },
    {
      icon: Award,
      label: 'Best Streak',
      value: calculateStreak.bestStreak,
      unit: 'days',
      color: theme.colors.primary,
    },
    {
      icon: Target,
      label: 'Total Completed',
      value: totalCompletedAllTasks,
      unit: 'tasks',
      color: theme.colors.success,
    },
  ];
  
  const handlePeriodChange = (period: TimePeriod) => {
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setSelectedPeriod(period);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };
  
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Today';
    }
  };
  
  const getEmptyMessage = () => {
    if (periodStats.total === 0) {
      switch (selectedPeriod) {
        case 'day': return 'Today is a free day';
        case 'week': return 'No tasks this week yet';
        case 'month': return 'No tasks this month yet';
        default: return 'No tasks yet';
      }
    }
    if (periodStats.percentage === 100) {
      return 'Excellent! All tasks completed!';
    }
    return null;
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Your</Text>
          <Text style={styles.title}>Progress</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.periodSelector}>
            {(
              [
                { key: 'day' as const, label: 'Day', Icon: CalendarDays },
                { key: 'week' as const, label: 'Week', Icon: CalendarRange },
                { key: 'month' as const, label: 'Month', Icon: Calendar },
              ] satisfies { key: TimePeriod; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[]
            ).map(({ key, label, Icon }) => {
              const active = selectedPeriod === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.periodButton, active && styles.periodButtonActive]}
                  onPress={() => handlePeriodChange(key)}
                  activeOpacity={0.8}
                >
                  <Icon size={16} color={active ? '#000' : 'rgba(255,255,255,0.5)'} />
                  <Text style={[styles.periodButtonText, active && styles.periodButtonTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {currentGoal ? (
            <>
              <Animated.View style={[styles.progressCard, { opacity: fadeAnim }]}>
                <ProgressRing progress={periodStats.percentage} size={120} />
                <View style={styles.progressStats}>
                  <Text style={styles.progressLabel}>{getPeriodLabel()}</Text>
                  <Text style={styles.progressValue}>
                    {periodStats.completed} {periodStats.completed === 1 ? 'task' : 'tasks'} completed
                  </Text>
                  <Text style={styles.progressSubtext}>
                    {getEmptyMessage() || 'Keep going at your pace'}
                  </Text>
                </View>
              </Animated.View>

              <View style={styles.statsGrid}>
                {stats.map((stat, index) => (
                  <View key={index} style={styles.statCard}>
                    <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}15` }]}>
                      <stat.icon size={18} color={stat.color} />
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statUnit}>{stat.unit}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.chartSection}>
                <ProgressChart
                  data={progressChartData}
                  title="Overall Progress"
                  subtitle="Task completion rate"
                  emptyMessage="Not enough data yet.&#10;Complete tasks to see your progress."
                />
              </View>

              <View style={styles.calendarSection}>
                <ActivityCalendar 
                  completedDates={dailyTasks
                    .filter((t) => t.goalId === currentGoal?.id && t.completed)
                    .map((t) => getTaskLocalDateKey(t.date))
                    .filter((k): k is LocalDateKey => k != null)}
                  currentStreak={calculateStreak.currentStreak}
                  tasks={dailyTasks.filter((t) => t.goalId === currentGoal?.id)}
                  journalEntries={journalEntries}
                />
              </View>
              
              {activeChallenge && (
                <View style={styles.challengeCard}>
                  <View style={styles.challengeHeader}>
                    <View style={styles.challengeIconWrap}>
                      <Trophy size={18} color="#FFD600" />
                    </View>
                    <View style={styles.challengeInfo}>
                      <Text style={styles.challengeLabel}>Active Challenge</Text>
                      <Text style={styles.challengeName}>{activeChallenge.name}</Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
                  </View>
                  
                  <View style={styles.challengeStats}>
                    <View style={styles.challengeStat}>
                      <Text style={styles.challengeStatValue}>{activeChallenge.currentDay}</Text>
                      <Text style={styles.challengeStatLabel}>Day</Text>
                    </View>
                    <View style={styles.challengeDivider} />
                    <View style={styles.challengeStat}>
                      <Text style={styles.challengeStatValue}>{activeChallenge.totalDays}</Text>
                      <Text style={styles.challengeStatLabel}>Total</Text>
                    </View>
                    <View style={styles.challengeDivider} />
                    <View style={styles.challengeStat}>
                      <Text style={styles.challengeStatValue}>{activeChallenge.streak}</Text>
                      <Text style={styles.challengeStatLabel}>Streak</Text>
                    </View>
                  </View>
                  
                  <View style={styles.challengeProgressBar}>
                    <View 
                      style={[
                        styles.challengeProgressFill, 
                        { width: `${Math.round((activeChallenge.currentDay / activeChallenge.totalDays) * 100)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.challengePercent}>
                    {Math.round((activeChallenge.currentDay / activeChallenge.totalDays) * 100)}% Complete
                  </Text>
                </View>
              )}

              <AchievementsSection
                currentStreak={calculateStreak.currentStreak}
                todayCompleted={todayStats.completed}
                todayTotal={todayStats.total}
                monthCompleted={monthStats.completed}
                monthTarget={monthStats.target}
                totalCompletedTasks={completedTasks}
              />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <TrendingUp size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyTitle}>No progress yet</Text>
              <Text style={styles.emptyDescription}>
                Start your first goal to track progress
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </GradientBackground>
  );
}


type AchievementProgress = {
  current: number;
  target: number;
  eligible?: boolean;
};

type AchievementStats = {
  todayCompleted: number;
  todayTotal: number;
  currentStreak: number;
  monthCompleted: number;
  totalCompletedTasks: number;
};

type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accent: string;
  getProgress: (stats: AchievementStats) => AchievementProgress;
};

type AchievementTier = {
  id: string;
  label: string;
  achievements: AchievementDefinition[];
};

function computeUnlocked(achievement: AchievementDefinition, stats: AchievementStats) {
  const p = achievement.getProgress(stats);
  const eligible = p.eligible ?? true;
  return eligible && p.current >= p.target;
}

function getAchievementTiers(): AchievementTier[] {
  const gold = theme.colors.primary;
  const emerald = theme.colors.success;
  const ember = theme.colors.warning;
  const royal = theme.colors.primaryDark;

  return [
    {
      id: 'tier-1',
      label: 'Level 1',
      achievements: [
        {
          id: 'daily-5',
          title: 'Daily Finisher',
          description: 'Complete 5 tasks in a day',
          icon: CheckCircle2,
          accent: emerald,
          getProgress: (s) => ({ current: s.todayCompleted, target: 5 }),
        },
        {
          id: 'daily-perfect',
          title: 'No Loose Ends',
          description: 'Finish 100% of your tasks today',
          icon: Target,
          accent: gold,
          getProgress: (s) => ({
            current: s.todayTotal > 0 ? s.todayCompleted : 0,
            target: s.todayTotal > 0 ? s.todayTotal : 1,
            eligible: s.todayTotal > 0,
          }),
        },
        {
          id: 'streak-7',
          title: 'Streak Starter',
          description: 'Reach a 7‑day streak',
          icon: Flame,
          accent: ember,
          getProgress: (s) => ({ current: s.currentStreak, target: 7 }),
        },
        {
          id: 'month-50',
          title: 'Momentum Month',
          description: 'Complete 50 tasks this month',
          icon: Trophy,
          accent: royal,
          getProgress: (s) => ({ current: s.monthCompleted, target: 50 }),
        },
        {
          id: 'total-250',
          title: 'Crafted Discipline',
          description: 'Complete 250 tasks overall',
          icon: Sparkles,
          accent: '#E8C060',
          getProgress: (s) => ({ current: s.totalCompletedTasks, target: 250 }),
        },
        {
          id: 'streak-30',
          title: 'Unbreakable',
          description: 'Hold a 30‑day streak',
          icon: Crown,
          accent: gold,
          getProgress: (s) => ({ current: s.currentStreak, target: 30 }),
        },
      ],
    },
    {
      id: 'tier-2',
      label: 'Level 2',
      achievements: [
        {
          id: 'daily-8',
          title: 'Power Day',
          description: 'Complete 8 tasks in a day',
          icon: Zap,
          accent: emerald,
          getProgress: (s) => ({ current: s.todayCompleted, target: 8 }),
        },
        {
          id: 'daily-perfect-5',
          title: 'Perfect Execution',
          description: "Complete 100% of today's tasks (min 5)",
          icon: Target,
          accent: gold,
          getProgress: (s) => {
            const min = 5;
            const eligible = s.todayTotal >= min;
            const target = eligible ? s.todayTotal : min;
            const current = eligible ? s.todayCompleted : Math.min(s.todayCompleted, min);
            return { current, target, eligible };
          },
        },
        {
          id: 'streak-14',
          title: 'Two‑Week Flow',
          description: 'Reach a 14‑day streak',
          icon: Flame,
          accent: ember,
          getProgress: (s) => ({ current: s.currentStreak, target: 14 }),
        },
        {
          id: 'month-100',
          title: 'Heavy Month',
          description: 'Complete 100 tasks this month',
          icon: Trophy,
          accent: royal,
          getProgress: (s) => ({ current: s.monthCompleted, target: 100 }),
        },
        {
          id: 'total-500',
          title: 'Built to Last',
          description: 'Complete 500 tasks overall',
          icon: Sparkles,
          accent: '#E8C060',
          getProgress: (s) => ({ current: s.totalCompletedTasks, target: 500 }),
        },
        {
          id: 'streak-60',
          title: 'Iron Will',
          description: 'Hold a 60‑day streak',
          icon: Crown,
          accent: gold,
          getProgress: (s) => ({ current: s.currentStreak, target: 60 }),
        },
      ],
    },
    {
      id: 'tier-3',
      label: 'Level 3',
      achievements: [
        {
          id: 'daily-12',
          title: 'Relentless',
          description: 'Complete 12 tasks in a day',
          icon: Zap,
          accent: emerald,
          getProgress: (s) => ({ current: s.todayCompleted, target: 12 }),
        },
        {
          id: 'daily-perfect-8',
          title: 'Clinical Precision',
          description: "Complete 100% of today's tasks (min 8)",
          icon: Target,
          accent: gold,
          getProgress: (s) => {
            const min = 8;
            const eligible = s.todayTotal >= min;
            const target = eligible ? s.todayTotal : min;
            const current = eligible ? s.todayCompleted : Math.min(s.todayCompleted, min);
            return { current, target, eligible };
          },
        },
        {
          id: 'streak-90',
          title: 'Seasoned',
          description: 'Reach a 90‑day streak',
          icon: Flame,
          accent: ember,
          getProgress: (s) => ({ current: s.currentStreak, target: 90 }),
        },
        {
          id: 'month-200',
          title: 'Master Month',
          description: 'Complete 200 tasks this month',
          icon: Trophy,
          accent: royal,
          getProgress: (s) => ({ current: s.monthCompleted, target: 200 }),
        },
        {
          id: 'total-1000',
          title: 'Legacy',
          description: 'Complete 1000 tasks overall',
          icon: Sparkles,
          accent: '#E8C060',
          getProgress: (s) => ({ current: s.totalCompletedTasks, target: 1000 }),
        },
        {
          id: 'streak-180',
          title: 'Titan',
          description: 'Hold a 180‑day streak',
          icon: Crown,
          accent: gold,
          getProgress: (s) => ({ current: s.currentStreak, target: 180 }),
        },
      ],
    },
  ];
}

function selectTier(stats: AchievementStats): AchievementTier {
  const tiers = getAchievementTiers();

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const allUnlocked = tier.achievements.every((a) => computeUnlocked(a, stats));
    if (!allUnlocked) return tier;
  }

  const currentLevel = tiers.length + 1;

  const dynamicMultiplier = 1 + Math.max(0, Math.floor(stats.totalCompletedTasks / 1000));
  const monthTarget = 200 + dynamicMultiplier * 100;
  const totalTarget = 1000 + dynamicMultiplier * 500;
  const dailyTarget = 12 + dynamicMultiplier * 2;
  const streakTarget = 180 + dynamicMultiplier * 30;

  return {
    id: `tier-dynamic-${dynamicMultiplier}`,
    label: `Level ${currentLevel}+`,
    achievements: [
      {
        id: `daily-${dailyTarget}`,
        title: 'Relentless+',
        description: `Complete ${dailyTarget} tasks in a day`,
        icon: Zap,
        accent: theme.colors.success,
        getProgress: (s) => ({ current: s.todayCompleted, target: dailyTarget }),
      },
      {
        id: `streak-${streakTarget}`,
        title: 'Titan+',
        description: `Hold a ${streakTarget}‑day streak`,
        icon: Crown,
        accent: theme.colors.primary,
        getProgress: (s) => ({ current: s.currentStreak, target: streakTarget }),
      },
      {
        id: `month-${monthTarget}`,
        title: 'Master Month+',
        description: `Complete ${monthTarget} tasks this month`,
        icon: Trophy,
        accent: theme.colors.primaryDark,
        getProgress: (s) => ({ current: s.monthCompleted, target: monthTarget }),
      },
      {
        id: `total-${totalTarget}`,
        title: 'Legacy+',
        description: `Complete ${totalTarget} tasks overall`,
        icon: Sparkles,
        accent: '#E8C060',
        getProgress: (s) => ({ current: s.totalCompletedTasks, target: totalTarget }),
      },
    ],
  };
}

function getAchievementProgressLabel(achievement: AchievementDefinition, stats: AchievementStats) {
  const p = achievement.getProgress(stats);
  const eligible = p.eligible ?? true;
  if (eligible) return null;

  if (achievement.id.startsWith('daily-perfect')) {
    return 'Add more tasks today to unlock';
  }

  return 'Not available yet';
}

function clampPct(current: number, target: number) {
  const safeTarget = Math.max(1, target);
  const safeCurrent = Math.max(0, Math.min(current, safeTarget));
  return Math.round((safeCurrent / safeTarget) * 100);
}

function getTierProgress(tier: AchievementTier, stats: AchievementStats) {
  const unlockedCount = tier.achievements.filter((a) => computeUnlocked(a, stats)).length;
  return { unlockedCount, total: tier.achievements.length };
}

type AchievementsSectionProps = {
  currentStreak: number;
  todayCompleted: number;
  todayTotal: number;
  monthCompleted: number;
  monthTarget: number;
  totalCompletedTasks: number;
};

const AchievementsSection = memo(function AchievementsSection({
  currentStreak,
  todayCompleted,
  todayTotal,
  monthCompleted,
  monthTarget: _monthTarget,
  totalCompletedTasks,
}: AchievementsSectionProps) {
  const stats = useMemo<AchievementStats>(
    () => ({
      todayCompleted,
      todayTotal,
      currentStreak,
      monthCompleted,
      totalCompletedTasks,
    }),
    [todayCompleted, todayTotal, currentStreak, monthCompleted, totalCompletedTasks],
  );

  const tier = useMemo(() => selectTier(stats), [stats]);
  const tierProgress = useMemo(() => getTierProgress(tier, stats), [tier, stats]);

  return (
    <View style={styles.achievementsCard}>
      <View style={styles.achievementsHeader}>
        <View>
          <Text style={styles.achievementsTitle}>Rewards</Text>
          <Text style={styles.achievementsSubtitle}>
            {tier.label} · {tierProgress.unlockedCount}/{tierProgress.total}
          </Text>
        </View>

        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{tier.id.replace('tier-', '').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.achievementsList}>
        {tier.achievements.map((a) => {
          const progress = a.getProgress(stats);
          const target = Math.max(1, progress.target);
          const current = Math.max(0, Math.min(progress.current, target));
          const pct = clampPct(progress.current, progress.target);
          const unlocked = computeUnlocked(a, stats);
          const helper = getAchievementProgressLabel(a, stats);

          return (
            <View
              key={a.id}
              style={[styles.achievementRow, unlocked ? styles.achievementRowUnlocked : styles.achievementRowLocked]}
            >
              <View
                style={[
                  styles.achievementIconWrap,
                  {
                    borderColor: a.accent + '45',
                    backgroundColor: a.accent + (unlocked ? '18' : '10'),
                  },
                ]}
              >
                <a.icon size={16} color={a.accent} />
              </View>

              <View style={styles.achievementBody}>
                <View style={styles.achievementTopRow}>
                  <Text style={styles.achievementTitleText} numberOfLines={1}>
                    {a.title}
                  </Text>

                  <View
                    style={[
                      styles.achievementPill,
                      {
                        borderColor: a.accent + '35',
                        backgroundColor: a.accent + (unlocked ? '14' : '0D'),
                      },
                    ]}
                  >
                    <Text style={styles.achievementPillText}>{unlocked ? 'Unlocked' : `${pct}%`}</Text>
                  </View>
                </View>

                <Text style={styles.achievementDesc} numberOfLines={2}>
                  {a.description}
                </Text>

                {helper ? (
                  <Text style={styles.achievementHelper} numberOfLines={1}>
                    {helper}
                  </Text>
                ) : null}

                <View style={styles.achievementProgressRow}>
                  <View style={styles.achievementTrack}>
                    <View style={[styles.achievementFill, { width: `${Math.min(100, pct)}%`, backgroundColor: a.accent }]} />
                  </View>

                  <Text style={styles.achievementNumbers}>
                    {current}/{target}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400' as const,
  },
  title: {
    fontSize: 32,
    fontWeight: '400' as const,
    color: '#fff',
    letterSpacing: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  periodButtonTextActive: {
    color: '#000',
    fontWeight: '600' as const,
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressStats: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500' as const,
  },
  progressValue: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    marginTop: 6,
  },
  progressSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 6,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statUnit: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
    textAlign: 'center',
  },
  chartSection: {
    marginBottom: 20,
  },
  calendarSection: {
    marginBottom: 20,
  },
  challengeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.15)',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  challengeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginTop: 2,
  },
  challengeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  challengeStat: {
    alignItems: 'center',
    flex: 1,
  },
  challengeStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFD600',
  },
  challengeStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  challengeDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  challengeProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFD600',
  },
  challengePercent: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 8,
  },
  achievementsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  achievementsSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500' as const,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  tierBadgeText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  achievementsList: {
    gap: 10,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  achievementRowLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    opacity: 0.8,
  },
  achievementRowUnlocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  achievementIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  achievementBody: {
    flex: 1,
  },
  achievementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  achievementTitleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  achievementPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  achievementPillText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  achievementDesc: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 16,
  },
  achievementHelper: {
    marginTop: 6,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '500' as const,
  },
  achievementProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  achievementTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  achievementFill: {
    height: 4,
    borderRadius: 2,
  },
  achievementNumbers: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500' as const,
    minWidth: 50,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#fff',
    marginTop: 24,
  },
  emptyDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
});
