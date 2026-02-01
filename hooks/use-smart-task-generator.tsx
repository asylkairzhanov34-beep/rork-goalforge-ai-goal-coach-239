import { useState, useCallback, useMemo } from 'react';
import { useGoalStore } from '@/hooks/use-goal-store';

interface TaskAnalytics {
  completionRate: number;
  avgDifficulty: number;
  preferredDifficulty: 'easy' | 'medium' | 'hard';
  avgTasksPerDay: number;
  completedByDifficulty: {
    easy: { completed: number; total: number; rate: number };
    medium: { completed: number; total: number; rate: number };
    hard: { completed: number; total: number; rate: number };
  };
  streakData: {
    currentStreak: number;
    isOnRise: boolean;
    recentTrend: 'improving' | 'declining' | 'stable';
  };
  recentPerformance: {
    last7Days: number;
    last3Days: number;
  };
  weakAreas: string[];
  strongAreas: string[];
  suggestedFocus: string;
}

interface GeneratedTask {
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  tips: string[];
  subtasks?: { title: string; estimatedTime: number }[];
  reason: string;
}

export function useSmartTaskGenerator() {
  const { currentGoal, dailyTasks, profile } = useGoalStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingInBackground, setIsGeneratingInBackground] = useState(false);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<string | null>(null);

  const getTaskAnalytics = useCallback((): TaskAnalytics | null => {
    if (!currentGoal || !dailyTasks) return null;

    const goalTasks = dailyTasks.filter(t => t.goalId === currentGoal.id);
    if (goalTasks.length === 0) {
      return {
        completionRate: 0,
        avgDifficulty: 1,
        preferredDifficulty: 'easy',
        avgTasksPerDay: 0,
        completedByDifficulty: {
          easy: { completed: 0, total: 0, rate: 0 },
          medium: { completed: 0, total: 0, rate: 0 },
          hard: { completed: 0, total: 0, rate: 0 },
        },
        streakData: {
          currentStreak: profile?.currentStreak || 0,
          isOnRise: false,
          recentTrend: 'stable',
        },
        recentPerformance: { last7Days: 0, last3Days: 0 },
        weakAreas: [],
        strongAreas: [],
        suggestedFocus: 'start',
      };
    }

    const completedTasks = goalTasks.filter(t => t.completed);
    const completionRate = goalTasks.length > 0 ? (completedTasks.length / goalTasks.length) * 100 : 0;

    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    const avgDifficulty = goalTasks.reduce((sum, t) => sum + (difficultyMap[t.difficulty] || 2), 0) / goalTasks.length;

    const completedByDifficulty = {
      easy: { completed: 0, total: 0, rate: 0 },
      medium: { completed: 0, total: 0, rate: 0 },
      hard: { completed: 0, total: 0, rate: 0 },
    };

    goalTasks.forEach(task => {
      const diff = task.difficulty || 'medium';
      completedByDifficulty[diff].total++;
      if (task.completed) {
        completedByDifficulty[diff].completed++;
      }
    });

    Object.keys(completedByDifficulty).forEach(key => {
      const k = key as 'easy' | 'medium' | 'hard';
      completedByDifficulty[k].rate = completedByDifficulty[k].total > 0
        ? (completedByDifficulty[k].completed / completedByDifficulty[k].total) * 100
        : 0;
    });

    let preferredDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    const easyRate = completedByDifficulty.easy.rate;
    const mediumRate = completedByDifficulty.medium.rate;
    const hardRate = completedByDifficulty.hard.rate;

    if (hardRate >= 70 && completedByDifficulty.hard.total >= 3) {
      preferredDifficulty = 'hard';
    } else if (mediumRate >= 60 && completedByDifficulty.medium.total >= 3) {
      preferredDifficulty = 'medium';
    } else if (easyRate >= 80) {
      preferredDifficulty = 'medium';
    } else {
      preferredDifficulty = 'easy';
    }

    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const last3Days = new Date(now);
    last3Days.setDate(last3Days.getDate() - 3);

    const tasks7Days = goalTasks.filter(t => new Date(t.date) >= last7Days);
    const tasks3Days = goalTasks.filter(t => new Date(t.date) >= last3Days);

    const rate7Days = tasks7Days.length > 0
      ? (tasks7Days.filter(t => t.completed).length / tasks7Days.length) * 100
      : 0;
    const rate3Days = tasks3Days.length > 0
      ? (tasks3Days.filter(t => t.completed).length / tasks3Days.length) * 100
      : 0;

    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (rate3Days > rate7Days + 10) {
      recentTrend = 'improving';
    } else if (rate3Days < rate7Days - 10) {
      recentTrend = 'declining';
    }

    const uniqueDays = new Set(goalTasks.map(t => new Date(t.date).toDateString())).size;
    const avgTasksPerDay = uniqueDays > 0 ? goalTasks.length / uniqueDays : 0;

    const weakAreas: string[] = [];
    const strongAreas: string[] = [];

    if (completedByDifficulty.hard.rate < 50 && completedByDifficulty.hard.total > 0) {
      weakAreas.push('hard tasks');
    }
    if (completedByDifficulty.easy.rate > 80 && completedByDifficulty.easy.total > 2) {
      strongAreas.push('easy tasks');
    }
    if (completedByDifficulty.medium.rate > 70 && completedByDifficulty.medium.total > 2) {
      strongAreas.push('medium tasks');
    }

    let suggestedFocus = 'continue';
    if (completionRate < 30) {
      suggestedFocus = 'simplify';
    } else if (completionRate > 80 && avgDifficulty < 2) {
      suggestedFocus = 'challenge';
    } else if (recentTrend === 'declining') {
      suggestedFocus = 'recover';
    } else if (recentTrend === 'improving') {
      suggestedFocus = 'accelerate';
    }

    return {
      completionRate,
      avgDifficulty,
      preferredDifficulty,
      avgTasksPerDay,
      completedByDifficulty,
      streakData: {
        currentStreak: profile?.currentStreak || 0,
        isOnRise: recentTrend === 'improving',
        recentTrend,
      },
      recentPerformance: {
        last7Days: rate7Days,
        last3Days: rate3Days,
      },
      weakAreas,
      strongAreas,
      suggestedFocus,
    };
  }, [currentGoal, dailyTasks, profile]);

  const analytics = useMemo(() => getTaskAnalytics(), [getTaskAnalytics]);

  const generateSmartTasks = useCallback(async (onFirstTaskReady?: (task: GeneratedTask) => void): Promise<GeneratedTask[]> => {
    if (!currentGoal) {
      console.log('[SmartGenerator] No current goal');
      return [];
    }

    setIsGenerating(true);
    console.log('[SmartGenerator] Starting smart task generation');

    try {
      const goalTasks = dailyTasks?.filter(t => t.goalId === currentGoal.id) || [];
      const completedTasks = goalTasks.filter(t => t.completed);
      const incompleteTasks = goalTasks.filter(t => !t.completed);

      const recentCompleted = completedTasks
        .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())
        .slice(0, 10);

      const recentIncomplete = incompleteTasks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      let difficultyInstruction = '';
      let taskCountInstruction = '';
      let focusInstruction = '';

      if (analytics) {
        if (analytics.suggestedFocus === 'simplify') {
          difficultyInstruction = 'Create EASY tasks. User is struggling, needs quick wins to build momentum.';
          taskCountInstruction = 'Generate 2 tasks maximum.';
          focusInstruction = 'Focus on small, achievable steps that build confidence.';
        } else if (analytics.suggestedFocus === 'challenge') {
          difficultyInstruction = 'Create challenging tasks. User is doing great, ready for harder challenges.';
          taskCountInstruction = 'Generate 3-4 tasks.';
          focusInstruction = 'Push boundaries, introduce new challenges, deeper learning.';
        } else if (analytics.suggestedFocus === 'recover') {
          difficultyInstruction = 'Create easy to medium tasks. User performance is declining, need to recover.';
          taskCountInstruction = 'Generate 2-3 tasks.';
          focusInstruction = 'Revisit fundamentals, consolidate progress, rebuild momentum.';
        } else if (analytics.suggestedFocus === 'accelerate') {
          difficultyInstruction = 'Create medium to hard tasks. User is improving, accelerate progress.';
          taskCountInstruction = 'Generate 3 tasks.';
          focusInstruction = 'Build on recent successes, increase complexity gradually.';
        } else {
          difficultyInstruction = 'Create balanced mix of tasks. Maintain steady progress.';
          taskCountInstruction = 'Generate 2-3 tasks.';
          focusInstruction = 'Continue current trajectory with slight progression.';
        }
      }

      const completedContext = recentCompleted.length > 0
        ? `\n\nRECENTLY COMPLETED TASKS (build upon these):\n${recentCompleted.map((t, i) => 
            `${i + 1}. "${t.title}" (${t.difficulty}) - ${t.description}`
          ).join('\n')}`
        : '\n\nNo completed tasks yet - this is the beginning of the journey.';

      const incompleteContext = recentIncomplete.length > 0
        ? `\n\nUNCOMPLETED TASKS (consider why these failed):\n${recentIncomplete.map((t, i) => 
            `${i + 1}. "${t.title}" (${t.difficulty}) - possibly too hard or not engaging`
          ).join('\n')}`
        : '';

      const analyticsContext = analytics ? `
USER PERFORMANCE ANALYTICS:
- Overall completion rate: ${analytics.completionRate.toFixed(0)}%
- Recent 3-day performance: ${analytics.recentPerformance.last3Days.toFixed(0)}%
- Recent 7-day performance: ${analytics.recentPerformance.last7Days.toFixed(0)}%
- Performance trend: ${analytics.streakData.recentTrend}
- Current streak: ${analytics.streakData.currentStreak} days
- Easy task completion: ${analytics.completedByDifficulty.easy.rate.toFixed(0)}%
- Medium task completion: ${analytics.completedByDifficulty.medium.rate.toFixed(0)}%
- Hard task completion: ${analytics.completedByDifficulty.hard.rate.toFixed(0)}%
- Recommended approach: ${analytics.suggestedFocus}
` : '';

      const totalCompleted = completedTasks.length;
      const progressStage = totalCompleted < 5 ? 'beginning' 
        : totalCompleted < 15 ? 'early' 
        : totalCompleted < 30 ? 'middle' 
        : 'advanced';

      const prompt = `
You are an expert personal coach creating a SMART, ADAPTIVE daily plan.

GOAL: ${currentGoal.title}
DESCRIPTION: ${currentGoal.description}
CATEGORY: ${currentGoal.category}
MOTIVATION: ${currentGoal.motivation}
OBSTACLES: ${currentGoal.obstacles?.join(', ') || 'none specified'}

PROGRESS STAGE: ${progressStage} (${totalCompleted} tasks completed total)
${analyticsContext}
${completedContext}
${incompleteContext}

ADAPTIVE STRATEGY:
${difficultyInstruction}
${taskCountInstruction}
${focusInstruction}

CRITICAL RULES FOR TASK GENERATION:
1. Tasks MUST logically continue from completed tasks - don't repeat what's done
2. Each task should be a NEXT STEP, not a restart
3. If user completed "Learn 10 words", next should be "Practice those 10 words in sentences" or "Learn 10 NEW words"
4. Tasks must be SPECIFIC with exact numbers, names, details
5. Consider user's completion patterns - if they struggle with hard tasks, avoid them
6. Create tasks that FIT INTO 1 DAY of work
7. Each task should have MEASURABLE outcome
8. Include practical tips based on what works for this goal type

RESPONSE FORMAT (JSON only, no markdown):
{
  "tasks": [
    {
      "title": "Specific actionable title",
      "description": "Detailed description with exact steps, numbers, examples",
      "estimatedTime": 30,
      "difficulty": "easy|medium|hard",
      "priority": "high|medium|low",
      "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"],
      "subtasks": [
        {"title": "Specific subtask", "estimatedTime": 10}
      ],
      "reason": "Why this task is next logical step"
    }
  ]
}
`;

      console.log('[SmartGenerator] Sending request to AI');
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert personal coach and task planner. Create adaptive, progressive tasks based on user performance data. Always respond with valid JSON only, no markdown blocks.'
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      let jsonString = data.completion?.trim() || '';

      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const startIndex = jsonString.indexOf('{');
      const lastIndex = jsonString.lastIndexOf('}');

      if (startIndex !== -1 && lastIndex !== -1) {
        jsonString = jsonString.substring(startIndex, lastIndex + 1);
        const parsed = JSON.parse(jsonString);

        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          console.log('[SmartGenerator] Generated', parsed.tasks.length, 'tasks');
          setLastGeneratedDate(new Date().toDateString());
          
          // If callback provided, call it with first task and switch to background mode
          if (onFirstTaskReady && parsed.tasks.length > 0) {
            setIsGenerating(false);
            setIsGeneratingInBackground(true);
            onFirstTaskReady(parsed.tasks[0]);
          }
          
          return parsed.tasks;
        }
      }

      console.log('[SmartGenerator] Failed to parse response');
      return [];
    } catch (error) {
      console.error('[SmartGenerator] Error:', error);
      return [];
    } finally {
      setIsGenerating(false);
      setIsGeneratingInBackground(false);
    }
  }, [currentGoal, dailyTasks, analytics]);

  const shouldAutoGenerate = useCallback((): boolean => {
    if (!currentGoal || !dailyTasks) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTasks = dailyTasks.filter(task => {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      return task.goalId === currentGoal.id && taskDate.getTime() === today.getTime();
    });

    if (todayTasks.length > 0) {
      console.log('[SmartGenerator] Today already has', todayTasks.length, 'tasks');
      return false;
    }

    if (lastGeneratedDate === today.toDateString()) {
      console.log('[SmartGenerator] Already generated today');
      return false;
    }

    console.log('[SmartGenerator] Should auto-generate: no tasks for today');
    return true;
  }, [currentGoal, dailyTasks, lastGeneratedDate]);

  const getProgressInsight = useCallback((): string => {
    if (!analytics) return 'Start your journey today!';

    const { completionRate, streakData, suggestedFocus, recentPerformance } = analytics;

    if (suggestedFocus === 'simplify') {
      return 'Let\'s take smaller steps. Building consistent habits is more important than speed.';
    }
    if (suggestedFocus === 'challenge') {
      return 'You\'re crushing it! Time to level up and push your boundaries.';
    }
    if (suggestedFocus === 'recover') {
      return 'Let\'s get back on track. Focus on easy wins to rebuild momentum.';
    }
    if (suggestedFocus === 'accelerate') {
      return 'Great progress! Your improving trend shows you\'re ready for more.';
    }

    if (streakData.currentStreak >= 7) {
      return `Amazing ${streakData.currentStreak}-day streak! Keep the momentum going.`;
    }
    if (completionRate > 70) {
      return 'Solid progress! You\'re building great habits.';
    }
    if (recentPerformance.last3Days > recentPerformance.last7Days) {
      return 'You\'re picking up steam! Recent performance is improving.';
    }

    return 'Every task completed brings you closer to your goal.';
  }, [analytics]);

  return {
    analytics,
    isGenerating,
    isGeneratingInBackground,
    generateSmartTasks,
    shouldAutoGenerate,
    getProgressInsight,
    lastGeneratedDate,
  };
}
