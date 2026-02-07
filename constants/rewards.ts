export const LOCKED_ORB_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769447795/0125_1__4_mtioi7.mp4';
export const GRAY_ORB_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769449334/0125_1__5_xxgjfb.mp4';

export interface RewardRequirement {
  streakDays: number;
  completedTasks: number;
  focusMinutes: number;
}

export interface Reward {
  id: string;
  video: string;
  label: string;
  unlocked: boolean;
  color: string;
  achievement: string;
  rarity: string;
  ownedBy: string;
  requirement: RewardRequirement;
  requirementLabel: string;
  unlockHint: string;
  unlockedAt?: string;
}

export const REWARDS: Reward[] = [
  { 
    id: 'r1', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956832/0126_9_xmrb6b.mp4', 
    label: 'Ignited', 
    unlocked: false, 
    color: '#FF6B6B', 
    achievement: 'First step taken', 
    rarity: 'Common', 
    ownedBy: '95%', 
    requirement: { streakDays: 0, completedTasks: 1, focusMinutes: 0 },
    requirementLabel: '1 task',
    unlockHint: 'Complete your first task'
  },
  { 
    id: 'r2', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769957827/0126_10_ckdbct.mp4', 
    label: 'Awakened', 
    unlocked: false, 
    color: '#60A5FA', 
    achievement: 'Building momentum', 
    rarity: 'Common', 
    ownedBy: '82%', 
    requirement: { streakDays: 2, completedTasks: 3, focusMinutes: 15 },
    requirementLabel: '2 days • 3 tasks • 15min',
    unlockHint: '2 day streak + 3 tasks + 15min focus'
  },
  { 
    id: 'r3', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951742/0126_4_l4xx78.mp4', 
    label: 'Steadfast', 
    unlocked: false, 
    color: '#A78BFA', 
    achievement: 'Finding rhythm', 
    rarity: 'Common', 
    ownedBy: '68%', 
    requirement: { streakDays: 4, completedTasks: 8, focusMinutes: 45 },
    requirementLabel: '4 days • 8 tasks • 45min',
    unlockHint: '4 day streak + 8 tasks + 45min focus'
  },
  { 
    id: 'r4', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951786/0126_5_u9xcey.mp4', 
    label: 'Radiant', 
    unlocked: false, 
    color: '#34D399', 
    achievement: 'One week strong', 
    rarity: 'Rare', 
    ownedBy: '52%', 
    requirement: { streakDays: 7, completedTasks: 15, focusMinutes: 90 },
    requirementLabel: '7 days • 15 tasks • 1.5h',
    unlockHint: '7 day streak + 15 tasks + 1.5h focus'
  },
  { 
    id: 'r5', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769964203/0126_14_uatb5h.mp4', 
    label: 'Blazing', 
    unlocked: false, 
    color: '#F97316', 
    achievement: 'Ten days dedicated', 
    rarity: 'Rare', 
    ownedBy: '38%', 
    requirement: { streakDays: 10, completedTasks: 25, focusMinutes: 150 },
    requirementLabel: '10 days • 25 tasks • 2.5h',
    unlockHint: '10 day streak + 25 tasks + 2.5h focus'
  },
  { 
    id: 'r6', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769964305/0126_15_qhwl6p.mp4', 
    label: 'Prismatic', 
    unlocked: false, 
    color: '#EC4899', 
    achievement: 'Two weeks committed', 
    rarity: 'Epic', 
    ownedBy: '28%', 
    requirement: { streakDays: 14, completedTasks: 40, focusMinutes: 240 },
    requirementLabel: '14 days • 40 tasks • 4h',
    unlockHint: '14 day streak + 40 tasks + 4h focus'
  },
  { 
    id: 'r7', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769970766/0126_18_i9c43s.mp4', 
    label: 'Celestial', 
    unlocked: false, 
    color: '#22D3EE', 
    achievement: 'Three weeks mastery', 
    rarity: 'Epic', 
    ownedBy: '18%', 
    requirement: { streakDays: 21, completedTasks: 60, focusMinutes: 360 },
    requirementLabel: '21 days • 60 tasks • 6h',
    unlockHint: '21 day streak + 60 tasks + 6h focus'
  },
  { 
    id: 'r8', 
    video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769971061/0126_21_eigchr.mp4', 
    label: 'Legendary', 
    unlocked: false, 
    color: '#FBBF24', 
    achievement: 'One month champion', 
    rarity: 'Legendary', 
    ownedBy: '12%', 
    requirement: { streakDays: 30, completedTasks: 80, focusMinutes: 480 },
    requirementLabel: '30 days • 80 tasks • 8h',
    unlockHint: '30 day streak + 80 tasks + 8h focus'
  },
  { 
    id: 'r9', 
    video: GRAY_ORB_VIDEO, 
    label: 'Mythic', 
    unlocked: false, 
    color: '#F472B6', 
    achievement: 'Six weeks unstoppable', 
    rarity: 'Mythic', 
    ownedBy: '6%', 
    requirement: { streakDays: 45, completedTasks: 120, focusMinutes: 720 },
    requirementLabel: '45 days • 120 tasks • 12h',
    unlockHint: '45 day streak + 120 tasks + 12h focus'
  },
  { 
    id: 'r10', 
    video: 'https://res.cloudinary.com/dbrrfb8tf/video/upload/v1770390569/0126_22_pcgir8.mp4', 
    label: 'Transcendent', 
    unlocked: false, 
    color: '#8B5CF6', 
    achievement: 'Two months elite', 
    rarity: 'Mythic', 
    ownedBy: '3%', 
    requirement: { streakDays: 60, completedTasks: 180, focusMinutes: 1080 },
    requirementLabel: '60 days • 180 tasks • 18h',
    unlockHint: '60 day streak + 180 tasks + 18h focus'
  },
  { 
    id: 'r11', 
    video: 'https://res.cloudinary.com/dbrrfb8tf/video/upload/v1770390547/0126_23_wil1xe.mp4', 
    label: 'Eternal', 
    unlocked: false, 
    color: '#14B8A6', 
    achievement: 'Three months eternal', 
    rarity: 'Eternal', 
    ownedBy: '1%', 
    requirement: { streakDays: 90, completedTasks: 270, focusMinutes: 1800 },
    requirementLabel: '90 days • 270 tasks • 30h',
    unlockHint: '90 day streak + 270 tasks + 30h focus'
  },
];

