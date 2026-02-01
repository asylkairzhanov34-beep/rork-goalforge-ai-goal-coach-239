export interface ManifestationSession {
  id: string;
  goalId: string;
  type: 'affirmation' | 'gratitude';
  phrases: string[];
  duration: number; // in seconds
  completedAt: Date;
  moodBefore?: number; // 1-5 scale
  moodAfter?: number; // 1-5 scale
  reflection?: string;
}

export interface ManifestationPhrase {
  id: string;
  text: string;
  type: 'affirmation' | 'gratitude';
  category: string;
}

export interface ManifestationSettings {
  sessionDuration: number; // in minutes
  enableVoiceRecording: boolean;
  enableHapticFeedback: boolean;
  reminderTime?: string; // HH:MM format
  enableMorningReminder: boolean;
  enableEveningReminder: boolean;
}

export interface ManifestationStats {
  totalSessions: number;
  totalTime: number; // in seconds
  averageMoodImprovement: number;
  currentStreak: number;
  bestStreak: number;
  weekSessions: number;
  monthSessions: number;
}