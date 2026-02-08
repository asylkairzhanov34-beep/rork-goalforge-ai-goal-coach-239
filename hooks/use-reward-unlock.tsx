import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgress } from '@/hooks/use-progress';
import { useAuth } from '@/hooks/use-auth-store';
import { isRewardUnlocked, REWARDS, type Reward } from '@/constants/rewards';

const SEEN_REWARDS_KEY = '@seen_unlocked_rewards';
const OFFER_SEEN_KEY = '@subscription_offer_seen';
const CHECK_DELAY_MS = 2500;

export const [RewardUnlockProvider, useRewardUnlock] = createContextHook(() => {
  const progress = useProgress();
  const { user } = useAuth();
  const isDeveloper = user?.email === 'developer@test.local';
  const [pendingReward, setPendingReward] = useState<Reward | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const queueRef = useRef<Reward[]>([]);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SEEN_REWARDS_KEY),
      AsyncStorage.getItem(OFFER_SEEN_KEY),
    ]).then(([raw, offerFlag]) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          seenIdsRef.current = new Set(ids);
        } catch {
          seenIdsRef.current = new Set();
        }
      }
      initializedRef.current = true;
      console.log('[RewardUnlock] Initialized, seenIds:', seenIdsRef.current.size);

      if (offerFlag === 'true') {
        setReady(true);
      } else {
        delayTimerRef.current = setTimeout(() => {
          console.log('[RewardUnlock] Auto-ready after delay');
          setReady(true);
        }, CHECK_DELAY_MS);
      }
    }).catch(() => {
      initializedRef.current = true;
      delayTimerRef.current = setTimeout(() => setReady(true), CHECK_DELAY_MS);
    });

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, []);

  const markOfferSeen = useCallback(() => {
    console.log('[RewardUnlock] Marking offer as seen');
    AsyncStorage.setItem(OFFER_SEEN_KEY, 'true').catch(() => {});
    if (!ready) {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      setTimeout(() => setReady(true), 800);
    }
  }, [ready]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (!progress?.isReady) return;
    if (!ready) return;

    const streak = progress.currentStreak ?? 0;
    const tasks = progress.totalCompletedTasks ?? 0;
    const focus = progress.focusTimeMinutes ?? 0;
    const todayCompleted = progress.todayCompletedTasks ?? 0;
    const todayTotal = progress.todayTotalTasks ?? 0;

    const allTodayTasksDone = todayTotal > 0 && todayCompleted >= todayTotal;

    console.log('[RewardUnlock] Checking rewards: streak=', streak, 'tasks=', tasks, 'focus=', focus, 'todayDone=', todayCompleted, '/', todayTotal);

    if (!allTodayTasksDone && !isDeveloper) {
      console.log('[RewardUnlock] Not all daily tasks completed, skipping reward check');
      return;
    }

    const newlyUnlocked: Reward[] = [];
    for (let i = 0; i < REWARDS.length; i++) {
      const reward = REWARDS[i];
      const alreadySeen = seenIdsRef.current.has(reward.id);

      if (alreadySeen) continue;

      if (i > 0) {
        const prevReward = REWARDS[i - 1];
        const prevSeen = seenIdsRef.current.has(prevReward.id);
        const prevQualified = isRewardUnlocked(prevReward, streak, tasks, focus);
        if (!prevSeen && !prevQualified) {
          console.log('[RewardUnlock] Sequential block: cannot unlock', reward.label, 'because', prevReward.label, 'not yet earned');
          break;
        }
      }

      const qualified = isDeveloper || isRewardUnlocked(reward, streak, tasks, focus);
      if (qualified) {
        newlyUnlocked.push({ ...reward, unlocked: true });
      } else {
        break;
      }
    }

    if (newlyUnlocked.length > 0) {
      console.log('[RewardUnlock] New rewards detected (sequential):', newlyUnlocked.map(r => r.label));

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
  }, [progress?.isReady, progress?.currentStreak, progress?.totalCompletedTasks, progress?.focusTimeMinutes, progress?.todayCompletedTasks, progress?.todayTotalTasks, modalVisible, pendingReward, ready, isDeveloper]);

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

  const triggerTestReward = useCallback((rewardIndex?: number) => {
    if (!isDeveloper) return;
    
    let idx: number;
    if (rewardIndex !== undefined) {
      idx = rewardIndex;
    } else {
      const unshownRewards = REWARDS.filter(r => !seenIdsRef.current.has(r.id));
      if (unshownRewards.length > 0) {
        const nextReward = unshownRewards[0];
        idx = REWARDS.findIndex(r => r.id === nextReward.id);
      } else {
        seenIdsRef.current = new Set();
        AsyncStorage.setItem(SEEN_REWARDS_KEY, JSON.stringify([])).catch(() => {});
        idx = 0;
      }
    }
    
    const reward = { ...REWARDS[idx], unlocked: true };
    console.log('[RewardUnlock] DEV: Triggering test reward (sequential):', reward.label, 'index:', idx);
    
    seenIdsRef.current.add(reward.id);
    AsyncStorage.setItem(SEEN_REWARDS_KEY, JSON.stringify([...seenIdsRef.current])).catch(() => {});
    
    setPendingReward(reward);
    setModalVisible(true);
  }, [isDeveloper]);

  return {
    pendingReward,
    modalVisible,
    closeModal,
    markOfferSeen,
    triggerTestReward,
    isDeveloper,
  };
});
