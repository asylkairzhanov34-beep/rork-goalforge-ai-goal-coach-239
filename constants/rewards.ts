export const GRAY_ORB_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769449334/0125_1__5_xxgjfb.mp4';

export interface Reward {
  id: string;
  video: string;
  label: string;
  unlocked: boolean;
  color: string;
  achievement: string;
  rarity: string;
  ownedBy: string;
}

export const REWARDS: Reward[] = [
  { id: '1', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769449245/0126_1_nrl3iu.mp4', label: 'First Step', unlocked: true, color: '#FF6B6B', achievement: 'Complete your first task', rarity: 'Common', ownedBy: '95%' },
  { id: '2', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769449243/0126_2_kabbul.mp4', label: 'Day 3 Reward', unlocked: true, color: '#4FACFE', achievement: '3 days of consistency', rarity: 'Uncommon', ownedBy: '78%' },
  { id: '3', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951742/0126_4_l4xx78.mp4', label: 'Week Goal', unlocked: true, color: '#A78BFA', achievement: 'Complete 7 days', rarity: 'Rare', ownedBy: '45%' },
  { id: '4', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951786/0126_5_u9xcey.mp4', label: '7 Day Streak', unlocked: true, color: '#34D399', achievement: '7 day streak', rarity: 'Rare', ownedBy: '32%' },
  { id: '5', video: GRAY_ORB_VIDEO, label: 'Focus Master', unlocked: false, color: '#F59E0B', achievement: '10 hours focused', rarity: 'Epic', ownedBy: '18%' },
  { id: '6', video: GRAY_ORB_VIDEO, label: '14 Day Streak', unlocked: false, color: '#EC4899', achievement: '14 day streak', rarity: 'Legendary', ownedBy: '8%' },
];

export function getLastUnlockedReward(): Reward {
  const unlockedRewards = REWARDS.filter(r => r.unlocked);
  return unlockedRewards[unlockedRewards.length - 1] || REWARDS[0];
}
