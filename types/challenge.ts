export type ChallengeCategory = 
  | 'fitness' 
  | 'productivity' 
  | 'digital_detox' 
  | 'learning' 
  | 'mental_health';

export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ChallengeStatus = 'not_started' | 'active' | 'completed' | 'failed';

export interface ChallengeRule {
  id: string;
  text: string;
  isStrict: boolean;
}

export interface ChallengeBenefit {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface ChallengeDayExample {
  time: string;
  activity: string;
  duration: string;
}

export interface ChallengeTemplate {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: ChallengeCategory;
  durationDays: number;
  difficulty: ChallengeDifficulty;
  icon: string;
  color: string;
  image?: string;
  rating: number;
  participantsCount: number;
  isPopular: boolean;
  isNew: boolean;
  rules: ChallengeRule[];
  benefits: ChallengeBenefit[];
  dailyTasks: string[];
  exampleDay: ChallengeDayExample[];
  failOnMiss: boolean;
  tags: string[];
}

export interface ChallengeCustomization {
  fitnessLevel: ChallengeDifficulty;
  availableTimeMinutes: number;
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  healthRestrictions: string[];
  goals: string[];
  age?: string;
  currentFitnessDescription?: string;
  motivation?: string;
  wakeUpTime?: string;
  sleepTime?: string;
  workSchedule?: 'flexible' | 'fixed_morning' | 'fixed_afternoon' | 'shift_work';
  dietPreference?: string;
  previousChallengeExperience?: boolean;
}

export interface ChallengeTask {
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
  completedAt?: string;
  order: number;
}

export interface ChallengeDay {
  day: number;
  date: string;
  tasks: ChallengeTask[];
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface ActiveChallenge {
  id: string;
  templateId: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  currentDay: number;
  totalDays: number;
  status: ChallengeStatus;
  streak: number;
  bestStreak: number;
  customization: ChallengeCustomization;
  days: ChallengeDay[];
  failedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ChallengeStats {
  totalChallengesStarted: number;
  totalChallengesCompleted: number;
  totalChallengeFailed: number;
  currentStreak: number;
  bestStreak: number;
  totalDaysCompleted: number;
  favoriteCategory?: ChallengeCategory;
}
