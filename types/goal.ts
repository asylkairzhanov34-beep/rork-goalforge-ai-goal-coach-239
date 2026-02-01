export interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string; // Теперь опциональная - для свободного плана
  category: string;
  motivation: string;
  obstacles: string[];
  resources: string[];
  createdAt: string;
  isActive: boolean;
  completedTasksCount: number;
  totalTasksCount: number;
  planType: 'free' | 'timed'; // Новое поле для типа плана
}

export interface TaskFeedback {
  difficulties: string;
  personalContext: string;
  suggestedChanges: string;
  createdAt: string;
}

export interface DailyTask {
  id: string;
  goalId: string;
  day: number;
  date: string;
  title: string;
  description: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completedAt?: string;
  tips: string[];
  subtasks?: SubTask[];
  adaptedFromPrevious?: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  feedback?: TaskFeedback;
  isChallengeTask?: boolean;
  challengeId?: string;
  challengeName?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedTime: number;
}

export interface WeeklyPlan {
  id: string;
  goalId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  dailyTasks: { [dayOfWeek: string]: DailyTask[] };
  weeklyGoal: string;
  adaptations: PlanAdaptation[];
  completionRate: number;
}

export interface PlanAdaptation {
  id: string;
  date: string;
  reason: 'missed_task' | 'completed_early' | 'difficulty_adjustment' | 'time_constraint';
  originalTaskId: string;
  adaptedTaskId: string;
  description: string;
}

export interface UserProfile {
  name: string;
  email?: string;
  onboardingCompleted: boolean;
  currentGoalId?: string;
  totalGoalsCompleted: number;
  currentStreak: number;
  bestStreak: number;
  lastStreakDate?: string;
  joinedAt: string;
  preferences: {
    reminderTime?: string;
    motivationalQuotes: boolean;
  };
}

export interface OnboardingAnswer {
  question: string;
  answer: string;
}

export interface PomodoroSession {
  id: string;
  goalId: string;
  taskId?: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  type: 'work' | 'shortBreak' | 'longBreak';
  completed: boolean;
  interrupted?: boolean;
}

export interface PomodoroStats {
  totalSessions: number;
  totalWorkTime: number; // in minutes
  todaySessions: number;
  todayWorkTime: number;
  weekSessions: number;
  weekWorkTime: number;
  averageSessionsPerDay: number;
}