export interface FocusSession {
  id: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  distractionCount: number;
  isActive: boolean;
}

export interface FocusShieldSettings {
  isEnabled: boolean;
  reminderInterval: number; // in minutes (5, 10, 15, 30)
  activeHours: {
    start: number; // hour 0-23
    end: number;
  };
  blockedApps: string[]; // 'instagram', 'tiktok', 'youtube'
  motivationalMessages: boolean;
  strictMode: boolean; // prevents leaving app during focus session
}

export interface FocusStats {
  totalFocusTime: number; // in minutes
  totalSessions: number;
  distractionsFlagged: number;
  longestStreak: number; // days
  currentStreak: number;
  todayFocusTime: number;
  weeklyFocusTime: number;
}

export interface DistractionLog {
  id: string;
  timestamp: string;
  app: string;
  skipped: boolean; // true if user chose to continue to the app
}