export interface RewardProgress {
  streakProgress: number;
  tasksProgress: number;
  focusProgress: number;
  overallProgress: number;
  remaining: {
    streakDays: number;
    completedTasks: number;
    focusMinutes: number;
  };
}

export function getRewardProgress(
  reward: Reward,
  currentStreak: number,
  completedTasks: number,
  focusMinutes: number
): RewardProgress {
  const req = reward.requirement;
  
  const streakProgress = req.streakDays > 0 ? Math.min(100, (currentStreak / req.streakDays) * 100) : 100;
  const tasksProgress = req.completedTasks > 0 ? Math.min(100, (completedTasks / req.completedTasks) * 100) : 100;
  const focusProgress = req.focusMinutes > 0 ? Math.min(100, (focusMinutes / req.focusMinutes) * 100) : 100;
  
  const overallProgress = (streakProgress + tasksProgress + focusProgress) / 3;
  
  return {
    streakProgress,
    tasksProgress,
    focusProgress,
    overallProgress,
    remaining: {
      streakDays: Math.max(0, req.streakDays - currentStreak),
      completedTasks: Math.max(0, req.completedTasks - completedTasks),
      focusMinutes: Math.max(0, req.focusMinutes - focusMinutes),
    }
  };
}

export function isRewardUnlocked(
  reward: Reward,
  currentStreak: number,
  completedTasks: number,
  focusMinutes: number
): boolean {
  const req = reward.requirement;
  return (
    currentStreak >= req.streakDays &&
    completedTasks >= req.completedTasks &&
    focusMinutes >= req.focusMinutes
  );
}

export function getUnlockedRewards(
  streak: number, 
  tasks: number, 
  focusMinutes: number, 
  isDeveloper: boolean = false,
  unlockedDates?: Record<string, string>
): Reward[] {
  return REWARDS.map(r => {
    if (isDeveloper) {
      return { ...r, unlocked: true, unlockedAt: unlockedDates?.[r.id] };
    }
    
    const unlocked = isRewardUnlocked(r, streak, tasks, focusMinutes);
    return { ...r, unlocked, unlockedAt: unlocked ? unlockedDates?.[r.id] : undefined };
  });
}

export function getNextLockedReward(rewards: Reward[]): Reward | null {
  return rewards.find(r => !r.unlocked) || null;
}

export function formatFocusTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function getProgressText(
  reward: Reward,
  currentStreak: number,
  completedTasks: number,
  focusMinutes: number
): string {
  const req = reward.requirement;
  const parts: string[] = [];
  
  if (req.streakDays > 0 && currentStreak < req.streakDays) {
    parts.push(`${req.streakDays - currentStreak} more days`);
  }
  if (req.completedTasks > 0 && completedTasks < req.completedTasks) {
    parts.push(`${req.completedTasks - completedTasks} more tasks`);
  }
  if (req.focusMinutes > 0 && focusMinutes < req.focusMinutes) {
    const remaining = req.focusMinutes - focusMinutes;
    parts.push(`${formatFocusTime(remaining)} more focus`);
  }
  
  if (parts.length === 0) return 'Ready to unlock!';
  return parts.join(' • ');
}

export function getLastUnlockedReward(): Reward {
  return REWARDS[0];
}
