import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgress } from '@/hooks/use-progress';
import { getUnlockedRewards, type Reward } from '@/constants/rewards';

const SEEN_REWARDS_KEY = '@seen_unlocked_rewards';

export const [RewardUnlockProvider, useRewardUnlock] = createContextHook(() => {
  const progress = useProgress();
  const [pendingReward, setPendingReward] = useState<Reward | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const queueRef = useRef<Reward[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_REWARDS_KEY).then(raw => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          seenIdsRef.current = new Set(ids);
        } catch {
          seenIdsRef.current = new Set();
        }
      }
      initializedRef.current = true;
    }).catch(() => {
      initializedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (!progress?.isReady) return;

    const streak = progress.currentStreak ?? 0;
    const tasks = progress.totalCompletedTasks ?? 0;
    const focus = progress.focusTimeMinutes ?? 0;

    const rewards = getUnlockedRewards(streak, tasks, focus);
    const newlyUnlocked = rewards.filter(r => r.unlocked && !seenIdsRef.current.has(r.id));

    if (newlyUnlocked.length > 0) {
      console.log('[RewardUnlock] New rewards detected:', newlyUnlocked.map(r => r.label));

      const allSeenIds = [...seenIdsRef.current, ...newlyUnlocked.map(r => r.id)];
      seenIdsRef.current = new Set(allSeenIds);
      AsyncStorage.setItem(SEEN_REWARDS_KEY, JSON.stringify(allSeenIds)).catch(() => {});

      if (!modalVisible && !pendingReward) {
        setPendingReward(newlyUnlocked[0]);
        setModalVisible(true);
        queueRef.current = newlyUnlocked.slice(1);
      } else {
        queueRef.current = [...queueRef.current, ...newlyUnlocked];
      }
    }
  }, [progress?.isReady, progress?.currentStreak, progress?.totalCompletedTasks, progress?.focusTimeMinutes, modalVisible, pendingReward]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setPendingReward(null);

    setTimeout(() => {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setPendingReward(next);
        setModalVisible(true);
      }
    }, 500);
  }, []);

  return {
    pendingReward,
    modalVisible,
    closeModal,
  };
});
