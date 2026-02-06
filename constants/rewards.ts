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
  { id: '1', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956832/0126_9_xmrb6b.mp4', label: 'First Step', unlocked: true, color: '#FF6B6B', achievement: 'Complete your first task', rarity: 'Common', ownedBy: '95%' },
  { id: '2', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769957827/0126_10_ckdbct.mp4', label: 'Rising Star', unlocked: true, color: '#60A5FA', achievement: 'Complete 5 tasks', rarity: 'Common', ownedBy: '78%' },
  { id: '3', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951742/0126_4_l4xx78.mp4', label: 'Week Goal', unlocked: true, color: '#A78BFA', achievement: 'Complete 7 days', rarity: 'Rare', ownedBy: '45%' },
  { id: '4', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951786/0126_5_u9xcey.mp4', label: '7 Day Streak', unlocked: true, color: '#34D399', achievement: '7 day streak', rarity: 'Rare', ownedBy: '32%' },
  { id: '5', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769963787/0126_13_hoa56y.mp4', label: 'Focus Master', unlocked: true, color: '#F59E0B', achievement: '10 hours focused', rarity: 'Epic', ownedBy: '18%' },
  { id: '6', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769964203/0126_14_uatb5h.mp4', label: '14 Day Streak', unlocked: true, color: '#EC4899', achievement: '14 day streak', rarity: 'Legendary', ownedBy: '8%' },
  { id: '7', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769964305/0126_15_qhwl6p.mp4', label: 'Champion', unlocked: true, color: '#22D3EE', achievement: '30 day streak', rarity: 'Mythic', ownedBy: '3%' },
  { id: '8', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769970570/0126_17_bh50ax.mp4', label: 'Deep Focus', unlocked: true, color: '#8B5CF6', achievement: '50 hours focused', rarity: 'Mythic', ownedBy: '2.5%' },
  { id: '9', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769970766/0126_18_i9c43s.mp4', label: '30 Day Streak', unlocked: true, color: '#F472B6', achievement: '30 consecutive days', rarity: 'Legendary', ownedBy: '2%' },
  { id: '10', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769970927/0126_20_bdhdiu.mp4', label: 'Elite', unlocked: true, color: '#10B981', achievement: '100 tasks completed', rarity: 'Mythic', ownedBy: '1.5%' },
  { id: '11', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769971061/0126_21_eigchr.mp4', label: 'Legend', unlocked: true, color: '#FBBF24', achievement: '60 day streak', rarity: 'Legendary', ownedBy: '1%' },
  { id: '12', video: 'https://res.cloudinary.com/dbrrfb8tf/video/upload/v1770390547/0126_23_wil1xe.mp4', label: 'Transcendent', unlocked: true, color: '#06B6D4', achievement: '90 day streak', rarity: 'Mythic', ownedBy: '0.8%' },
  { id: '13', video: 'https://res.cloudinary.com/dbrrfb8tf/video/upload/v1770390569/0126_22_pcgir8.mp4', label: 'Immortal', unlocked: true, color: '#D946EF', achievement: '100 hours focused', rarity: 'Mythic', ownedBy: '0.5%' },
];

export function getLastUnlockedReward(): Reward {
  const unlockedRewards = REWARDS.filter(r => r.unlocked);
  return unlockedRewards[unlockedRewards.length - 1] || REWARDS[0];
}
