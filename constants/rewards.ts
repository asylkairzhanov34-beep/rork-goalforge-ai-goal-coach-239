export const LOCKED_ORB_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769447795/0125_1__4_mtioi7.mp4';
export const GRAY_ORB_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769449334/0125_1__5_xxgjfb.mp4';

export type RewardCategory = 'streak' | 'tasks' | 'focus';

export interface Reward {
  id: string;
  video: string;
  label: string;
  unlocked: boolean;
  color: string;
  achievement: string;
  rarity: string;
  ownedBy: string;
  category: RewardCategory;
  requirement: number;
  requirementLabel: string;
}

export const REWARDS: Reward[] = [
  // STREAK REWARDS
  { id: 's1', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956832/0126_9_xmrb6b.mp4', label: 'Ignited', unlocked: false, color: '#FF6B6B', achievement: 'First step taken', rarity: 'Common', ownedBy: '95%', category: 'streak', requirement: 0, requirementLabel: 'Day 1' },
  { id: 's2', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769957827/0126_10_ckdbct.mp4', label: 'Invested', unlocked: false, color: '#60A5FA', achievement: '3 day streak', rarity: 'Common', ownedBy: '78%', category: 'streak', requirement: 3, requirementLabel: '3 days' },
  { id: 's3', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951742/0126_4_l4xx78.mp4', label: 'Steadfast', unlocked: false, color: '#A78BFA', achievement: '7 day streak', rarity: 'Rare', ownedBy: '45%', category: 'streak', requirement: 7, requirementLabel: '7 days' },
  { id: 's4', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951786/0126_5_u9xcey.mp4', label: 'Radiant', unlocked: false, color: '#34D399', achievement: '14 day streak', rarity: 'Rare', ownedBy: '32%', category: 'streak', requirement: 14, requirementLabel: '14 days' },
  { id: 's5', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769964203/0126_14_uatb5h.mp4', label: 'Prismatic', unlocked: false, color: '#EC4899', achievement: '30 day streak', rarity: 'Epic', ownedBy: '15%', category: 'streak', requirement: 30, requirementLabel: '30 days' },
  { id: 's6', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769964305/0126_15_qhwl6p.mp4', label: 'Legendary', unlocked: false, color: '#22D3EE', achievement: '60 day streak', rarity: 'Legendary', ownedBy: '5%', category: 'streak', requirement: 60, requirementLabel: '60 days' },
  { id: 's7', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769970766/0126_18_i9c43s.mp4', label: 'Consistent', unlocked: false, color: '#F472B6', achievement: '90 day streak', rarity: 'Mythic', ownedBy: '2%', category: 'streak', requirement: 90, requirementLabel: '90 days' },
  { id: 's8', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769971061/0126_21_eigchr.mp4', label: 'Eternal', unlocked: false, color: '#FBBF24', achievement: '180 day streak', rarity: 'Mythic', ownedBy: '0.5%', category: 'streak', requirement: 180, requirementLabel: '180 days' },

  // TASKS REWARDS
  { id: 't1', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769963787/0126_13_hoa56y.mp4', label: 'Doer', unlocked: false, color: '#F59E0B', achievement: '5 tasks completed', rarity: 'Common', ownedBy: '85%', category: 'tasks', requirement: 5, requirementLabel: '5 tasks' },
  { id: 't2', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769970570/0126_17_bh50ax.mp4', label: 'Achiever', unlocked: false, color: '#8B5CF6', achievement: '25 tasks completed', rarity: 'Rare', ownedBy: '40%', category: 'tasks', requirement: 25, requirementLabel: '25 tasks' },
  { id: 't3', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769970927/0126_20_bdhdiu.mp4', label: 'Unstoppable', unlocked: false, color: '#10B981', achievement: '50 tasks completed', rarity: 'Epic', ownedBy: '20%', category: 'tasks', requirement: 50, requirementLabel: '50 tasks' },
  { id: 't4', video: 'https://res.cloudinary.com/dbrrfb8tf/video/upload/v1770390547/0126_23_wil1xe.mp4', label: 'Titan', unlocked: false, color: '#06B6D4', achievement: '100 tasks completed', rarity: 'Legendary', ownedBy: '8%', category: 'tasks', requirement: 100, requirementLabel: '100 tasks' },
  { id: 't5', video: 'https://res.cloudinary.com/dbrrfb8tf/video/upload/v1770390569/0126_22_pcgir8.mp4', label: 'Conqueror', unlocked: false, color: '#D946EF', achievement: '250 tasks completed', rarity: 'Mythic', ownedBy: '2%', category: 'tasks', requirement: 250, requirementLabel: '250 tasks' },

  // FOCUS TIME REWARDS (requirement in minutes)
  { id: 'f1', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956429/0126_6_eud89t.mp4', label: 'Focused', unlocked: false, color: '#FB923C', achievement: '1 hour focused', rarity: 'Common', ownedBy: '80%', category: 'focus', requirement: 60, requirementLabel: '1 hour' },
  { id: 'f2', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956418/0126_8_xka62k.mp4', label: 'Deep Mind', unlocked: false, color: '#38BDF8', achievement: '5 hours focused', rarity: 'Rare', ownedBy: '35%', category: 'focus', requirement: 300, requirementLabel: '5 hours' },
  { id: 'f3', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956832/0126_9_xmrb6b.mp4', label: 'Zen Master', unlocked: false, color: '#4ADE80', achievement: '25 hours focused', rarity: 'Epic', ownedBy: '12%', category: 'focus', requirement: 1500, requirementLabel: '25 hours' },
  { id: 'f4', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769957827/0126_10_ckdbct.mp4', label: 'Transcendent', unlocked: false, color: '#C084FC', achievement: '50 hours focused', rarity: 'Legendary', ownedBy: '5%', category: 'focus', requirement: 3000, requirementLabel: '50 hours' },
  { id: 'f5', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951742/0126_4_l4xx78.mp4', label: 'Enlightened', unlocked: false, color: '#E879F9', achievement: '100 hours focused', rarity: 'Mythic', ownedBy: '1%', category: 'focus', requirement: 6000, requirementLabel: '100 hours' },
];

export function getUnlockedRewards(streak: number, tasks: number, focusMinutes: number): Reward[] {
  return REWARDS.map(r => {
    let unlocked = false;
    if (r.category === 'streak') unlocked = streak >= r.requirement;
    else if (r.category === 'tasks') unlocked = tasks >= r.requirement;
    else if (r.category === 'focus') unlocked = focusMinutes >= r.requirement;
    return { ...r, unlocked };
  });
}

export function getRewardsByCategory(rewards: Reward[], category: RewardCategory): Reward[] {
  return rewards.filter(r => r.category === category);
}

export function getLastUnlockedReward(): Reward {
  return REWARDS[0];
}
